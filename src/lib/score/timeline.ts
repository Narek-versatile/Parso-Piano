/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NoteEvent, ScoreModel } from './model';
import { beatsToSeconds, measureAt } from './model';

export interface TimelineStep {
  index: number;
  /** Playback time in seconds (at the score's own tempo) */
  seconds: number;
  /** Source position in quarter-note beats (repeats revisit positions) */
  sourceBeats: number;
  /** Model notes starting at this step */
  startingNoteIds: string[];
  /** All model notes sounding during this step (for keyboard highlights) */
  activeNoteIds: string[];
  /** Pitches to trigger at this step (tied continuations excluded) */
  notesToPlay: { name: string; midi: number; durationSeconds: number }[];
}

export interface Timeline {
  steps: TimelineStep[];
  totalSeconds: number;
}

/**
 * Walk OSMD's music-part iterator (which follows repeat signs) and build the
 * playback timeline. Each step corresponds to exactly one osmd.cursor.next().
 */
export function buildTimeline(
  osmd: any,
  model: ScoreModel,
  sourceToNote: Map<any, NoteEvent>,
): Timeline {
  const steps: TimelineStep[] = [];
  let iterator: any;
  try {
    iterator = osmd?.Sheet?.MusicPartManager?.getIterator?.();
  } catch {
    iterator = undefined;
  }
  if (!iterator) return buildLinearTimeline(model);

  const secondsBetween = (a: number, b: number) =>
    beatsToSeconds(model.tempoMap, b) - beatsToSeconds(model.tempoMap, a);

  let seconds = 0;
  let prevBeats: number | undefined;
  let active: { id: string; endBeats: number }[] = [];
  let guard = 0;

  while (!iterator.EndReached && guard < 100000) {
    guard += 1;
    const ts = iterator.currentTimeStamp ?? iterator.CurrentSourceTimestamp;
    const sourceBeats = (ts?.RealValue ?? 0) * 4;

    if (prevBeats !== undefined) {
      if (sourceBeats >= prevBeats) {
        seconds += secondsBetween(prevBeats, sourceBeats);
      } else {
        // Repeat jump backwards: previous step plays to the end of its measure.
        const m = measureAt(model, prevBeats);
        const end = m ? m.startBeats + m.durationBeats : prevBeats;
        seconds += secondsBetween(prevBeats, end);
        active = []; // sounding notes end at the repeat barline
      }
    }
    prevBeats = sourceBeats;

    active = active.filter((a) => a.endBeats > sourceBeats + 1e-6);

    const voiceEntries: any[] = iterator.CurrentVoiceEntries ?? [];
    const startingNoteIds: string[] = [];
    const plays: TimelineStep['notesToPlay'] = [];

    for (const ve of voiceEntries) {
      for (const srcNote of ve?.Notes ?? []) {
        const event = sourceToNote.get(srcNote);
        if (!event || event.isRest || !event.pitch) continue;
        startingNoteIds.push(event.id);
        active.push({ id: event.id, endBeats: event.onsetBeats + event.durationBeats });
        if (!event.tieStop) {
          const tiedBeats = tiedDurationBeats(model, event);
          const durationSeconds = secondsBetween(event.onsetBeats, event.onsetBeats + tiedBeats);
          plays.push({ name: event.pitch.name, midi: event.pitch.midi, durationSeconds });
        }
      }
    }

    steps.push({
      index: steps.length,
      seconds,
      sourceBeats,
      startingNoteIds,
      activeNoteIds: active.map((a) => a.id),
      notesToPlay: plays,
    });

    iterator.moveToNext();
  }

  if (steps.length === 0) return buildLinearTimeline(model);

  const last = steps[steps.length - 1];
  const tail = Math.max(0.5, ...last.notesToPlay.map((n) => n.durationSeconds));
  return { steps, totalSeconds: last.seconds + tail };
}

/** Follow tie chains so a tied note sounds for its full combined length. */
function tiedDurationBeats(model: ScoreModel, event: NoteEvent): number {
  let total = event.durationBeats;
  let current = event;
  let guard = 0;
  while (current.tieStart && guard < 64) {
    guard += 1;
    const next = model.notes.find(
      (n) =>
        !n.isRest &&
        n.staff === current.staff &&
        n.pitch?.midi === current.pitch?.midi &&
        Math.abs(n.onsetBeats - (current.onsetBeats + current.durationBeats)) < 0.01,
    );
    if (!next) break;
    total += next.durationBeats;
    current = next;
  }
  return total;
}

/** Fallback timeline straight from the model (no repeat handling). */
function buildLinearTimeline(model: ScoreModel): Timeline {
  const onsets = [...new Set(model.notes.filter((n) => !n.isRest).map((n) => round6(n.onsetBeats)))].sort(
    (a, b) => a - b,
  );
  const steps: TimelineStep[] = [];
  let totalSeconds = 0;
  onsets.forEach((onset, index) => {
    const starting = model.notes.filter((n) => !n.isRest && Math.abs(n.onsetBeats - onset) < 1e-6);
    const seconds = beatsToSeconds(model.tempoMap, onset);
    const active = model.notes.filter(
      (n) => !n.isRest && n.onsetBeats <= onset + 1e-6 && n.onsetBeats + n.durationBeats > onset + 1e-6,
    );
    const plays = starting
      .filter((n) => !n.tieStop && n.pitch)
      .map((n) => {
        const tied = tiedDurationBeats(model, n);
        const durationSeconds =
          beatsToSeconds(model.tempoMap, n.onsetBeats + tied) - beatsToSeconds(model.tempoMap, n.onsetBeats);
        return { name: n.pitch!.name, midi: n.pitch!.midi, durationSeconds };
      });
    steps.push({
      index,
      seconds,
      sourceBeats: onset,
      startingNoteIds: starting.map((n) => n.id),
      activeNoteIds: active.map((n) => n.id),
      notesToPlay: plays,
    });
    totalSeconds = Math.max(totalSeconds, seconds + Math.max(0.5, ...plays.map((p) => p.durationSeconds)));
  });
  return { steps, totalSeconds };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
