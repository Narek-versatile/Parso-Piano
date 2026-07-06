import type {
  ClefType,
  DynamicEvent,
  MeasureInfo,
  NoteEvent,
  ScoreModel,
  TempoEvent,
} from './model';
import { keySigFromFifths, rhythmFromBeats } from './model';

const DYNAMIC_MARKS = new Set([
  'p', 'pp', 'ppp', 'pppp', 'f', 'ff', 'fff', 'ffff', 'mp', 'mf', 'sf', 'sfz', 'fp', 'fz', 'rfz', 'sffz',
]);

const ARTICULATION_TAGS = new Set([
  'accent', 'strong-accent', 'staccato', 'staccatissimo', 'tenuto', 'detached-legato',
  'spiccato', 'scoop', 'plop', 'doit', 'falloff', 'breath-mark', 'caesura', 'stress', 'unstress',
]);

const ORNAMENT_TAG_NAMES: Record<string, string> = {
  'trill-mark': 'trill',
  'turn': 'turn',
  'delayed-turn': 'turn',
  'inverted-turn': 'inverted turn',
  'mordent': 'mordent',
  'inverted-mordent': 'inverted mordent',
  'schleifer': 'schleifer',
  'tremolo': 'tremolo',
  'wavy-line': 'trill',
};

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.tagName === name);
}
function child(el: Element, name: string): Element | undefined {
  return children(el, name)[0];
}
function text(el: Element | undefined): string {
  return el?.textContent?.trim() ?? '';
}
function num(el: Element | undefined, fallback: number): number {
  const v = parseFloat(text(el));
  return Number.isFinite(v) ? v : fallback;
}

function clefFromSign(sign: string, line: number): ClefType {
  switch (sign) {
    case 'G': return 'treble';
    case 'F': return 'bass';
    case 'C': return line === 4 ? 'tenor' : 'alto';
    case 'percussion': return 'percussion';
    default: return 'unknown';
  }
}

/**
 * Extract the normalized ScoreModel from a MusicXML (score-partwise) string.
 * Staff numbers are global across parts (part 1 staff 1..n, then part 2, …),
 * matching the top-to-bottom order OSMD renders.
 */
export function extractFromXml(
  xml: string,
  source: 'musicxml' | 'midi',
  fileName: string,
): ScoreModel {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Could not parse the MusicXML document.');

  const root = doc.querySelector('score-partwise');
  if (!root) {
    if (doc.querySelector('score-timewise')) {
      throw new Error('score-timewise MusicXML is not supported — please export as score-partwise (the default in most editors).');
    }
    throw new Error('No <score-partwise> element found in the file.');
  }

  const title =
    text(doc.querySelector('work > work-title') ?? undefined) ||
    text(doc.querySelector('movement-title') ?? undefined) ||
    undefined;

  const parts = Array.from(root.querySelectorAll(':scope > part'));
  if (parts.length === 0) throw new Error('The score contains no parts.');

  const warnings: string[] = [];
  if (parts.length > 1) {
    warnings.push(
      `This score has ${parts.length} parts — Parso Piano is optimized for solo piano, so parts are shown as extra staves.`,
    );
  }

  // Staff offset per part (global staff numbering).
  const partStaffCount: number[] = parts.map((p) => {
    let staves = 1;
    const stavesEl = p.querySelector('measure > attributes > staves');
    if (stavesEl) staves = Math.max(1, parseInt(text(stavesEl), 10) || 1);
    return staves;
  });
  const partStaffOffset: number[] = [];
  let offset = 0;
  for (const count of partStaffCount) {
    partStaffOffset.push(offset);
    offset += count;
  }
  const staffCount = offset;

  const measureCount = Math.max(...parts.map((p) => children(p, 'measure').length));
  const measures: MeasureInfo[] = [];
  const notes: NoteEvent[] = [];
  const tempoMap: TempoEvent[] = [];

  // Sticky state per part.
  interface PartState {
    divisions: number;
    fifths: number;
    mode: 'major' | 'minor';
    clefByStaff: Record<number, ClefType>;
  }
  const partStates: PartState[] = parts.map((_, pi) => {
    const clefs: Record<number, ClefType> = {};
    for (let s = 1; s <= partStaffCount[pi]; s++) {
      clefs[partStaffOffset[pi] + s] = s === 2 ? 'bass' : 'treble';
    }
    return { divisions: 1, fifths: 0, mode: 'major', clefByStaff: clefs };
  });

  let globalTimeSig = { num: 4, den: 4 };
  let measureStartBeats = 0;

  for (let mi = 0; mi < measureCount; mi++) {
    let timeSigChanged = false;
    let keySigChanged = false;
    let clefChanged = false;
    let tempo: TempoEvent | undefined;
    const dynamics: DynamicEvent[] = [];
    const barline = { repeatStart: false, repeatEnd: false, right: 'regular' as MeasureInfo['barline']['right'] };
    let maxPosBeats = 0;
    let measureNumber = mi + 1;

    parts.forEach((part, pi) => {
      const measureEl = children(part, 'measure')[mi];
      if (!measureEl) return;
      const state = partStates[pi];
      const numberAttr = parseInt(measureEl.getAttribute('number') ?? '', 10);
      if (pi === 0 && Number.isFinite(numberAttr)) measureNumber = numberAttr;

      let posDivs = 0; // position within measure, in divisions
      let lastNoteEvent: NoteEvent | undefined;
      let entryCounter = 0;

      for (const el of Array.from(measureEl.children)) {
        switch (el.tagName) {
          case 'attributes': {
            const div = child(el, 'divisions');
            if (div) state.divisions = Math.max(1, num(div, 1));
            const key = child(el, 'key');
            if (key) {
              const fifths = num(child(key, 'fifths'), 0);
              const mode = text(child(key, 'mode')) === 'minor' ? 'minor' : 'major';
              if (fifths !== state.fifths || mode !== state.mode) keySigChanged = true;
              state.fifths = fifths;
              state.mode = mode;
              if (mi === 0) keySigChanged = false; // initial signature isn't a "change"
            }
            const time = child(el, 'time');
            if (time && pi === 0) {
              const n = num(child(time, 'beats'), 4);
              const d = num(child(time, 'beat-type'), 4);
              if (n !== globalTimeSig.num || d !== globalTimeSig.den) timeSigChanged = mi > 0;
              globalTimeSig = { num: n, den: d };
            }
            for (const clefEl of children(el, 'clef')) {
              const staffLocal = parseInt(clefEl.getAttribute('number') ?? '1', 10) || 1;
              const sign = text(child(clefEl, 'sign'));
              const line = num(child(clefEl, 'line'), sign === 'F' ? 4 : 2);
              const clef = clefFromSign(sign, line);
              const globalStaff = partStaffOffset[pi] + staffLocal;
              if (state.clefByStaff[globalStaff] !== clef && mi > 0) clefChanged = true;
              state.clefByStaff[globalStaff] = clef;
            }
            break;
          }
          case 'direction': {
            const sound = child(el, 'sound');
            const beatsHere = measureStartBeats + posDivs / state.divisions;
            const tempoAttr = sound?.getAttribute('tempo');
            if (tempoAttr) {
              const bpm = parseFloat(tempoAttr);
              if (Number.isFinite(bpm) && bpm > 0) {
                const words = text(el.querySelector('direction-type > words') ?? undefined);
                tempo = { beats: beatsHere, bpm, text: words || undefined };
                tempoMap.push(tempo);
              }
            } else {
              const perMinute = el.querySelector('direction-type > metronome > per-minute');
              if (perMinute) {
                const bpm = parseFloat(text(perMinute));
                if (Number.isFinite(bpm) && bpm > 0) {
                  tempo = { beats: beatsHere, bpm };
                  tempoMap.push(tempo);
                }
              } else {
                const words = text(el.querySelector('direction-type > words') ?? undefined);
                if (words && mi === 0 && posDivs === 0 && !tempo) {
                  // A verbal tempo/character marking like "Allegro" with no BPM.
                  tempo = { beats: beatsHere, bpm: 0, text: words };
                }
              }
            }
            const dyn = el.querySelector('direction-type > dynamics');
            if (dyn && dyn.children.length > 0) {
              dynamics.push({ beats: beatsHere, value: dyn.children[0].tagName, kind: 'instant' });
            }
            const wedge = el.querySelector('direction-type > wedge');
            if (wedge) {
              const type = wedge.getAttribute('type');
              if (type === 'crescendo' || type === 'diminuendo') {
                dynamics.push({ beats: beatsHere, value: type, kind: 'wedge-start' });
              } else if (type === 'stop') {
                dynamics.push({ beats: beatsHere, value: 'wedge', kind: 'wedge-stop' });
              }
            }
            break;
          }
          case 'barline': {
            const repeat = child(el, 'repeat');
            if (repeat) {
              const dir = repeat.getAttribute('direction');
              if (dir === 'forward') barline.repeatStart = true;
              if (dir === 'backward') barline.repeatEnd = true;
            }
            const style = text(child(el, 'bar-style'));
            if (style === 'light-light') barline.right = 'light-light';
            else if (style === 'light-heavy') barline.right = 'light-heavy';
            else if (style && style !== 'regular') barline.right = 'other';
            break;
          }
          case 'backup': {
            posDivs -= num(child(el, 'duration'), 0);
            break;
          }
          case 'forward': {
            posDivs += num(child(el, 'duration'), 0);
            break;
          }
          case 'note': {
            const isChordMember = !!child(el, 'chord');
            const isGrace = !!child(el, 'grace');
            const durationDivs = num(child(el, 'duration'), 0);
            const restEl = child(el, 'rest');
            const staffLocal = parseInt(text(child(el, 'staff')) || '1', 10) || 1;
            const staff = partStaffOffset[pi] + staffLocal;
            const voice = parseInt(text(child(el, 'voice')) || '1', 10) || 1;

            const onsetDivs = isChordMember && lastNoteEvent
              ? (lastNoteEvent.onsetBeats - measureStartBeats) * state.divisions
              : posDivs;
            const onsetBeats = measureStartBeats + onsetDivs / state.divisions;
            const durationBeats = durationDivs / state.divisions;

            if (!isChordMember) entryCounter += 1;
            const chordGroupId = `m${mi}-p${pi}-v${voice}-e${entryCounter}`;
            const id = `${chordGroupId}-n${children(el.parentElement as Element, 'note').indexOf(el)}`;

            const pitchEl = child(el, 'pitch');
            let pitch: NoteEvent['pitch'];
            if (pitchEl && !restEl) {
              const step = text(child(pitchEl, 'step')) || 'C';
              const alter = num(child(pitchEl, 'alter'), 0);
              const octave = num(child(pitchEl, 'octave'), 4);
              const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
              const midi = 12 * (octave + 1) + (base[step] ?? 0) + alter;
              const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : alter === 2 ? '##' : alter === -2 ? 'bb' : '';
              pitch = { step, alter, octave, name: `${step}${accidental}${octave}`, midi };
            }

            // Notations
            const notations = {
              articulations: [] as string[],
              ornaments: [] as string[],
              slurStart: false,
              slurStop: false,
              fermata: false,
              arpeggiate: false,
              dynamic: undefined as string | undefined,
            };
            for (const notEl of children(el, 'notations')) {
              for (const sub of Array.from(notEl.children)) {
                switch (sub.tagName) {
                  case 'articulations':
                    for (const a of Array.from(sub.children)) {
                      if (ARTICULATION_TAGS.has(a.tagName)) notations.articulations.push(a.tagName);
                    }
                    break;
                  case 'ornaments':
                    for (const o of Array.from(sub.children)) {
                      const name = ORNAMENT_TAG_NAMES[o.tagName];
                      if (name && !notations.ornaments.includes(name)) notations.ornaments.push(name);
                    }
                    break;
                  case 'fermata':
                    notations.fermata = true;
                    break;
                  case 'arpeggiate':
                    notations.arpeggiate = true;
                    break;
                  case 'slur': {
                    const type = sub.getAttribute('type');
                    if (type === 'start') notations.slurStart = true;
                    if (type === 'stop') notations.slurStop = true;
                    break;
                  }
                  case 'dynamics':
                    if (sub.children.length > 0 && DYNAMIC_MARKS.has(sub.children[0].tagName)) {
                      notations.dynamic = sub.children[0].tagName;
                    }
                    break;
                }
              }
            }
            if (isGrace) notations.ornaments.push('grace note');

            const ties = children(el, 'tie');
            const tieStart = ties.some((t) => t.getAttribute('type') === 'start');
            const tieStop = ties.some((t) => t.getAttribute('type') === 'stop');

            const typeEl = child(el, 'type');
            const dots = children(el, 'dot').length;
            const rhythmType = text(typeEl) || rhythmFromBeats(durationBeats).type;

            const event: NoteEvent = {
              id,
              isRest: !!restEl,
              pitch,
              onsetBeats,
              durationBeats,
              measureIndex: mi,
              staff,
              voice,
              rhythmType,
              dots,
              tieStart,
              tieStop,
              chordGroupId,
              notations,
            };
            notes.push(event);
            lastNoteEvent = event;

            if (!isChordMember && !isGrace) posDivs += durationDivs;
            maxPosBeats = Math.max(maxPosBeats, onsetBeats - measureStartBeats + durationBeats);
            break;
          }
        }
      }
    });

    const state0 = partStates[0];
    const tsDurationBeats = (globalTimeSig.num * 4) / globalTimeSig.den;
    // Pickup (anacrusis) measures are shorter than the time signature says.
    const durationBeats = maxPosBeats > 0 && maxPosBeats < tsDurationBeats - 1e-6
      ? maxPosBeats
      : tsDurationBeats;

    const clefByStaff: Record<number, ClefType> = {};
    for (const st of partStates) Object.assign(clefByStaff, st.clefByStaff);

    measures.push({
      index: mi,
      number: measureNumber,
      startBeats: measureStartBeats,
      durationBeats,
      timeSig: { ...globalTimeSig },
      timeSigChanged,
      keySig: keySigFromFifths(state0.fifths, state0.mode),
      keySigChanged,
      clefByStaff,
      clefChanged,
      tempo,
      barline,
      dynamics,
    });

    measureStartBeats += durationBeats;
  }

  notes.sort((a, b) => a.onsetBeats - b.onsetBeats || a.staff - b.staff || (a.pitch?.midi ?? 0) - (b.pitch?.midi ?? 0));

  if (tempoMap.length === 0 || tempoMap[0].beats > 0) {
    tempoMap.unshift({ beats: 0, bpm: 120 });
  }
  const filteredTempoMap = tempoMap.filter((t) => t.bpm > 0).sort((a, b) => a.beats - b.beats);
  if (filteredTempoMap.length === 0) filteredTempoMap.push({ beats: 0, bpm: 120 });

  return {
    title,
    source,
    fileName,
    measures,
    notes,
    tempoMap: filteredTempoMap,
    staffCount,
    warnings,
  };
}
