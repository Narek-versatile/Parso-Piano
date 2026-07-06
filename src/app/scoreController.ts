/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { extractFromXml } from '../lib/score/extractFromXml';
import type { NoteEvent, ScoreModel } from '../lib/score/model';
import { buildOsmdMaps, type OsmdMaps } from '../lib/score/osmdMapping';
import { buildTimeline, type Timeline, type TimelineStep } from '../lib/score/timeline';
import { analyzeMoment } from '../lib/theory/analyze';
import { explainSelection } from '../explain';
import { PlaybackController } from '../lib/audio/playback';
import { playNow } from '../lib/audio/samplerEngine';
import { useAppStore } from './store';

/**
 * Owns the OSMD instance, note mappings and playback — everything stateful
 * that doesn't belong in React. Components call into the singleton.
 */
class ScoreController {
  private osmd: OpenSheetMusicDisplay | null = null;
  private maps: OsmdMaps | null = null;
  private timeline: Timeline | null = null;
  private model: ScoreModel | null = null;
  private playback = new PlaybackController();
  private cursorStep = -1;
  private playingSvgs: SVGGElement[] = [];
  private container: HTMLElement | null = null;

  attach(container: HTMLElement): void {
    if (this.osmd && this.container === container) return;
    this.container = container;
    this.osmd = new OpenSheetMusicDisplay(container, {
      backend: 'svg',
      autoResize: false, // we re-render manually so we can rebuild note maps
      drawTitle: true,
      drawCredits: false,
      drawPartNames: false,
      followCursor: true,
      cursorsOptions: [{ type: 0, color: '#7c5cff', alpha: 0.45, follow: true }],
    });
  }

  get hasScore(): boolean {
    return !!this.model;
  }

  async loadXml(xml: string, source: 'musicxml' | 'midi', fileName: string, extraWarnings: string[]): Promise<void> {
    if (!this.osmd) throw new Error('Score view is not ready yet.');
    const store = useAppStore.getState();
    this.stop();

    const model = extractFromXml(xml, source, fileName);
    await this.osmd.load(xml);
    this.applyZoom(useAppStore.getState().zoom, false);
    this.osmd.render();

    this.model = model;
    this.rebuildMaps();
    this.timeline = buildTimeline(this.osmd, model, this.maps!.sourceToNote);
    this.playback.load(this.timeline, {
      onStep: (step) => this.onPlaybackStep(step),
      onFinished: () => this.onPlaybackFinished(),
    });

    store.set({
      loadStatus: 'ready',
      model,
      fileName,
      warnings: [...extraWarnings, ...model.warnings],
      selectedNote: null,
      analysis: null,
      sections: [],
      selectedMidi: null,
      chordMidis: [],
      activeMidis: [],
      playState: 'stopped',
      errorMessage: undefined,
    });
  }

  /** Re-render (resize/zoom) and rebuild all graphical mappings. */
  rerender(): void {
    if (!this.osmd || !this.model) return;
    try {
      this.osmd.render();
    } catch {
      return;
    }
    this.rebuildMaps();
    // Re-apply selection highlight to the fresh SVG.
    const selected = useAppStore.getState().selectedNote;
    if (selected) this.applySelectionClasses(selected);
  }

  applyZoom(zoom: number, render = true): void {
    if (!this.osmd) return;
    const clamped = Math.min(2.5, Math.max(0.4, zoom));
    (this.osmd as any).Zoom = clamped;
    useAppStore.getState().set({ zoom: clamped });
    if (render && this.model) this.rerender();
  }

  private rebuildMaps(): void {
    if (!this.osmd || !this.model) return;
    this.maps = buildOsmdMaps(this.osmd, this.model);
  }

  /** Click position in OSMD units (10 px per unit, scaled by zoom). */
  private clickToUnits(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = this.container?.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const zoom = (this.osmd as any)?.Zoom ?? 1;
    return { x: (clientX - rect.left) / (10 * zoom), y: (clientY - rect.top) / (10 * zoom) };
  }

  /** Resolve a click/tap on the score to a note, via SVG tag or proximity. */
  noteFromClick(target: Element | null, clientX: number, clientY: number): NoteEvent | null {
    if (!this.osmd || !this.maps || !this.model) return null;
    const units = this.clickToUnits(clientX, clientY);

    const tagged = target?.closest?.('[data-note-id]');
    if (tagged) {
      const id = tagged.getAttribute('data-note-id')!;
      const byId = this.model.notes.find((n) => n.id === id);
      if (byId) return this.refineChordPick(byId, units?.y);
    }

    // Proximity fallback (helps on mobile where glyphs are small).
    try {
      if (!units) return null;
      const gms: any = (this.osmd as any).GraphicSheet;
      const nearest = gms?.GetNearestNote?.({ x: units.x, y: units.y }, { x: 5, y: 5 });
      const src = nearest?.sourceNote;
      if (src) {
        const event = this.maps.sourceToNote.get(src) ?? null;
        return event ? this.refineChordPick(event, units.y) : null;
      }
    } catch {
      /* proximity search is best-effort */
    }
    return null;
  }

  /**
   * All noteheads of one stem share a single SVG group, so a tagged hit may
   * name the wrong chord member — pick the one whose notehead is vertically
   * closest to the click.
   */
  private refineChordPick(note: NoteEvent, unitY: number | undefined): NoteEvent {
    if (unitY === undefined || !this.model || !this.maps) return note;
    const siblings = this.model.notes.filter((n) => n.chordGroupId === note.chordGroupId);
    if (siblings.length <= 1) return note;
    let best = note;
    let bestDist = Infinity;
    for (const sib of siblings) {
      const gNote: any = this.maps.idToGraphical.get(sib.id);
      const y = gNote?.PositionAndShape?.AbsolutePosition?.y;
      if (typeof y !== 'number') continue;
      const dist = Math.abs(y - unitY);
      if (dist < bestDist) {
        bestDist = dist;
        best = sib;
      }
    }
    return best;
  }

  selectNote(note: NoteEvent | null, hear = true): void {
    const store = useAppStore.getState();
    if (!this.model) return;

    if (!note) {
      this.clearSelectionClasses();
      store.set({ selectedNote: null, analysis: null, sections: [], selectedMidi: null, chordMidis: [] });
      return;
    }

    const analysis = analyzeMoment(this.model, note);
    const sections = explainSelection(this.model, note, analysis, store.audience);
    this.applySelectionClasses(note);

    store.set({
      selectedNote: note,
      analysis,
      sections,
      selectedMidi: note.pitch?.midi ?? null,
      chordMidis: analysis.soundingNotes.map((n) => n.midi),
      sheetExpanded: false,
    });

    if (hear && note.pitch) {
      void playNow([note.pitch.name]);
    }
  }

  /** Recompute explanation prose after an audience toggle. */
  refreshSections(): void {
    const store = useAppStore.getState();
    if (!this.model || !store.selectedNote || !store.analysis) return;
    store.set({
      sections: explainSelection(this.model, store.selectedNote, store.analysis, store.audience),
    });
  }

  hearSelectedNote(): void {
    const note = useAppStore.getState().selectedNote;
    if (note?.pitch) void playNow([note.pitch.name]);
  }

  hearSelectedChord(): void {
    const analysis = useAppStore.getState().analysis;
    if (analysis && analysis.soundingNotes.length > 0) {
      void playNow(analysis.soundingNotes.map((n) => n.name), 1.4);
    }
  }

  private applySelectionClasses(note: NoteEvent): void {
    this.clearSelectionClasses();
    if (!this.maps) return;
    const el = this.maps.idToSvg.get(note.id);
    el?.classList.add('pp-selected');
    // Softer highlight for the rest of the sounding chord.
    const analysis = useAppStore.getState().analysis;
    const chordIds = this.model && analysis
      ? this.model.notes
          .filter((n) => !n.isRest && !!n.pitch &&
            n.onsetBeats <= note.onsetBeats + 1e-6 &&
            n.onsetBeats + n.durationBeats > note.onsetBeats + 1e-6 &&
            n.id !== note.id)
          .map((n) => n.id)
      : [];
    for (const id of chordIds) this.maps.idToSvg.get(id)?.classList.add('pp-chord');
  }

  private clearSelectionClasses(): void {
    this.container?.querySelectorAll('.pp-selected, .pp-chord').forEach((el) => {
      el.classList.remove('pp-selected', 'pp-chord');
    });
  }

  // ----- Playback -----

  async play(): Promise<void> {
    if (!this.osmd || !this.timeline) return;
    const store = useAppStore.getState();
    if (this.playback.state === 'stopped') {
      this.cursorStep = -1;
      try {
        this.osmd.cursor?.reset();
        this.osmd.cursor?.show();
      } catch {
        /* cursor is cosmetic */
      }
    }
    await this.playback.play();
    store.set({ playState: 'playing' });
  }

  pause(): void {
    this.playback.pause();
    useAppStore.getState().set({ playState: 'paused' });
  }

  stop(): void {
    this.playback.stop();
    this.clearPlayingClasses();
    this.cursorStep = -1;
    try {
      this.osmd?.cursor?.hide();
    } catch {
      /* ignore */
    }
    useAppStore.getState().set({ playState: 'stopped', activeMidis: [] });
  }

  setTempoFactor(factor: number): void {
    this.playback.setTempoFactor(factor);
    useAppStore.getState().set({ tempoFactor: this.playback.tempoFactor });
  }

  private onPlaybackStep(step: TimelineStep): void {
    // Advance the OSMD cursor to this step (one cursor.next() per step).
    try {
      const cursor: any = this.osmd?.cursor;
      if (cursor) {
        if (step.index <= this.cursorStep) {
          cursor.reset();
          this.cursorStep = -1;
        }
        while (this.cursorStep < step.index) {
          if (this.cursorStep >= 0) cursor.next();
          this.cursorStep += 1;
        }
        cursor.show();
      }
    } catch {
      /* cursor is cosmetic */
    }

    this.clearPlayingClasses();
    if (this.maps && this.model) {
      for (const id of step.activeNoteIds) {
        const el = this.maps.idToSvg.get(id);
        if (el) {
          el.classList.add('pp-playing');
          this.playingSvgs.push(el);
        }
      }
    }

    const midis = step.activeNoteIds
      .map((id) => this.model?.notes.find((n) => n.id === id)?.pitch?.midi)
      .filter((m): m is number => typeof m === 'number');
    useAppStore.getState().set({ activeMidis: [...new Set(midis)] });
  }

  private onPlaybackFinished(): void {
    this.stop();
  }

  private clearPlayingClasses(): void {
    for (const el of this.playingSvgs) el.classList.remove('pp-playing');
    this.playingSvgs = [];
  }
}

export const scoreController = new ScoreController();

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__pp = scoreController;
}
