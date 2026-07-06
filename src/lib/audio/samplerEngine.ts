import * as Tone from 'tone';

export type Instrument = Tone.Sampler | Tone.PolySynth;

let instrument: Instrument | null = null;
let loadingPromise: Promise<Instrument> | null = null;

/** Sampled pitches available in public/audio/piano/ (Salamander subset). */
const SAMPLE_PITCHES = ['A1', 'C2', 'D#2', 'F#2', 'A2', 'C3', 'D#3', 'F#3', 'A3', 'C4', 'D#4', 'F#4', 'A4', 'C5', 'D#5', 'F#5', 'A5', 'C6', 'D#6', 'F#6', 'A6', 'C7'];

function sampleBaseUrl(): string {
  return `${import.meta.env.BASE_URL}audio/piano/`;
}

async function samplesAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${sampleBaseUrl()}C4.mp3`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function createFallbackSynth(): Tone.PolySynth {
  // A soft triangle-based synth stands in when piano samples are unavailable.
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle8' },
    envelope: { attack: 0.004, decay: 0.35, sustain: 0.15, release: 1.4 },
    volume: -8,
  }).toDestination();
  synth.maxPolyphony = 64;
  return synth;
}

function createSampler(): Promise<Instrument> {
  return new Promise((resolve) => {
    const urls: Record<string, string> = {};
    for (const p of SAMPLE_PITCHES) urls[p] = `${p.replace('#', 's')}.mp3`;
    const timer = setTimeout(() => resolve(createFallbackSynth()), 12000);
    const sampler = new Tone.Sampler({
      urls,
      baseUrl: sampleBaseUrl(),
      release: 1.2,
      onload: () => {
        clearTimeout(timer);
        resolve(sampler.toDestination());
      },
      onerror: () => {
        clearTimeout(timer);
        resolve(createFallbackSynth());
      },
    });
  });
}

/** Initialize audio after a user gesture; resolves to a ready instrument. */
export async function ensureAudio(): Promise<Instrument> {
  await Tone.start();
  if (instrument) return instrument;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      instrument = (await samplesAvailable()) ? await createSampler() : createFallbackSynth();
      return instrument;
    })();
  }
  return loadingPromise;
}

/** Play notes immediately (click-to-hear). */
export async function playNow(noteNames: string[], durationSeconds = 1.1): Promise<void> {
  if (noteNames.length === 0) return;
  const inst = await ensureAudio();
  inst.triggerAttackRelease(noteNames, durationSeconds, Tone.now(), 0.85);
}
