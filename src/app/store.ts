import { create } from 'zustand';
import type { ScoreModel, NoteEvent } from '../lib/score/model';
import type { ChordAnalysis } from '../lib/theory/analyze';
import type { Audience, ExplainSection } from '../explain';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PlayState = 'stopped' | 'playing' | 'paused';

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
};

export const useAppStore = create<AppState>((set) => ({
  ...initial,
  set: (partial) => set(partial),
  reset: () => set({ ...initial }),
}));
