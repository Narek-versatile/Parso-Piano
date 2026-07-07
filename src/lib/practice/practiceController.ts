/* eslint-disable @typescript-eslint/no-explicit-any */
import { subscribeNotes } from '../input/pianoInput';
import { useAppStore } from '../../app/store';
import type { Timeline } from '../score/timeline';

/**
 * Play-along practice: steps through the score's timeline waiting for the
 * player to play each step's notes on a real piano (MIDI or mic). Untimed —
 * the cursor waits for you; wrong notes are counted but don't block.
 */
export class PracticeController {
  private timeline: Timeline | null = null;
  private osmd: any = null;
  private getMidisForStep: ((stepIndex: number) => number[]) | null = null;
  private unsubscribe: (() => void) | null = null;
  private stepIndex = 0;
  private remaining = new Set<number>();
  private cursorStep = -1;
  /** Steps that actually require notes (tied continuations are skipped) */
  private playableSteps: number[] = [];

  get active(): boolean {
    return this.unsubscribe !== null;
  }

  start(osmd: any, timeline: Timeline, getMidisForStep: (stepIndex: number) => number[]): void {
    this.stop();
    this.osmd = osmd;
    this.timeline = timeline;
    this.getMidisForStep = getMidisForStep;
    this.playableSteps = timeline.steps
      .filter((s) => getMidisForStep(s.index).length > 0)
      .map((s) => s.index);

    if (this.playableSteps.length === 0) return;

    useAppStore.getState().set({
      practice: {
        state: 'waiting',
        stepIndex: 0,
        totalSteps: this.playableSteps.length,
        correct: 0,
        wrong: 0,
        expectedMidis: [],
      },
    });

    this.stepIndex = 0;
    this.unsubscribe = subscribeNotes((midi) => this.onNote(midi));
    try {
      this.osmd.cursor?.reset();
      this.osmd.cursor?.show();
    } catch {
      /* cursor is cosmetic */
    }
    this.cursorStep = -1;
    this.enterStep();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    try {
      this.osmd?.cursor?.hide();
    } catch {
      /* ignore */
    }
    const p = useAppStore.getState().practice;
    if (p.state === 'waiting') {
      useAppStore.getState().set({ practice: { ...p, state: 'off', expectedMidis: [] } });
    }
  }

  private enterStep(): void {
    const target = this.playableSteps[this.stepIndex];
    this.remaining = new Set(this.getMidisForStep!(target));

    // Advance the visual cursor to this timeline step.
    try {
      const cursor = this.osmd?.cursor;
      if (cursor) {
        while (this.cursorStep < target) {
          if (this.cursorStep >= 0) cursor.next();
          this.cursorStep += 1;
        }
      }
    } catch {
      /* cursor is cosmetic */
    }

    const p = useAppStore.getState().practice;
    useAppStore.getState().set({
      practice: { ...p, stepIndex: this.stepIndex, expectedMidis: [...this.remaining] },
      chordMidis: [...this.remaining],
      selectedMidi: null,
    });
  }

  private onNote(midi: number): void {
    if (!this.timeline) return;
    const store = useAppStore.getState();
    const p = store.practice;
    if (p.state !== 'waiting') return;

    if (this.remaining.has(midi)) {
      this.remaining.delete(midi);
      const done = this.remaining.size === 0;
      if (done) {
        const nextIndex = this.stepIndex + 1;
        if (nextIndex >= this.playableSteps.length) {
          store.set({
            practice: { ...p, state: 'done', correct: p.correct + 1, expectedMidis: [] },
            chordMidis: [],
          });
          this.unsubscribe?.();
          this.unsubscribe = null;
          return;
        }
        store.set({ practice: { ...p, correct: p.correct + 1 } });
        this.stepIndex = nextIndex;
        this.enterStep();
      } else {
        store.set({ practice: { ...p, expectedMidis: [...this.remaining] } });
      }
    } else {
      store.set({ practice: { ...p, wrong: p.wrong + 1 } });
    }
  }
}

export const practiceController = new PracticeController();
