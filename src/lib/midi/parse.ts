import { Midi } from '@tonejs/midi';
import type { ParsedMidi, RawMidiNote } from './types';

export function parseMidi(bytes: Uint8Array): ParsedMidi {
  const midi = new Midi(bytes);
  const notes: RawMidiNote[] = [];
  let noteTrackCount = 0;

  midi.tracks.forEach((track, trackIndex) => {
    if (track.notes.length === 0) return;
    noteTrackCount += 1;
    for (const n of track.notes) {
      notes.push({
        midi: n.midi,
        ticks: n.ticks,
        durationTicks: n.durationTicks,
        velocity: n.velocity,
        track: trackIndex,
      });
    }
  });

  notes.sort((a, b) => a.ticks - b.ticks || a.midi - b.midi);

  return {
    ppq: midi.header.ppq,
    name: midi.header.name || undefined,
    notes,
    tempos: midi.header.tempos.map((t) => ({ ticks: t.ticks, bpm: t.bpm })),
    timeSigs: midi.header.timeSignatures.map((ts) => ({
      ticks: ts.ticks,
      num: ts.timeSignature[0],
      den: ts.timeSignature[1],
    })),
    keySigs: midi.header.keySignatures.map((ks) => ({
      ticks: ks.ticks,
      key: ks.key,
      scale: ks.scale,
    })),
    noteTrackCount,
  };
}
