/* eslint-disable @typescript-eslint/no-explicit-any */
import { detectPitch, frequencyToMidi } from './pitchDetect';
import { useAppStore } from '../../app/store';

/**
 * Unified real-piano input: Web MIDI (notes, chords, timing — reliable) or
 * microphone pitch detection (single notes only, experimental).
 * Subscribers receive note-on events as MIDI numbers.
 */

type NoteListener = (midi: number, velocity: number) => void;

const listeners = new Set<NoteListener>();
let midiAccess: any = null;
let micStream: MediaStream | null = null;
let micRafId = 0;
let micContext: AudioContext | null = null;

export function subscribeNotes(listener: NoteListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(midi: number, velocity: number): void {
  useAppStore.getState().set({ lastInputMidi: midi });
  for (const l of listeners) l(midi, velocity);
}

if (import.meta.env.DEV) {
  // Test hook: lets browser automation simulate played notes.
  (window as any).__ppEmitNote = (midi: number) => emit(midi, 0.8);
}

// ----- Web MIDI -----

export async function enableMidi(): Promise<void> {
  const nav = navigator as any;
  if (!nav.requestMIDIAccess) {
    throw new Error('Web MIDI is not supported in this browser (try Chrome or Edge).');
  }
  disableInput();
  midiAccess = await nav.requestMIDIAccess();

  const attach = () => {
    const inputs = [...midiAccess.inputs.values()];
    for (const input of inputs) {
      input.onmidimessage = (msg: any) => {
        const [status, note, velocity] = msg.data;
        const command = status & 0xf0;
        if (command === 0x90 && velocity > 0) emit(note, velocity / 127);
      };
    }
    const name = inputs.length > 0 ? inputs.map((i: any) => i.name).join(', ') : null;
    useAppStore.getState().set({
      inputStatus: 'midi',
      inputDeviceName: name ?? 'No MIDI device connected yet — plug one in',
    });
  };

  attach();
  midiAccess.onstatechange = attach;
}

// ----- Microphone (experimental, single notes) -----

export async function enableMic(): Promise<void> {
  disableInput();
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  micContext = new AudioContext();
  const source = micContext.createMediaStreamSource(micStream);
  const analyser = micContext.createAnalyser();
  analyser.fftSize = 4096;
  source.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);

  // A note fires after 3 consistent frames, then holds until silence/new pitch.
  let stableMidi = -1;
  let stableCount = 0;
  let heldMidi = -1;

  const loop = () => {
    analyser.getFloatTimeDomainData(buffer);
    const { frequency } = detectPitch(buffer, micContext!.sampleRate);
    if (frequency === null) {
      stableMidi = -1;
      stableCount = 0;
      heldMidi = -1;
    } else {
      const midi = frequencyToMidi(frequency);
      if (midi === stableMidi) stableCount += 1;
      else {
        stableMidi = midi;
        stableCount = 1;
      }
      if (stableCount === 3 && midi !== heldMidi) {
        heldMidi = midi;
        emit(midi, 0.8);
      }
    }
    micRafId = requestAnimationFrame(loop);
  };
  micRafId = requestAnimationFrame(loop);

  useAppStore.getState().set({ inputStatus: 'mic', inputDeviceName: 'Microphone (single notes, experimental)' });
}

export function disableInput(): void {
  if (midiAccess) {
    for (const input of midiAccess.inputs.values()) input.onmidimessage = null;
    midiAccess.onstatechange = null;
    midiAccess = null;
  }
  if (micRafId) cancelAnimationFrame(micRafId);
  micRafId = 0;
  if (micStream) {
    for (const track of micStream.getTracks()) track.stop();
    micStream = null;
  }
  if (micContext) {
    void micContext.close();
    micContext = null;
  }
  useAppStore.getState().set({ inputStatus: 'off', inputDeviceName: null, lastInputMidi: null });
}
