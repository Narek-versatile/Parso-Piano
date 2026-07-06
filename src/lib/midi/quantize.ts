import type { ParsedMidi, RawMidiNote } from './types';

export interface QuantizedRaw {
  /** Notes with onset/duration in 16th-note units, still carrying their track */
  notes: (RawMidiNote & { onset: number; duration: number })[];
  /** Fraction of notes whose onset moved by more than a 32nd note */
  displacedRatio: number;
}

/**
 * Snap note onsets and durations to a 16th-note grid.
 * The grid keeps the notation readable; swing/tuplet material will be
 * approximated (a warning is raised upstream when displacement is high).
 */
export function quantize(parsed: ParsedMidi): QuantizedRaw {
  const grid = parsed.ppq / 4; // ticks per 16th
  const halfGrid = parsed.ppq / 8; // a 32nd, displacement threshold
  let displaced = 0;

  const notes = parsed.notes.map((n) => {
    const onsetUnits = Math.round(n.ticks / grid);
    if (Math.abs(n.ticks - onsetUnits * grid) > halfGrid / 2) displaced += 1;
    const durationUnits = Math.max(1, Math.round(n.durationTicks / grid));
    return { ...n, onset: onsetUnits, duration: durationUnits };
  });

  // Merge exact duplicates (same pitch, same onset — common in layered MIDI).
  const seen = new Map<string, (typeof notes)[number]>();
  for (const n of notes) {
    const key = `${n.onset}:${n.midi}:${n.track}`;
    const prev = seen.get(key);
    if (prev) prev.duration = Math.max(prev.duration, n.duration);
    else seen.set(key, n);
  }

  const result = [...seen.values()].sort((a, b) => a.onset - b.onset || a.midi - b.midi);
  return {
    notes: result,
    displacedRatio: parsed.notes.length ? displaced / parsed.notes.length : 0,
  };
}
