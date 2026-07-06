import type { BuiltMeasure, ParsedMidi, QuantNote } from './types';
import { spellMidi } from './spell';

/** Renderable durations in 16th units, largest first (dotted values included). */
const VALID_UNITS = [16, 12, 8, 6, 4, 3, 2, 1];

export interface BuildResult {
  measures: BuiltMeasure[];
  /** Notes whose duration was shortened to avoid overlapping a later entry */
  clippedCount: number;
}

/**
 * Cut the quantized, staff-assigned note stream into measures with tied
 * notes across barlines and rests filling every gap. One voice per staff.
 */
export function buildMeasures(notes: QuantNote[], parsed: ParsedMidi, fifths: number): BuildResult {
  const grid = parsed.ppq / 4;
  const timeSigs = parsed.timeSigs
    .map((ts) => ({ units: Math.round(ts.ticks / grid), num: ts.num, den: ts.den }))
    .sort((a, b) => a.units - b.units);
  if (timeSigs.length === 0 || timeSigs[0].units > 0) {
    timeSigs.unshift({ units: 0, num: 4, den: 4 });
  }
  const tempos = parsed.tempos
    .map((t) => ({ units: Math.round(t.ticks / grid), bpm: Math.round(t.bpm * 100) / 100 }))
    .sort((a, b) => a.units - b.units);

  const totalUnits = Math.max(16, ...notes.map((n) => n.onset + n.duration));

  // Lay out measure frames, applying time-signature changes at measure starts.
  const frames: { start: number; duration: number; num: number; den: number; changed: boolean }[] = [];
  let cursor = 0;
  let sigIdx = 0;
  let current = timeSigs[0];
  while (cursor < totalUnits) {
    let changed = frames.length === 0;
    while (sigIdx + 1 < timeSigs.length && timeSigs[sigIdx + 1].units <= cursor) {
      sigIdx += 1;
      current = timeSigs[sigIdx];
      changed = true;
    }
    const duration = Math.max(1, Math.round((current.num * 16) / current.den));
    frames.push({ start: cursor, duration, num: current.num, den: current.den, changed });
    cursor += duration;
  }

  const measures: BuiltMeasure[] = frames.map((f, i) => ({
    index: i,
    startUnits: f.start,
    durationUnits: f.duration,
    timeSig: { num: f.num, den: f.den },
    timeSigChanged: f.changed,
    staves: { 1: [], 2: [] },
  }));

  // Attach tempo changes to the measure containing them.
  for (const t of tempos) {
    const m = measures.find((mm) => t.units < mm.startUnits + mm.durationUnits);
    if (m && m.tempo === undefined) m.tempo = t.bpm;
  }

  let clippedCount = 0;
  for (const staff of [1, 2] as const) {
    const staffNotes = notes.filter((n) => n.staff === staff);
    const { entries, clipped } = buildStaffEntries(staffNotes);
    clippedCount += clipped;
    placeEntries(entries, measures, staff, fifths);
    fillRests(measures, staff);
  }

  return { measures, clippedCount };
}

interface StaffEntry {
  onset: number;
  duration: number;
  pitches: number[];
}

/** Group same-onset notes into chords and clip overlaps (one voice per staff). */
function buildStaffEntries(staffNotes: QuantNote[]): { entries: StaffEntry[]; clipped: number } {
  const byOnset = new Map<number, QuantNote[]>();
  for (const n of staffNotes) {
    const g = byOnset.get(n.onset);
    if (g) g.push(n);
    else byOnset.set(n.onset, [n]);
  }
  const onsets = [...byOnset.keys()].sort((a, b) => a - b);
  const entries: StaffEntry[] = [];
  let clipped = 0;
  for (let i = 0; i < onsets.length; i++) {
    const group = byOnset.get(onsets[i])!;
    const durations = group.map((n) => n.duration);
    let duration = Math.min(...durations);
    if (Math.max(...durations) !== duration) clipped += 1;
    if (i + 1 < onsets.length && onsets[i] + duration > onsets[i + 1]) {
      duration = onsets[i + 1] - onsets[i];
      clipped += 1;
    }
    entries.push({
      onset: onsets[i],
      duration,
      pitches: [...new Set(group.map((n) => n.midi))].sort((a, b) => a - b),
    });
  }
  return { entries, clipped };
}

/** Split entries at barlines and into valid values, then place into measures. */
function placeEntries(
  entries: StaffEntry[],
  measures: BuiltMeasure[],
  staff: 1 | 2,
  fifths: number,
): void {
  for (const entry of entries) {
    const pieces = splitIntoRenderable(entry.onset, entry.duration, measures);
    pieces.forEach((piece, i) => {
      const m = measureContaining(measures, piece.onset);
      if (!m) return;
      m.staves[staff].push({
        onset: piece.onset,
        duration: piece.duration,
        notes: entry.pitches.map((midi) => spellMidi(midi, fifths)),
        tieStart: i < pieces.length - 1,
        tieStop: i > 0,
      });
    });
  }
  for (const m of measures) m.staves[staff].sort((a, b) => a.onset - b.onset);
}

function measureContaining(measures: BuiltMeasure[], units: number): BuiltMeasure | undefined {
  return measures.find((m) => units >= m.startUnits && units < m.startUnits + m.durationUnits);
}

/** Cut a span at barlines, then greedily into valid single-notation values. */
function splitIntoRenderable(
  onset: number,
  duration: number,
  measures: BuiltMeasure[],
): { onset: number; duration: number }[] {
  const pieces: { onset: number; duration: number }[] = [];
  let pos = onset;
  let remaining = duration;
  while (remaining > 0) {
    const m = measureContaining(measures, pos);
    if (!m) break;
    const untilBarline = m.startUnits + m.durationUnits - pos;
    let segment = Math.min(remaining, untilBarline);
    while (segment > 0) {
      const value = VALID_UNITS.find((v) => v <= segment) ?? 1;
      pieces.push({ onset: pos, duration: value });
      pos += value;
      segment -= value;
      remaining -= value;
    }
  }
  return pieces;
}

/** Fill every uncovered span of each measure with rests. */
function fillRests(measures: BuiltMeasure[], staff: 1 | 2): void {
  for (const m of measures) {
    const entries = m.staves[staff];
    if (entries.length === 0) {
      entries.push({
        onset: m.startUnits,
        duration: m.durationUnits,
        notes: [],
        tieStart: false,
        tieStop: false,
        fullMeasureRest: true,
      });
      continue;
    }
    const gaps: { onset: number; duration: number }[] = [];
    let pos = m.startUnits;
    for (const e of entries) {
      if (e.onset > pos) gaps.push({ onset: pos, duration: e.onset - pos });
      pos = Math.max(pos, e.onset + e.duration);
    }
    const end = m.startUnits + m.durationUnits;
    if (pos < end) gaps.push({ onset: pos, duration: end - pos });

    for (const gap of gaps) {
      let rPos = gap.onset;
      let remaining = gap.duration;
      while (remaining > 0) {
        const value = VALID_UNITS.find((v) => v <= remaining) ?? 1;
        entries.push({ onset: rPos, duration: value, notes: [], tieStart: false, tieStop: false });
        rPos += value;
        remaining -= value;
      }
    }
    entries.sort((a, b) => a.onset - b.onset);
  }
}
