import { describe, expect, it } from 'vitest';
import { detectPitch, frequencyToMidi } from '../pitchDetect';

function sine(frequency: number, sampleRate: number, length: number, amplitude = 0.4): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) buf[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  return buf;
}

describe('detectPitch', () => {
  const SR = 44100;

  it('detects A4 = 440 Hz', () => {
    const { frequency } = detectPitch(sine(440, SR, 4096), SR);
    expect(frequency).not.toBeNull();
    expect(Math.abs(frequency! - 440)).toBeLessThan(3);
    expect(frequencyToMidi(frequency!)).toBe(69);
  });

  it('detects a low C3 and a high C6', () => {
    const c3 = detectPitch(sine(130.81, SR, 4096), SR);
    expect(frequencyToMidi(c3.frequency!)).toBe(48);
    const c6 = detectPitch(sine(1046.5, SR, 4096), SR);
    expect(frequencyToMidi(c6.frequency!)).toBe(84);
  });

  it('handles a piano-like tone with harmonics', () => {
    const base = sine(261.63, SR, 4096, 0.35);
    const h2 = sine(523.25, SR, 4096, 0.15);
    const h3 = sine(784.88, SR, 4096, 0.08);
    const mix = base.map((v, i) => v + h2[i] + h3[i]);
    const { frequency } = detectPitch(Float32Array.from(mix), SR);
    expect(frequencyToMidi(frequency!)).toBe(60); // C4
  });

  it('returns null for silence and noise', () => {
    expect(detectPitch(new Float32Array(4096), SR).frequency).toBeNull();
    const noise = new Float32Array(4096).map(() => (Math.random() - 0.5) * 0.6);
    expect(detectPitch(noise, SR).frequency).toBeNull();
  });
});
