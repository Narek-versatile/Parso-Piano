import type { ParsedMidi, SpelledPitch } from './types';

/** Pitch classes of the major scale for fifths = 0 (C major). */
const MAJOR_PCS = [0, 2, 4, 5, 7, 9, 11];

const KEY_NAME_TO_FIFTHS: Record<string, number> = {
  Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1,
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
};
const MINOR_TO_RELATIVE_MAJOR_OFFSET = 3; // A minor → C major

/**
 * Determine the key signature (in fifths) for a MIDI file: use the key
 * signature meta event when present, otherwise pick the candidate whose major
 * scale covers the most sounded pitch classes.
 */
export function estimateFifths(parsed: ParsedMidi): { fifths: number; estimated: boolean } {
  const ks = parsed.keySigs[0];
  if (ks && ks.key in KEY_NAME_TO_FIFTHS) {
    let fifths = KEY_NAME_TO_FIFTHS[ks.key];
    if (ks.scale === 'minor') fifths = clampFifths(fifthsOfPc(pcOf(ks.key) + MINOR_TO_RELATIVE_MAJOR_OFFSET, fifths));
    return { fifths, estimated: false };
  }

  // Histogram of sounded pitch classes, weighted by duration.
  const histogram = new Array(12).fill(0);
  for (const n of parsed.notes) histogram[n.midi % 12] += n.durationTicks;
  const total = histogram.reduce((a: number, b: number) => a + b, 0);
  if (total === 0) return { fifths: 0, estimated: true };

  let best = 0;
  let bestScore = -1;
  for (let fifths = -6; fifths <= 6; fifths++) {
    const tonicPc = ((fifths * 7) % 12 + 12) % 12;
    const scale = new Set(MAJOR_PCS.map((pc) => (pc + tonicPc) % 12));
    let score = 0;
    for (let pc = 0; pc < 12; pc++) if (scale.has(pc)) score += histogram[pc];
    // Prefer simpler signatures on ties.
    if (score > bestScore || (score === bestScore && Math.abs(fifths) < Math.abs(best))) {
      bestScore = score;
      best = fifths;
    }
  }
  return { fifths: best, estimated: true };
}

function pcOf(name: string): number {
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[name[0]] ?? 0;
  for (const ch of name.slice(1)) pc += ch === '#' ? 1 : ch === 'b' ? -1 : 0;
  return ((pc % 12) + 12) % 12;
}

function fifthsOfPc(pc: number, fallback: number): number {
  const normalized = ((pc % 12) + 12) % 12;
  for (let f = -7; f <= 7; f++) {
    if (((f * 7) % 12 + 12) % 12 === normalized) return f;
  }
  return fallback;
}

function clampFifths(f: number): number {
  return Math.max(-7, Math.min(7, f));
}

// Chromatic spelling tables: [step, alter] for each pitch class.
const SHARP_SPELLING: [string, number][] = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];
const FLAT_SPELLING: [string, number][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

/** Spell a MIDI note number in the context of a key signature. */
export function spellMidi(midi: number, fifths: number): SpelledPitch {
  const table = fifths < 0 ? FLAT_SPELLING : SHARP_SPELLING;
  const [step, alter] = table[midi % 12];
  // Scientific octave; a Cb would live in the octave above its sounding pitch
  // but the tables above never produce B#/Cb, so this stays simple.
  const octave = Math.floor(midi / 12) - 1;
  return { step, alter, octave, midi };
}
