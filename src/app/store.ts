import { create } from 'zustand';
import type { ScoreModel, NoteEvent } from '../lib/score/model';
import type { ChordAnalysis } from '../lib/theory/analyze';
import type { Audience, ExplainSection } from '../explain';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PlayState = 'stopped' | 'playing' | 'paused';
export type AppView = 'score' | 'learn' | 'cheatsheet';
export type KeyboardSize = 's' | 'm' | 'l' | 'focus';
export type InputStatus = 'off' | 'midi' | 'mic';
export type PracticeState = 'off' | 'waiting' | 'done';

export interface AppState {
  loadStatus: LoadStatus;
  errorMessage?: string;
  fileName: string | null;
  model: ScoreModel | null;
  warnings: string[];

  selectedNote: NoteEvent | null;
  analysis: ChordAnalysis | null;
  sections: ExplainSection[];
  /** MIDI numbers highlighted on the keyboard for the selection */
  selectedMidi: number | null;
  chordMidis: number[];

  audience: Audience;
  playState: PlayState;
  tempoFactor: number;
  /** MIDI numbers currently sounding during playback */
  activeMidis: number[];
  /** Mobile bottom-sheet expanded */
  sheetExpanded: boolean;
  zoom: number;

  view: AppView;
  keyboardSize: KeyboardSize;
  /** Real-piano input (Web MIDI / microphone) */
  inputStatus: InputStatus;
  inputDeviceName: string | null;
  /** Last note received from the real piano (for UI feedback) */
  lastInputMidi: number | null;
  practice: {
    state: PracticeState;
    stepIndex: number;
    totalSteps: number;
    correct: number;
    wrong: number;
    /** MIDI numbers still needed to complete the current step */
    expectedMidis: number[];
  };

  set: (partial: Partial<AppState>) => void;
  reset: () => void;
}

const initial = {
  loadStatus: 'idle' as LoadStatus,
  errorMessage: undefined,
  fileName: null,
  model: null,
  warnings: [],
  selectedNote: null,
  analysis: null,
  sections: [],
  selectedMidi: null,
  chordMidis: [],
  audience: 'beginner' as Audience,
  playState: 'stopped' as PlayState,
  tempoFactor: 1,
  activeMidis: [],
  sheetExpanded: false,
  zoom: 1,
  view: 'score' as AppView,
  keyboardSize: 'm' as KeyboardSize,
  inputStatus: 'off' as InputStatus,
  inputDeviceName: null,
  lastInputMidi: null,
  practice: {
    state: 'off' as PracticeState,
    stepIndex: 0,
    totalSteps: 0,
    correct: 0,
    wrong: 0,
    expectedMidis: [],
  },
};

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  set: (partial) => set(partial),
  reset: () => set({ ...initial }),
}));
