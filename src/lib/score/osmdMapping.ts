/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NoteEvent, ScoreModel } from './model';

/**
 * Bridges OSMD's rendered notes and our ScoreModel.
 * sourceToNote survives re-renders (OSMD keeps its parsed sheet); the
 * graphical/SVG maps must be rebuilt after every osmd.render().
 */
export interface OsmdMaps {
  sourceToNote: Map<any, NoteEvent>;
  idToGraphical: Map<string, any>;
  idToSvg: Map<string, SVGGElement>;
}

function graphicalNotesOf(osmd: any): { gNote: any; measureIndex: number; staff: number }[] {
  const result: { gNote: any; measureIndex: number; staff: number }[] = [];
  const measureList: any[][] = osmd?.GraphicSheet?.MeasureList ?? [];
  measureList.forEach((row: any[], measureIndex: number) => {
    (row ?? []).forEach((gMeasure: any, staffIndex: number) => {
      for (const staffEntry of gMeasure?.staffEntries ?? []) {
        for (const gve of staffEntry?.graphicalVoiceEntries ?? []) {
          for (const gNote of gve?.notes ?? []) {
            result.push({ gNote, measureIndex, staff: staffIndex + 1 });
          }
        }
      }
    });
  });
  return result;
}

function sourceOnsetBeats(sourceNote: any): number | undefined {
  try {
    const ts = sourceNote?.getAbsoluteTimestamp?.() ?? sourceNote?.AbsoluteTimestamp;
    const real = ts?.RealValue;
    if (typeof real === 'number') return real * 4;
  } catch {
    /* fall through */
  }
  return undefined;
}

function sourceHalfTone(sourceNote: any): number | undefined {
  const ht = sourceNote?.halfTone ?? sourceNote?.Pitch?.getHalfTone?.();
  return typeof ht === 'number' ? ht : undefined;
}

function sourceIsRest(sourceNote: any): boolean {
  try {
    if (typeof sourceNote?.isRest === 'function') return sourceNote.isRest();
  } catch {
    /* fall through */
  }
  return !sourceNote?.Pitch;
}

/**
 * Match every OSMD graphical note to a model NoteEvent by
 * (measure, staff, MIDI pitch, onset). The MIDI offset between OSMD's
 * halfTone and real MIDI numbers is calibrated automatically.
 */
export function buildOsmdMaps(osmd: any, model: ScoreModel): OsmdMaps {
  const all = graphicalNotesOf(osmd);

  // Index model notes for lookup.
  const pitchedIndex = new Map<string, NoteEvent[]>();
  const restIndex = new Map<string, NoteEvent[]>();
  for (const n of model.notes) {
    if (n.isRest) {
      const key = `${n.measureIndex}:${n.staff}`;
      (restIndex.get(key) ?? restIndex.set(key, []).get(key)!).push(n);
    } else {
      const key = `${n.measureIndex}:${n.staff}:${n.pitch!.midi}`;
      (pitchedIndex.get(key) ?? pitchedIndex.set(key, []).get(key)!).push(n);
    }
  }

  // Calibrate halfTone → MIDI offset (OSMD's halfTone is usually midi - 12).
  const offsets = [12, 0, 24, -12];
  let bestOffset = 12;
  let bestHits = -1;
  const sample = all.filter((x) => !sourceIsRest(x.gNote?.sourceNote)).slice(0, 60);
  for (const off of offsets) {
    let hits = 0;
    for (const { gNote, measureIndex, staff } of sample) {
      const ht = sourceHalfTone(gNote.sourceNote);
      if (ht === undefined) continue;
      if (pitchedIndex.has(`${measureIndex}:${staff}:${ht + off}`)) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestOffset = off;
    }
  }

  const sourceToNote = new Map<any, NoteEvent>();
  const idToGraphical = new Map<string, any>();
  const matched = new Set<string>();

  for (const { gNote, measureIndex, staff } of all) {
    const sourceNote = gNote?.sourceNote;
    if (!sourceNote) continue;
    let event = sourceToNote.get(sourceNote);
    if (!event) {
      const onset = sourceOnsetBeats(sourceNote);
      if (sourceIsRest(sourceNote)) {
        const candidates = restIndex.get(`${measureIndex}:${staff}`) ?? [];
        event = pickByOnset(candidates, onset, matched);
      } else {
        const ht = sourceHalfTone(sourceNote);
        if (ht === undefined) continue;
        const candidates = pitchedIndex.get(`${measureIndex}:${staff}:${ht + bestOffset}`) ?? [];
        event = pickByOnset(candidates, onset, matched);
      }
      if (!event) continue;
      matched.add(event.id);
      sourceToNote.set(sourceNote, event);
    }
    idToGraphical.set(event.id, gNote);
  }

  const idToSvg = tagSvgElements(idToGraphical);
  return { sourceToNote, idToGraphical, idToSvg };
}

function pickByOnset(
  candidates: NoteEvent[],
  onset: number | undefined,
  matched: Set<string>,
): NoteEvent | undefined {
  if (candidates.length === 0) return undefined;
  const pool = onset === undefined
    ? candidates
    : candidates.filter((c) => Math.abs(c.onsetBeats - onset) < 0.05);
  const list = pool.length > 0 ? pool : candidates;
  return list.find((c) => !matched.has(c.id)) ?? list[0];
}

/** Add data-note-id attributes and a base class to each note's SVG group. */
function tagSvgElements(idToGraphical: Map<string, any>): Map<string, SVGGElement> {
  const idToSvg = new Map<string, SVGGElement>();
  for (const [id, gNote] of idToGraphical) {
    try {
      const el: SVGGElement | undefined = gNote?.getSVGGElement?.();
      if (el) {
        el.setAttribute('data-note-id', id);
        el.classList.add('pp-note');
        idToSvg.set(id, el);
      }
    } catch {
      /* stems without SVG (e.g. invisible notes) are fine to skip */
    }
  }
  return idToSvg;
}
