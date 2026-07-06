import * as Tone from 'tone';
import type { Timeline, TimelineStep } from '../score/timeline';
import { ensureAudio } from './samplerEngine';

export type PlayState = 'stopped' | 'playing' | 'paused';

export interface PlaybackHooks {
  /** Fired on the UI thread when a timeline step becomes current */
  onStep: (step: TimelineStep) => void;
  onFinished: () => void;
}

/**
 * Schedules a Timeline on Tone.Transport. The transport runs at a fixed base
 * BPM of 120 and events are scheduled in score-seconds, so the user tempo
 * factor is applied by scaling the transport BPM (scales past and future
 * events uniformly, even mid-playback).
 */
export class PlaybackController {
  private timeline: Timeline | null = null;
  private hooks: PlaybackHooks | null = null;
  private scheduled: number[] = [];
  private factor = 1;
  private _state: PlayState = 'stopped';

  get state(): PlayState {
    return this._state;
  }

  get tempoFactor(): number {
    return this.factor;
  }

  load(timeline: Timeline, hooks: PlaybackHooks): void {
    this.stop();
    this.timeline = timeline;
    this.hooks = hooks;
  }

  setTempoFactor(factor: number): void {
    this.factor = Math.min(2, Math.max(0.25, factor));
    Tone.getTransport().bpm.value = 120 * this.factor;
  }

  async play(): Promise<void> {
    if (!this.timeline || this.timeline.steps.length === 0) return;
    const instrument = await ensureAudio();
    const transport = Tone.getTransport();

    if (this._state === 'paused') {
      transport.start();
      this._state = 'playing';
      return;
    }

    this.clearSchedule();
    transport.stop();
    transport.position = 0;
    transport.bpm.value = 120 * this.factor;

    for (const step of this.timeline.steps) {
      const id = transport.schedule((time) => {
        for (const n of step.notesToPlay) {
          // Durations shrink/grow with the live tempo factor.
          const dur = Math.max(0.05, n.durationSeconds / this.factor);
          instrument.triggerAttackRelease(n.name, dur, time, 0.8);
        }
        Tone.getDraw().schedule(() => this.hooks?.onStep(step), time);
      }, step.seconds);
      this.scheduled.push(id);
    }

    const endId = transport.schedule((time) => {
      Tone.getDraw().schedule(() => {
        this.stop();
        this.hooks?.onFinished();
      }, time);
    }, this.timeline.totalSeconds + 0.3);
    this.scheduled.push(endId);

    transport.start('+0.05');
    this._state = 'playing';
  }

  pause(): void {
    if (this._state !== 'playing') return;
    Tone.getTransport().pause();
    this._state = 'paused';
  }

  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    this.clearSchedule();
    this._state = 'stopped';
  }

  private clearSchedule(): void {
    const transport = Tone.getTransport();
    for (const id of this.scheduled) transport.clear(id);
    this.scheduled = [];
  }
}
