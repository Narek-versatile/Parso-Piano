import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import { midiToMusicXML } from '../index';
import { spellMidi, estimateFifths } from '../spell';
import { quantize } from '../quantize';
import { splitHands } from '../splitHands';
import { parseMidi } from '../parse';

/** Build a simple two-track piano MIDI file in memory. */
function makeTwoHandMidi(): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(100);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] });
  const ppq = midi.header.ppq;

  const right = midi.addTrack();
  // C5 quarter, D5 quarter, E5 quarter (measure 1); F5 dotted half (measure 2)
  right.addNote({ midi: 72, ticks: 0, durationTicks: ppq });
  right.addNote({ midi: 74, ticks: ppq, durationTicks: ppq });
  right.addNote({ midi: 76, ticks: ppq * 2, durationTicks: ppq });
  right.addNote({ midi: 77, ticks: ppq * 3, durationTicks: ppq * 3 });

  const left = midi.addTrack();
  // C3+G3 chord, dotted half in each measure
  left.addNote({ midi: 48, ticks: 0, durationTicks: ppq * 3 });
  left.addNote({ midi: 55, ticks: 0, durationTicks: ppq * 3 });
  left.addNote({ midi: 48, ticks: ppq * 3, durationTicks: ppq * 3 });

  return new Uint8Array(midi.toArray());
}

describe('quantize', () => {
  it('snaps onsets and durations to the 16th grid', () => {
    const midi = new Midi();
    const ppq = midi.header.ppq;
    const t = midi.addTrack();
    t.addNote({ midi: 60, ticks: Math.round(ppq / 4 + ppq / 64), durationTicks: ppq - 5 });
    const parsed = parseMidi(new Uint8Array(midi.toArray()));
    const q = quantize(parsed);
    expect(q.notes[0].onset).toBe(1); // one 16th in
    expect(q.notes[0].duration).toBe(4); // one quarter = 4 sixteenths
  });

  it('never produces zero-length notes', () => {
    const midi = new Midi();
    const t = midi.addTrack();
    t.addNote({ midi: 60, ticks: 0, durationTicks: 1 });
    const parsed = parseMidi(new Uint8Array(midi.toArray()));
    const q = quantize(parsed);
    expect(q.notes[0].duration).toBeGreaterThanOrEqual(1);
  });
});

describe('splitHands', () => {
  it('uses tracks when there are two of them', () => {
    const parsed = parseMidi(makeTwoHandMidi());
    const split = splitHands(quantize(parsed));
    expect(split.usedPitchHeuristic).toBe(false);
    expect(split.notes.filter((n) => n.staff === 1).every((n) => n.midi >= 72)).toBe(true);
    expect(split.notes.filter((n) => n.staff === 2).every((n) => n.midi <= 55)).toBe(true);
  });

  it('splits a single track around middle C keeping chords together', () => {
    const midi = new Midi();
    const ppq = midi.header.ppq;
    const t = midi.addTrack();
    t.addNote({ midi: 71, ticks: 0, durationTicks: ppq });
    t.addNote({ midi: 40, ticks: ppq, durationTicks: ppq });
    // A chord straddling middle C but close together stays in one hand
    t.addNote({ midi: 59, ticks: ppq * 2, durationTicks: ppq });
    t.addNote({ midi: 62, ticks: ppq * 2, durationTicks: ppq });
    const split = splitHands(quantize(parseMidi(new Uint8Array(midi.toArray()))));
    expect(split.usedPitchHeuristic).toBe(true);
    const staffOf = (m: number, onset: number) =>
      split.notes.find((n) => n.midi === m && n.onset === onset)!.staff;
    expect(staffOf(71, 0)).toBe(1);
    expect(staffOf(40, 4)).toBe(2);
    expect(staffOf(59, 8)).toBe(staffOf(62, 8)); // chord not torn apart
  });
});

describe('spelling', () => {
  it('spells with flats in flat keys and sharps in sharp keys', () => {
    expect(spellMidi(63, -3)).toMatchObject({ step: 'E', alter: -1, octave: 4 }); // Eb4
    expect(spellMidi(63, 2)).toMatchObject({ step: 'D', alter: 1, octave: 4 }); // D#4
    expect(spellMidi(60, 0)).toMatchObject({ step: 'C', alter: 0, octave: 4 });
  });

  it('estimates a flat key from flat-heavy content', () => {
    const midi = new Midi();
    const ppq = midi.header.ppq;
    const t = midi.addTrack();
    // Eb major scale fragment: Eb F G Ab Bb
    [63, 65, 67, 68, 70].forEach((m, i) => t.addNote({ midi: m, ticks: i * ppq, durationTicks: ppq }));
    const { fifths } = estimateFifths(parseMidi(new Uint8Array(midi.toArray())));
    expect(fifths).toBeLessThan(0);
  });
});

describe('midiToMusicXML end-to-end', () => {
  it('produces valid two-staff MusicXML with correct backup arithmetic', () => {
    const { xml, warnings } = midiToMusicXML(makeTwoHandMidi(), 'test.mid');
    expect(warnings.length).toBeGreaterThan(0);

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelector('score-partwise')).not.toBeNull();

    const measures = doc.querySelectorAll('measure');
    expect(measures.length).toBe(2);

    // 3/4 time from the MIDI meta event
    expect(doc.querySelector('time > beats')?.textContent).toBe('3');
    expect(doc.querySelector('time > beat-type')?.textContent).toBe('4');
    expect(doc.querySelector('attributes > staves')?.textContent).toBe('2');

    // Each measure: staff-1 note durations sum to measure length (12 units in 3/4)
    for (const m of Array.from(measures)) {
      const notes = Array.from(m.querySelectorAll('note'));
      const staff1 = notes.filter((n) => n.querySelector('staff')?.textContent === '1');
      const sum = staff1
        .filter((n) => !n.querySelector('chord'))
        .reduce((acc, n) => acc + parseInt(n.querySelector('duration')?.textContent ?? '0', 10), 0);
      expect(sum).toBe(12);
      const backup = m.querySelector('backup > duration');
      expect(backup?.textContent).toBe('12');
    }

    // The left-hand chord is written with <chord/> on the second note
    const chordNotes = doc.querySelectorAll('note > chord');
    expect(chordNotes.length).toBeGreaterThan(0);

    // Tempo captured
    expect(doc.querySelector('sound[tempo]')?.getAttribute('tempo')).toBe('100');
  });

  it('ties notes across barlines', () => {
    const midi = new Midi();
    const ppq = midi.header.ppq;
    const t = midi.addTrack();
    // A whole note starting on beat 4 of a 4/4 measure crosses the barline.
    t.addNote({ midi: 60, ticks: ppq * 3, durationTicks: ppq * 4 });
    const { xml } = midiToMusicXML(new Uint8Array(midi.toArray()), 'tie.mid');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.querySelectorAll('tie[type="start"]').length).toBeGreaterThan(0);
    expect(doc.querySelectorAll('tie[type="stop"]').length).toBeGreaterThan(0);
  });

  it('throws for MIDI without notes', () => {
    const midi = new Midi();
    midi.addTrack();
    expect(() => midiToMusicXML(new Uint8Array(midi.toArray()), 'empty.mid')).toThrow(/no notes/i);
  });
});
