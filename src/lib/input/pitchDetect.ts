/**
 * Single-note pitch detection via normalized autocorrelation (McLeod-style).
 * Good enough for one note at a time from a microphone; NOT polyphonic.
 */

export interface PitchResult {
  /** Frequency in Hz, or null when no confident pitch */
  frequency: number | null;
  clarity: number;
}

export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult {
  const n = buffer.length;

  // Reject silence.
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return { frequency: null, clarity: 0 };

  // Piano range of interest: A0 (27.5 Hz) .. C7 (~2093 Hz).
  const half = Math.floor(n / 2);
  const minLag = Math.floor(sampleRate / 2100);
  const maxLag = Math.min(Math.floor(sampleRate / 50), half - 1);

  // Normalized autocorrelation for every candidate lag.
  const corr = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < half; i++) {
      const a = buffer[i];
      const b = buffer[i + lag];
      sum += a * b;
      normA += a * a;
      normB += b * b;
    }
    corr[lag] = sum / (Math.sqrt(normA * normB) || 1);
  }

  let globalMax = 0;
  for (let lag = minLag; lag <= maxLag; lag++) globalMax = Math.max(globalMax, corr[lag]);
  if (globalMax < 0.85) return { frequency: null, clarity: globalMax };

  // Autocorrelation also peaks at multiples of the true period (octave
  // errors) — take the FIRST local peak close to the global maximum.
  let bestLag = -1;
  const threshold = 0.93 * globalMax;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corr[lag] >= threshold && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 0) return { frequency: null, clarity: globalMax };

  // Parabolic interpolation for sub-sample accuracy.
  let refined = bestLag;
  const y1 = corr[bestLag - 1];
  const y2 = corr[bestLag];
  const y3 = corr[bestLag + 1];
  const denom = y1 - 2 * y2 + y3;
  if (Math.abs(denom) > 1e-9) refined = bestLag + (0.5 * (y1 - y3)) / denom;

  return { frequency: sampleRate / refined, clarity: corr[bestLag] };
}

export function frequencyToMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}
