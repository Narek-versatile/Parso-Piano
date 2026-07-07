/** Small note-name helpers shared by the learn module (no external deps). */

const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export interface ParsedNote {
  step: string;
  alter: number;
  octave: number;
  midi: number;
  name: string;
}

/** Parse names like "C4", "F#3", "Bb5". */
export function parseNote(name: string): ParsedNote {
  const m = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const step = m[1];
  const alter = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const octave = parseInt(m[3], 10);
  const midi = 12 * (octave + 1) + STEP_PC[step] + alter;
  return { step, alter, octave, midi, name };
}

/** Diatonic index from C0 (C=0, D=1, …) used for staff positioning. */
export function diatonicIndex(step: string, octave: number): number {
  return octave * 7 + STEPS.indexOf(step);
}

/** Neighbouring natural note names for plausible wrong answers. */
export function neighborNames(name: string, distance: number): string[] {
  const p = parseNote(name);
  const base = diatonicIndex(p.step, p.octave);
  const result: string[] = [];
  for (let d = -distance; d <= distance; d++) {
    if (d === 0) continue;
    const idx = base + d;
    const octave = Math.floor(idx / 7);
    const step = STEPS[((idx % 7) + 7) % 7];
    result.push(`${step}${octave}`);
  }
  return result;
}

/** Pretty display: "F#4" → "F♯4", also a letter-only variant. */
export function prettyName(name: string, withOctave = true): string {
  const p = parseNote(name);
  const acc = p.alter === 1 ? '♯' : p.alter === -1 ? '♭' : '';
  return withOctave ? `${p.step}${acc}${p.octave}` : `${p.step}${acc}`;
}
