/** Shared types for the MIDI → MusicXML conversion pipeline. */

export interface RawMidiNote {
  midi: number;
  ticks: number;
  durationTicks: number;
  velocity: number;
  track: number;
}

export interface ParsedMidi {
  ppq: number;
  name?: string;
  notes: RawMidiNote[];
  tempos: { ticks: number; bpm: number }[];
  timeSigs: { ticks: number; num: number; den: number }[];
  keySigs: { ticks: number; key: string; scale: string }[];
  /** Count of tracks that contain at least one note */
  noteTrackCount: number;
}

/**
 * A note quantized to the 16th-note grid. All positions/durations are in
 * 16th-note units from the start of the piece.
 */
export interface QuantNote {
  midi: number;
  onset: number;
  duration: number;
  /** 1 = treble staff (right hand), 2 = bass staff (left hand) */
  staff: 1 | 2;
}

export interface SpelledPitch {
  step: string;
  alter: number;
  octave: number;
  midi: number;
}

/** One stem: one or more simultaneous notes (or a rest when notes is empty). */
export interface MeasureEntry {
  /** Onset in 16th units, absolute from piece start */
  onset: number;
  /** Duration in 16th units — always a valid single notation value */
  duration: number;
  notes: SpelledPitch[];
  tieStart: boolean;
  tieStop: boolean;
  /** Whole-measure rest marker */
  fullMeasureRest?: boolean;
}

export interface BuiltMeasure {
  index: number;
  startUnits: number;
  durationUnits: number;
  timeSig: { num: number; den: number };
  timeSigChanged: boolean;
  /** Tempo change taking effect at this measure's start, if any */
  tempo?: number;
  staves: { 1: MeasureEntry[]; 2: MeasureEntry[] };
}
