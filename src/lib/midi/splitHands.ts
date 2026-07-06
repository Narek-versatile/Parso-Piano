import type { QuantNote } from './types';
import type { QuantizedRaw } from './quantize';

export interface HandSplitResult {
  notes: QuantNote[];
  /** True when the single-track pitch heuristic was used */
  usedPitchHeuristic: boolean;
}

const MIDDLE_C = 60;

/**
 * Assign notes to treble (staff 1) or bass (staff 2).
 * - Two or more note tracks: first track → treble, second → bass; any extra
 *   tracks go to whichever staff is closer to their average pitch.
 * - Single track: chords (same onset) are kept together and assigned by their
 *   mean pitch relative to middle C.
 */
export function splitHands(quantized: QuantizedRaw): HandSplitResult {
  const notes = quantized.notes;
  const trackIds = [...new Set(notes.map((n) => n.track))];

  if (trackIds.length >= 2) {
    // The treble staff gets whichever of the first two tracks plays higher.
    const meanPitch = (t: number) => {
      const ps = notes.filter((n) => n.track === t).map((n) => n.midi);
      return ps.reduce((a, b) => a + b, 0) / ps.length;
    };
    const firstTwo = [...trackIds].sort((a, b) => a - b).slice(0, 2);
    const [trebleTrack, bassTrack] =
      meanPitch(firstTwo[0]) >= meanPitch(firstTwo[1]) ? firstTwo : [firstTwo[1], firstTwo[0]];
    const extraStaff = new Map<number, 1 | 2>();
    for (const t of trackIds) {
      if (firstTwo.includes(t)) continue;
      extraStaff.set(t, meanPitch(t) >= MIDDLE_C ? 1 : 2);
    }
    return {
      usedPitchHeuristic: false,
      notes: notes.map((n) => ({
        midi: n.midi,
        onset: n.onset,
        duration: n.duration,
        staff: n.track === trebleTrack ? 1 : n.track === bassTrack ? 2 : extraStaff.get(n.track)!,
      })),
    };
  }

  // Single track: group by onset so chords stay in one hand.
  const byOnset = new Map<number, typeof notes>();
  for (const n of notes) {
    const group = byOnset.get(n.onset);
    if (group) group.push(n);
    else byOnset.set(n.onset, [n]);
  }

  const result: QuantNote[] = [];
  for (const group of byOnset.values()) {
    const sorted = [...group].sort((a, b) => a.midi - b.midi);
    const span = sorted[sorted.length - 1].midi - sorted[0].midi;
    if (span > 14 && sorted.length > 1) {
      // Wide simultaneous spread: almost certainly two hands at once.
      for (const n of sorted) {
        result.push({ midi: n.midi, onset: n.onset, duration: n.duration, staff: n.midi >= MIDDLE_C ? 1 : 2 });
      }
    } else {
      const mean = sorted.reduce((a, b) => a + b.midi, 0) / sorted.length;
      const staff: 1 | 2 = mean >= MIDDLE_C ? 1 : 2;
      for (const n of sorted) {
        result.push({ midi: n.midi, onset: n.onset, duration: n.duration, staff });
      }
    }
  }
  result.sort((a, b) => a.onset - b.onset || a.midi - b.midi);
  return { notes: result, usedPitchHeuristic: true };
}
