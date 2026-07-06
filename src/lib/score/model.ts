/**
 * Normalized score model. Every subsystem (explanations, keyboard, playback,
 * theory analysis) consumes this — never OSMD internals directly.
 *
 * Beats are quarter-note beats from the start of the piece (repeats not
 * unrolled; playback handles repeats via the timeline).
 */

export type ClefType = 'treble' | 'bass' | 'alto' | 'tenor' | 'percussion' | 'unknown';

export interface TimeSig {
  num: number;
  den: number;
}

export interface KeySig {
  /** Number of sharps (positive) or flats (negative) */
  fifths: number;
  mode: 'major' | 'minor';
  /** Tonic note name, e.g. "Eb" for fifths=-3 major */
  tonic: string;
}

export interface TempoEvent {
  beats: number;
  bpm: number;
  /** Verbal marking if present, e.g. "Allegro" */
  text?: string;
}

export interface DynamicEvent {
  beats: number;
  /** e.g. "p", "ff", "crescendo", "diminuendo" */
  value: string;
  kind: 'instant' | 'wedge-start' | 'wedge-stop';
}

export interface BarlineInfo {
  repeatStart: boolean;
  repeatEnd: boolean;
  right: 'regular' | 'light-light' | 'light-heavy' | 'other';
}

export interface MeasureInfo {
  index: number;
  /** Printed measure number (usually index + 1, respects pickup measures) */
  number: number;
  startBeats: number;
  durationBeats: number;
  timeSig: TimeSig;
  timeSigChanged: boolean;
  keySig: KeySig;
  keySigChanged: boolean;
  clefByStaff: Record<number, ClefType>;
  clefChanged: boolean;
  tempo?: TempoEvent;
  barline: BarlineInfo;
  dynamics: DynamicEvent[];
}

export interface NotePitch {
  /** Letter step, e.g. "E" */
  step: string;
  /** -2..2 (flats negative) */
  alter: number;
  /** Scientific octave, middle C = C4 */
  octave: number;
  /** Full spelled name, e.g. "Eb4" */
  name: string;
  midi: number;
}

export interface NoteNotations {
  articulations: string[];
  ornaments: string[];
  slurStart: boolean;
  slurStop: boolean;
  fermata: boolean;
  arpeggiate: boolean;
  /** Dynamic mark attached directly to this note, e.g. "sf" */
  dynamic?: string;
}

export interface NoteEvent {
  id: string;
  isRest: boolean;
  pitch?: NotePitch;
  onsetBeats: number;
  durationBeats: number;
  measureIndex: number;
  /** 1-based staff number within the part (1 = top/treble in grand staff) */
  staff: number;
  voice: number;
  /** Rhythm value name, e.g. "quarter"; empty if irregular */
  rhythmType: string;
  dots: number;
  tieStart: boolean;
  tieStop: boolean;
  /** Notes sharing a stem (same voice entry) share this id */
  chordGroupId: string;
  notations: NoteNotations;
}

export interface ScoreModel {
  title?: string;
  source: 'musicxml' | 'midi';
  fileName: string;
  measures: MeasureInfo[];
  /** All note events (rests included), sorted by onsetBeats */
  notes: NoteEvent[];
  tempoMap: TempoEvent[];
  /** Total staves used (grand staff piano = 2) */
  staffCount: number;
  warnings: string[];
}

const RHYTHM_BY_QUARTERS: [number, string, number][] = [
  // [quarter-note length, type name, dots]
  [6, 'whole', 1],
  [4, 'whole', 0],
  [3, 'half', 1],
  [2, 'half', 0],
  [1.5, 'quarter', 1],
  [1, 'quarter', 0],
  [0.75, 'eighth', 1],
  [0.5, 'eighth', 0],
  [0.375, '16th', 1],
  [0.25, '16th', 0],
  [0.125, '32nd', 0],
  [0.0625, '64th', 0],
];

/** Derive a rhythm value name + dots from a duration in quarter-note beats. */
export function rhythmFromBeats(beats: number): { type: string; dots: number } {
  for (const [len, type, dots] of RHYTHM_BY_QUARTERS) {
    if (Math.abs(beats - len) < 1e-6) return { type, dots };
  }
  return { type: '', dots: 0 };
}

const FIFTHS_MAJOR: Record<number, string> = {
  [-7]: 'Cb', [-6]: 'Gb', [-5]: 'Db', [-4]: 'Ab', [-3]: 'Eb', [-2]: 'Bb', [-1]: 'F',
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
};
const FIFTHS_MINOR: Record<number, string> = {
  [-7]: 'Ab', [-6]: 'Eb', [-5]: 'Bb', [-4]: 'F', [-3]: 'C', [-2]: 'G', [-1]: 'D',
  0: 'A', 1: 'E', 2: 'B', 3: 'F#', 4: 'C#', 5: 'G#', 6: 'D#', 7: 'A#',
};

export function keySigFromFifths(fifths: number, mode: 'major' | 'minor' = 'major'): KeySig {
  const clamped = Math.max(-7, Math.min(7, Math.round(fifths)));
  const tonic = (mode === 'minor' ? FIFTHS_MINOR : FIFTHS_MAJOR)[clamped] ?? 'C';
  return { fifths: clamped, mode, tonic };
}

/** Frequency in Hz for a MIDI note number (A4 = 440). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert quarter-note beats to seconds using the tempo map. */
export function beatsToSeconds(tempoMap: TempoEvent[], beats: number): number {
  let seconds = 0;
  let lastBeats = 0;
  let lastBpm = tempoMap.length > 0 ? tempoMap[0].bpm : 120;
  for (const ev of tempoMap) {
    if (ev.beats >= beats) break;
    seconds += ((ev.beats - lastBeats) * 60) / lastBpm;
    lastBeats = ev.beats;
    lastBpm = ev.bpm;
  }
  seconds += ((beats - lastBeats) * 60) / lastBpm;
  return seconds;
}

export function measureAt(model: ScoreModel, beats: number): MeasureInfo | undefined {
  let result: MeasureInfo | undefined;
  for (const m of model.measures) {
    if (m.startBeats <= beats + 1e-6) result = m;
    else break;
  }
  return result;
}

/** All non-rest notes sounding at the given beat position (across all staves). */
export function notesSoundingAt(model: ScoreModel, beats: number): NoteEvent[] {
  return model.notes.filter(
    (n) =>
      !n.isRest &&
      n.onsetBeats <= beats + 1e-6 &&
      n.onsetBeats + n.durationBeats > beats + 1e-6,
  );
}
