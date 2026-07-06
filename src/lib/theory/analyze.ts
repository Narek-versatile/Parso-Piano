import { Chord, Interval, Note as TonalNote } from 'tonal';
import type { KeySig, NoteEvent, ScoreModel } from '../score/model';
import { measureAt, notesSoundingAt } from '../score/model';

export interface IntervalInfo {
  fromName: string;
  toName: string;
  /** tonal shorthand, e.g. "3M" */
  shorthand: string;
  /** Human name, e.g. "major third" */
  name: string;
  semitones: number;
}

export interface ChordAnalysis {
  /** Unique sounding notes, low to high */
  soundingNotes: { name: string; midi: number }[];
  /** e.g. "Cmaj7" — undefined when no chord was recognized */
  chordSymbol?: string;
  /** Long name, e.g. "C major seventh" */
  chordLongName?: string;
  /** Chord tones as pitch classes, root first */
  chordTones: string[];
  /** 0 = root position, 1 = first inversion, … undefined when unknown */
  inversion?: number;
  bassNote?: string;
  rootNote?: string;
  intervalsFromBass: IntervalInfo[];
  /** Roman numeral relative to the current key, e.g. "V7" */
  roman?: string;
  /** Harmonic function label, e.g. "dominant" */
  harmonicFunction?: string;
  key: KeySig;
  /** 1-based scale degree of the selected note in the key; undefined if chromatic */
  selectedDegree?: number;
  selectedIsDiatonic: boolean;
}

const ORDINAL_QUALITY: Record<string, string> = {
  P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished', AA: 'doubly augmented', dd: 'doubly diminished',
};
const ORDINAL_NUMBER: Record<number, string> = {
  1: 'unison', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh',
  8: 'octave', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 13: 'thirteenth',
};

export function describeInterval(shorthand: string): string {
  const info = Interval.get(shorthand);
  if (info.empty) return shorthand;
  const q = ORDINAL_QUALITY[info.q] ?? info.q;
  const n = ORDINAL_NUMBER[Math.abs(info.num)] ?? `${Math.abs(info.num)}th`;
  if (Math.abs(info.num) === 1 && info.q === 'P') return 'unison';
  if (Math.abs(info.num) === 8 && info.q === 'P') return 'octave';
  return `${q} ${n}`;
}

const MAJOR_DEGREES = [0, 2, 4, 5, 7, 9, 11];
const MINOR_DEGREES = [0, 2, 3, 5, 7, 8, 10];

/** Roman numerals per scale degree (index 0 = tonic). */
const MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
const FUNCTION_BY_DEGREE = [
  'tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading tone',
];

/** Common chord types, most familiar first — used to rank Chord.detect results. */
const PREFERRED_TYPES = [
  'major', 'minor', 'dominant seventh', 'major seventh', 'minor seventh',
  'diminished', 'diminished seventh', 'half-diminished', 'augmented',
  'suspended fourth', 'suspended second', 'sixth', 'minor sixth',
  'major ninth', 'minor ninth', 'dominant ninth',
];

/**
 * Chord.detect can rank exotic readings first (e.g. "Em#5" before "CM/E") —
 * prefer the interpretation with the most familiar chord quality.
 */
function chooseDetection(detected: string[]): string {
  let best = detected[0];
  let bestRank = Infinity;
  for (const symbol of detected) {
    const chord = Chord.get(symbol.split('/')[0]);
    const rank = chord.empty ? Infinity : PREFERRED_TYPES.indexOf(chord.type);
    const effective = rank === -1 ? PREFERRED_TYPES.length : rank;
    if (effective < bestRank) {
      bestRank = effective;
      best = symbol;
    }
  }
  return best;
}

function pcOfName(name: string): number | undefined {
  const chroma = TonalNote.get(name).chroma;
  return chroma === undefined || chroma === null ? undefined : chroma;
}

/**
 * Analyze the harmony sounding at the moment a note is played:
 * chord identification, inversion, intervals and function in the key.
 */
export function analyzeMoment(model: ScoreModel, note: NoteEvent): ChordAnalysis {
  const measure = measureAt(model, note.onsetBeats);
  const key: KeySig = measure?.keySig ?? { fifths: 0, mode: 'major', tonic: 'C' };

  const sounding = notesSoundingAt(model, note.onsetBeats)
    .filter((n) => n.pitch)
    .sort((a, b) => a.pitch!.midi - b.pitch!.midi);

  // Deduplicate by midi (both hands may double a note).
  const byMidi = new Map<number, { name: string; midi: number }>();
  for (const n of sounding) {
    if (!byMidi.has(n.pitch!.midi)) byMidi.set(n.pitch!.midi, { name: n.pitch!.name, midi: n.pitch!.midi });
  }
  const uniqueNotes = [...byMidi.values()].sort((a, b) => a.midi - b.midi);

  const analysis: ChordAnalysis = {
    soundingNotes: uniqueNotes,
    chordTones: [],
    intervalsFromBass: [],
    key,
    selectedIsDiatonic: false,
  };

  // Scale-degree of the selected note.
  if (note.pitch) {
    const tonicPc = pcOfName(key.tonic);
    const notePc = note.pitch.midi % 12;
    if (tonicPc !== undefined) {
      const rel = ((notePc - tonicPc) % 12 + 12) % 12;
      const degrees = key.mode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;
      const idx = degrees.indexOf(rel);
      if (idx >= 0) {
        analysis.selectedDegree = idx + 1;
        analysis.selectedIsDiatonic = true;
      }
    }
  }

  if (uniqueNotes.length === 0) return analysis;

  const bass = uniqueNotes[0];
  analysis.bassNote = bass.name;

  // Intervals of every upper note against the bass.
  for (let i = 1; i < uniqueNotes.length; i++) {
    const shorthand = Interval.distance(bass.name, uniqueNotes[i].name);
    analysis.intervalsFromBass.push({
      fromName: bass.name,
      toName: uniqueNotes[i].name,
      shorthand,
      name: describeInterval(shorthand),
      semitones: uniqueNotes[i].midi - bass.midi,
    });
  }

  if (uniqueNotes.length < 3) return analysis; // single note or dyad: no chord naming

  // Chord detection on unique pitch classes, bass first.
  const pcNames: string[] = [];
  for (const n of uniqueNotes) {
    const pc = n.name.replace(/-?\d+$/, '');
    if (!pcNames.includes(pc)) pcNames.push(pc);
  }
  const detected = Chord.detect(pcNames, { assumePerfectFifth: true });
  if (detected.length === 0) return analysis;

  const symbol = chooseDetection(detected);
  const [main] = symbol.split('/');
  const chord = Chord.get(main);
  if (chord.empty) return analysis;

  // tonal writes major triads as "GM"; conventional notation is just "G".
  analysis.chordSymbol = symbol.replace(/M(?=\/|$)/, '');
  analysis.chordLongName = chord.name || symbol;
  analysis.chordTones = chord.notes;
  analysis.rootNote = chord.tonic ?? undefined;

  // Inversion: position of the bass pitch class among the chord tones.
  const bassPc = pcOfName(bass.name);
  const toneIdx = chord.notes.findIndex((t) => pcOfName(t) === bassPc);
  if (toneIdx >= 0) analysis.inversion = toneIdx;

  // Roman numeral: degree of the chord root within the key.
  const tonicPc = pcOfName(key.tonic);
  const rootPc = chord.tonic ? pcOfName(chord.tonic) : undefined;
  if (tonicPc !== undefined && rootPc !== undefined) {
    const rel = ((rootPc - tonicPc) % 12 + 12) % 12;
    const degrees = key.mode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;
    const degIdx = degrees.indexOf(rel);
    if (degIdx >= 0) {
      const numerals = key.mode === 'minor' ? MINOR_NUMERALS : MAJOR_NUMERALS;
      let roman = numerals[degIdx];
      // Adjust case to the actual chord quality where it differs.
      if (chord.quality === 'Major' && roman === roman.toLowerCase()) {
        roman = roman.toUpperCase().replace('°', '');
      } else if (chord.quality === 'Minor' && roman !== roman.toLowerCase()) {
        roman = roman.toLowerCase();
      }
      if (/7/.test(chord.type) || chord.type.includes('seventh')) roman += '7';
      analysis.roman = roman;
      analysis.harmonicFunction = FUNCTION_BY_DEGREE[degIdx];
    }
  }

  return analysis;
}
