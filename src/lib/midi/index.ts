import { parseMidi } from './parse';
import { quantize } from './quantize';
import { splitHands } from './splitHands';
import { estimateFifths } from './spell';
import { buildMeasures } from './buildMeasures';
import { serializeMusicXML } from './toMusicXML';

export interface MidiConversion {
  xml: string;
  warnings: string[];
}

/**
 * Convert a Standard MIDI File into a two-staff piano MusicXML document.
 * The conversion is intentionally conservative (16th-note grid, no tuplets,
 * one voice per staff) and reports its approximations as warnings.
 */
export function midiToMusicXML(bytes: Uint8Array, fileName: string): MidiConversion {
  const warnings: string[] = [];
  const parsed = parseMidi(bytes);
  if (parsed.notes.length === 0) {
    throw new Error('This MIDI file contains no notes.');
  }

  const quantized = quantize(parsed);
  if (quantized.displacedRatio > 0.15) {
    warnings.push(
      'Many notes were shifted onto a 16th-note grid — this MIDI likely contains swing, rubato or tuplets, so the notation is approximate.',
    );
  }

  const split = splitHands(quantized);
  if (split.usedPitchHeuristic) {
    warnings.push(
      'Single-track MIDI: notes were split between the two staves around middle C, which may not match the original hand assignment.',
    );
  }

  const { fifths, estimated } = estimateFifths(parsed);
  if (estimated) {
    warnings.push('No key signature found in the MIDI file — the key was estimated from the notes.');
  }

  const { measures, clippedCount } = buildMeasures(split.notes, parsed, fifths);
  if (clippedCount > 0) {
    warnings.push(
      `${clippedCount} overlapping or uneven chord durations were adjusted (each staff is written as a single voice).`,
    );
  }

  warnings.push(
    'Converted from MIDI: articulation marks, dynamics and pedal are not present in MIDI files, so those explanations are unavailable for this score.',
  );

  const title = parsed.name || fileName.replace(/\.(mid|midi)$/i, '');
  const xml = serializeMusicXML(measures, fifths, title);
  return { xml, warnings };
}

export { parseMidi } from './parse';
export { quantize } from './quantize';
export { splitHands } from './splitHands';
export { estimateFifths, spellMidi } from './spell';
export { buildMeasures } from './buildMeasures';
export { serializeMusicXML } from './toMusicXML';
