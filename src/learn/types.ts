/** Types for the note-reading course (skill tree → units → lessons → exercises). */

export type Clef = 'treble' | 'bass';

/** A tip/lifehack card shown between exercises. */
export interface TipCard {
  kind: 'tip';
  title: string;
  /** Paragraphs of teaching text */
  body: string[];
  /** Optional note names to draw on a staff, e.g. ['E4','G4','B4','D5','F5'] */
  staffNotes?: { clef: Clef; notes: string[]; labels?: boolean };
  /** Optional rhythm glyph line, e.g. '𝅝  𝅗𝅥  ♩  ♪' */
  glyphLine?: string;
  /** Optional keyboard range to display, highlighting these MIDI numbers */
  keyboardHighlight?: number[];
}

/** Multiple choice: a note is drawn, pick its name. */
export interface NoteNameSpec {
  kind: 'note-name';
  clef: Clef;
  /** Note names to quiz on, e.g. ['E4','G4','B4'] */
  pool: string[];
  count: number;
  /** Show accidentals in choices (for the accidentals unit) */
  withAccidentals?: boolean;
}

/** A note is drawn, tap the matching piano key (screen or real piano). */
export interface TapKeySpec {
  kind: 'tap-key';
  clef: Clef;
  pool: string[];
  count: number;
}

/** Two notes play, answer which is higher — or identify a played landmark. */
export interface EarSpec {
  kind: 'ear';
  mode: 'higher-lower' | 'identify';
  /** For identify: the candidate notes (also the answer chips) */
  pool: string[];
  count: number;
}

/** Metronome timing drill: tap the highlighted key on the notated rhythm. */
export interface TimingSpec {
  kind: 'timing';
  bpm: number;
  /** Patterns to drill; each entry is beats-from-start of measure taps, in one 4/4 bar unless barBeats set */
  patterns: { taps: number[]; glyphs: string; label: string; barBeats?: number }[];
  /** How many patterns to run (sampled in order) */
  count: number;
}

/** Theory check: plain multiple-choice question. */
export interface QuizSpec {
  kind: 'quiz';
  questions: { prompt: string; choices: string[]; answer: number; glyphLine?: string }[];
}

export type ExerciseSpec = NoteNameSpec | TapKeySpec | EarSpec | TimingSpec | QuizSpec;
export type LessonItem = TipCard | ExerciseSpec;

export interface Lesson {
  id: string;
  title: string;
  /** Short subtitle shown on the tree */
  blurb: string;
  items: LessonItem[];
}

export interface Unit {
  id: string;
  title: string;
  icon: string;
  color: string;
  lessons: Lesson[];
}

/** A generated, concrete question the runner presents. */
export interface Question {
  kind: 'note-name' | 'tap-key' | 'ear' | 'timing' | 'quiz';
  prompt: string;
  /** For staff drawing */
  clef?: Clef;
  noteName?: string;
  /** Answer chips (note-name/ear/quiz) */
  choices?: string[];
  answerIndex?: number;
  /** For tap-key: correct MIDI number */
  answerMidi?: number;
  /** For ear: midi numbers to play, in order */
  earMidis?: number[];
  /** For timing */
  timing?: { bpm: number; taps: number[]; glyphs: string; label: string; barBeats: number };
  glyphLine?: string;
}
