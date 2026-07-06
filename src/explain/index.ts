import type { NoteEvent, ScoreModel } from '../lib/score/model';
import { measureAt, midiToFrequency } from '../lib/score/model';
import type { ChordAnalysis } from '../lib/theory/analyze';
import {
  ARTICULATIONS, CLEF_TEXT, DYNAMICS, FUNCTION_DESCRIPTIONS, ORNAMENTS, TEMPO_TERMS, UI,
  type Audience,
} from './strings';

export type { Audience } from './strings';

export interface ExplainItem {
  label: string;
  text: string;
  symbol?: string;
}

export interface ExplainSection {
  id: 'note' | 'chord' | 'signs' | 'measure';
  title: string;
  items: ExplainItem[];
}

/** "Eb4" → "E♭4" */
export function pretty(name: string): string {
  return name.replace(/bb/g, '𝄫').replace(/b(?=\d|$)/g, '♭').replace(/##/g, '𝄪').replace(/#/g, '♯');
}

function beatsWords(beats: number): string {
  const whole = Math.floor(beats + 1e-6);
  const frac = beats - whole;
  const fracStr = Math.abs(frac - 0.5) < 0.01 ? '½' : Math.abs(frac - 0.25) < 0.01 ? '¼' : Math.abs(frac - 0.75) < 0.01 ? '¾' : '';
  if (fracStr) return whole > 0 ? `${whole}${fracStr}` : fracStr;
  if (Math.abs(frac) < 0.01) return `${whole}`;
  return beats.toFixed(2);
}

function rhythmName(type: string, dots: number): string {
  const base = type || 'note';
  const prefix = dots === 1 ? 'dotted ' : dots === 2 ? 'double-dotted ' : '';
  return `${prefix}${base} note`;
}

function restName(type: string, dots: number): string {
  const base = type || '';
  const prefix = dots === 1 ? 'dotted ' : dots === 2 ? 'double-dotted ' : '';
  return base ? `${prefix}${base} rest` : 'rest';
}

function tempoAt(model: ScoreModel, beats: number): number {
  let bpm = 120;
  for (const t of model.tempoMap) {
    if (t.beats <= beats + 1e-6) bpm = t.bpm;
    else break;
  }
  return bpm;
}

const SHARPS_ORDER = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯', 'B♯'];
const FLATS_ORDER = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭'];

function registerWords(midi: number): string {
  if (midi === 60) return 'this is middle C itself';
  if (midi > 84) return 'high register, well above middle C';
  if (midi > 72) return 'upper register, above middle C';
  if (midi > 60) return 'just above middle C';
  if (midi > 48) return 'just below middle C';
  if (midi > 36) return 'lower register, below middle C';
  return 'deep bass register';
}

/** Build all four explanation sections for a selected note. */
export function explainSelection(
  model: ScoreModel,
  note: NoteEvent,
  analysis: ChordAnalysis,
  audience: Audience,
): ExplainSection[] {
  return [
    noteSection(model, note, audience),
    chordSection(note, analysis, audience),
    signsSection(note, audience),
    measureSection(model, note, audience),
  ];
}

function noteSection(model: ScoreModel, note: NoteEvent, audience: Audience): ExplainSection {
  const items: ExplainItem[] = [];
  const b = audience === 'beginner';

  if (note.isRest) {
    items.push({
      label: 'Rest',
      text: b
        ? `${capitalize(restName(note.rhythmType, note.dots))} — ${UI.restSelected.beginner} It lasts ${beatsWords(note.durationBeats)} beat${note.durationBeats === 1 ? '' : 's'}.`
        : `${capitalize(restName(note.rhythmType, note.dots))}, ${beatsWords(note.durationBeats)} beats of silence.`,
    });
    return { id: 'note', title: UI.sectionNote, items };
  }

  const p = note.pitch!;
  const prettyName = pretty(p.name);

  items.push({
    label: 'Pitch',
    text: b
      ? `${prettyName} — the note ${pretty(p.step + (p.alter ? (p.alter > 0 ? '♯' : '♭') : ''))} in octave ${p.octave} (${registerWords(p.midi)}).`
      : `${prettyName} (${registerWords(p.midi)}).`,
  });

  if (p.alter !== 0) {
    const acc = p.alter === 1 ? ['♯ sharp', 'raises the note by a half step'] :
      p.alter === -1 ? ['♭ flat', 'lowers the note by a half step'] :
      p.alter === 2 ? ['𝄪 double sharp', 'raises the note by a whole step'] :
      ['𝄫 double flat', 'lowers the note by a whole step'];
    items.push({
      label: 'Accidental',
      text: b
        ? `The ${acc[0]} ${acc[1]} — so instead of plain ${p.step}, you play the ${p.alter > 0 ? 'next key to the right' : 'next key to the left'} (usually a black key).`
        : `${acc[0]} (${acc[1]}).`,
    });
  }

  const measure = measureAt(model, note.onsetBeats);
  const rhythm = rhythmName(note.rhythmType, note.dots);
  const beatsText = `${beatsWords(note.durationBeats)} beat${Math.abs(note.durationBeats - 1) < 0.01 ? '' : 's'}`;
  let rhythmText: string;
  if (b) {
    rhythmText = `${capitalize(rhythm)} — hold it for ${beatsText}`;
    if (measure) rhythmText += ` (counting quarter-note beats in ${measure.timeSig.num}/${measure.timeSig.den} time)`;
    rhythmText += '.';
    if (note.dots === 1) rhythmText += ' The dot after the note adds half of its value again.';
  } else {
    rhythmText = `${capitalize(rhythm)} = ${beatsText}.`;
  }
  items.push({ label: 'Rhythm value', text: rhythmText });

  const bpm = tempoAt(model, note.onsetBeats);
  const seconds = (note.durationBeats * 60) / bpm;
  items.push({
    label: 'Length in time',
    text: b
      ? `At this tempo (${Math.round(bpm)} beats per minute) the note sounds for about ${seconds.toFixed(2)} seconds.`
      : `≈ ${seconds.toFixed(2)} s at ${Math.round(bpm)} BPM.`,
  });

  if (note.tieStart || note.tieStop) {
    items.push({
      label: 'Tie',
      text: b
        ? 'This note is tied (the curved line to a note of the same pitch): don’t restrike the second note — hold one continuous sound for the combined length.'
        : 'Tied — combined duration with the connected note; single attack.',
    });
  }

  const clef = measure?.clefByStaff[note.staff] ?? (note.staff === 2 ? 'bass' : 'treble');
  const clefInfo = CLEF_TEXT[clef];
  items.push({
    label: 'Staff & clef',
    text: b
      ? `Staff ${note.staff} with ${clefInfo.beginner}`
      : `Staff ${note.staff}, ${clefInfo.advanced}`,
    symbol: clefInfo.symbol,
  });

  items.push({
    label: 'Frequency',
    text: b
      ? `${midiToFrequency(p.midi).toFixed(2)} Hz — the string vibrates about ${Math.round(midiToFrequency(p.midi))} times per second (the tuning reference A4 is 440 Hz).`
      : `${midiToFrequency(p.midi).toFixed(2)} Hz.`,
  });
  items.push({
    label: 'MIDI number',
    text: b
      ? `${p.midi} — the number digital pianos use for this key (middle C is 60).`
      : `${p.midi}.`,
  });

  return { id: 'note', title: UI.sectionNote, items };
}

function chordSection(note: NoteEvent, analysis: ChordAnalysis, audience: Audience): ExplainSection {
  const items: ExplainItem[] = [];
  const b = audience === 'beginner';
  const notes = analysis.soundingNotes;

  if (note.isRest) {
    if (notes.length > 0) {
      items.push({
        label: 'Meanwhile',
        text: `While this voice rests, the other voice sounds: ${notes.map((n) => pretty(n.name)).join(', ')}.`,
      });
    } else {
      items.push({ label: 'Silence', text: b ? 'Nothing sounds at this moment — a full silence.' : 'Tacet.' });
      return { id: 'chord', title: UI.sectionChord, items };
    }
  }

  if (notes.length === 1) {
    items.push({
      label: 'Single note',
      text: b
        ? 'This note sounds alone — pure melody with no harmony underneath at this instant.'
        : 'Monophonic at this moment.',
    });
    return { id: 'chord', title: UI.sectionChord, items };
  }

  items.push({
    label: 'Sounding together',
    text: `${notes.map((n) => pretty(n.name)).join(' · ')} (${notes.length} notes, both staves combined).`,
  });

  if (notes.length === 2 && analysis.intervalsFromBass.length === 1) {
    const iv = analysis.intervalsFromBass[0];
    const consonant = [0, 3, 4, 7, 8, 9, 12, 15, 16].includes(iv.semitones % 24);
    items.push({
      label: 'Interval',
      text: b
        ? `Two notes form an interval: ${pretty(iv.fromName)} up to ${pretty(iv.toName)} is a ${iv.name} (${iv.semitones} half steps). It sounds ${consonant ? 'consonant — stable and pleasant' : 'dissonant — tense, wanting to resolve'}.`
        : `${iv.name} (${iv.semitones} semitones), ${consonant ? 'consonant' : 'dissonant'}.`,
    });
    return { id: 'chord', title: UI.sectionChord, items };
  }

  if (analysis.chordSymbol) {
    const tones = analysis.chordTones.map(pretty).join('–');
    items.push({
      label: 'Chord',
      text: b
        ? `This is a ${analysis.chordLongName} chord (written ${pretty(analysis.chordSymbol)}). Its building blocks are ${tones}${analysis.rootNote ? `, stacked above the root ${pretty(analysis.rootNote)}` : ''}.`
        : `${pretty(analysis.chordSymbol)} — ${analysis.chordLongName} (${tones}).`,
    });

    if (analysis.inversion !== undefined && analysis.bassNote) {
      const invName = ['root position', 'first inversion', 'second inversion', 'third inversion'][analysis.inversion] ?? `${analysis.inversion}th inversion`;
      items.push({
        label: 'Inversion',
        text: b
          ? analysis.inversion === 0
            ? `Root position — the root ${pretty(analysis.rootNote ?? '')} is the lowest sounding note, the most stable arrangement.`
            : `${capitalize(invName)} — instead of the root, ${pretty(analysis.bassNote)} is the lowest note. Same chord, different "flavor" of stability.`
          : `${capitalize(invName)} (bass: ${pretty(analysis.bassNote)}).`,
      });
    }
  } else {
    items.push({
      label: 'Chord',
      text: b
        ? 'These notes don’t form a standard named chord — they may be passing tones or a fragment of a melody meeting the accompaniment.'
        : 'No standard chord detected (non-tertian or incomplete sonority).',
    });
  }

  if (analysis.intervalsFromBass.length > 0 && notes.length >= 3) {
    items.push({
      label: 'Intervals from the bass',
      text: analysis.intervalsFromBass
        .map((iv) => `${pretty(iv.toName)}: ${iv.name}`)
        .join(' · '),
    });
  }

  if (analysis.roman) {
    const fn = analysis.harmonicFunction ? FUNCTION_DESCRIPTIONS[analysis.harmonicFunction] : undefined;
    const keyName = `${pretty(analysis.key.tonic)} ${analysis.key.mode}`;
    items.push({
      label: 'Function in the key',
      text: b
        ? `In ${keyName}, this chord is ${analysis.roman} — ${fn ? fn.beginner : `the chord on scale degree ${analysis.roman}.`}`
        : `${analysis.roman} in ${keyName}${fn ? ` — ${fn.advanced}` : '.'}`,
    });
  }

  return { id: 'chord', title: UI.sectionChord, items };
}

function signsSection(note: NoteEvent, audience: Audience): ExplainSection {
  const items: ExplainItem[] = [];
  const b = audience === 'beginner';
  const n = note.notations;

  for (const a of n.articulations) {
    const info = ARTICULATIONS[a];
    if (info) items.push({ label: labelize(a), text: info[audience], symbol: info.symbol });
  }
  for (const o of n.ornaments) {
    const info = ORNAMENTS[o];
    if (info) items.push({ label: labelize(o), text: info[audience], symbol: info.symbol });
  }
  if (n.fermata) {
    items.push({
      label: 'Fermata',
      symbol: '𝄐',
      text: b
        ? 'The "eye" above the note is a fermata: pause here — hold the note noticeably longer than written, as long as feels right.'
        : 'Fermata — sustain beyond notated value at performer’s discretion.',
    });
  }
  if (n.arpeggiate) {
    items.push({
      label: 'Arpeggio',
      symbol: '𝆃',
      text: b
        ? 'The wavy vertical line means arpeggiate: don’t play the chord’s notes together — roll them quickly from bottom to top, like a harp.'
        : 'Arpeggiato — roll the chord, typically bottom-up.',
    });
  }
  if (n.slurStart || n.slurStop) {
    items.push({
      label: 'Slur',
      symbol: '⌒',
      text: b
        ? `A slur ${n.slurStart ? 'begins' : 'ends'} here (the curved line over different pitches): play the whole slurred group legato — smoothly connected, no gaps between notes.`
        : `Slur ${n.slurStart ? 'start' : 'end'} — legato phrasing.`,
    });
  }
  if (n.dynamic) {
    const info = DYNAMICS[n.dynamic];
    if (info) items.push({ label: 'Dynamic', text: info[audience], symbol: info.symbol });
  }
  if (note.dots > 0 && !note.isRest) {
    items.push({
      label: 'Dot',
      symbol: '·',
      text: b
        ? 'The dot right after the notehead is an augmentation dot: it stretches the note by half its value (a dotted quarter = quarter + eighth).'
        : 'Augmentation dot — adds half the note’s value.',
    });
  }
  if (note.tieStart || note.tieStop) {
    items.push({
      label: 'Tie',
      symbol: '‿',
      text: b
        ? 'The curve joining two identical pitches is a tie — one continuous sound, don’t play the second note separately.'
        : 'Tie — durations combined into a single attack.',
    });
  }

  if (items.length === 0) {
    items.push({ label: '—', text: note.isRest ? UI.restSelected[audience] : UI.noSigns[audience] });
  }
  return { id: 'signs', title: UI.sectionSigns, items };
}

function measureSection(model: ScoreModel, note: NoteEvent, audience: Audience): ExplainSection {
  const items: ExplainItem[] = [];
  const b = audience === 'beginner';
  const measure = measureAt(model, note.onsetBeats);
  if (!measure) return { id: 'measure', title: UI.sectionMeasure, items };

  // Beat position within the measure.
  const beatInMeasure = note.onsetBeats - measure.startBeats;
  const beatNumber = Math.floor(beatInMeasure + 1e-6) + 1;
  const isOffbeat = Math.abs(beatInMeasure - Math.floor(beatInMeasure + 1e-6)) > 0.01;
  items.push({
    label: 'Position',
    text: b
      ? `Measure ${measure.number}, ${isOffbeat ? `off the beat after beat ${beatNumber} (count it as an "and")` : `on beat ${beatNumber}${beatNumber === 1 ? ' — the downbeat, the strongest beat of the bar' : ''}`}.`
      : `m. ${measure.number}, beat ${beatsWords(beatInMeasure + 1)}.`,
  });

  const ts = measure.timeSig;
  const tsCommon = ts.num === 4 && ts.den === 4 ? ' (also written as the "common time" C symbol)' :
    ts.num === 2 && ts.den === 2 ? ' (also called "cut time", 𝄵)' : '';
  const compound = ts.den === 8 && ts.num % 3 === 0;
  items.push({
    label: 'Time signature',
    symbol: `${ts.num}/${ts.den}`,
    text: b
      ? compound
        ? `${ts.num}/${ts.den} — ${ts.num} eighth-note pulses per measure, felt as ${ts.num / 3} big beats of three (compound meter): count "1-2-3 ${ts.num >= 6 ? '4-5-6' : ''}".`
        : `${ts.num}/${ts.den}${tsCommon} — each measure holds ${ts.num} beats, and a ${denName(ts.den)} note gets one beat. Count "${countPattern(ts.num)}".`
      : `${ts.num}/${ts.den}${tsCommon}${compound ? ' (compound)' : ''}.`,
  });

  const ks = measure.keySig;
  const accCount = Math.abs(ks.fifths);
  const accList = ks.fifths > 0 ? SHARPS_ORDER.slice(0, accCount) : FLATS_ORDER.slice(0, accCount);
  const accWord = ks.fifths > 0 ? 'sharp' : 'flat';
  const keyName = `${pretty(ks.tonic)} ${ks.mode}`;
  items.push({
    label: 'Key signature',
    symbol: accCount > 0 ? `${accCount}${ks.fifths > 0 ? '♯' : '♭'}` : '♮',
    text: b
      ? accCount === 0
        ? `No sharps or flats — the key is ${keyName}: only the white keys belong to the scale.`
        : `${accCount} ${accWord}${accCount > 1 ? 's' : ''} (${accList.join(', ')}) — the key is ${keyName}. Every ${accList.map((a) => a[0]).join(', ')} is played ${accWord} throughout, unless a natural sign (♮) cancels it.`
      : `${accCount === 0 ? 'no accidentals' : `${accCount} ${accWord}${accCount > 1 ? 's' : ''}: ${accList.join(' ')}`} — ${keyName}.`,
  });

  const clef = measure.clefByStaff[note.staff] ?? 'treble';
  const clefInfo = CLEF_TEXT[clef];
  items.push({ label: 'Clef', symbol: clefInfo.symbol, text: b ? `This staff uses ${clefInfo.beginner}` : clefInfo.advanced });

  const bpm = tempoAt(model, note.onsetBeats);
  const term = TEMPO_TERMS.find((t) => bpm <= t.max) ?? TEMPO_TERMS[TEMPO_TERMS.length - 1];
  const markedText = measure.tempo?.text;
  items.push({
    label: 'Tempo',
    symbol: '♩=' + Math.round(bpm),
    text: b
      ? `${Math.round(bpm)} quarter-note beats per minute${markedText ? ` (marked "${markedText}")` : ''} — around "${term.term}", ${term.meaning}.`
      : `♩ = ${Math.round(bpm)}${markedText ? ` ("${markedText}")` : ''} — ${term.term}.`,
  });

  // Active dynamic: last dynamic event at or before this moment.
  let activeDynamic: { value: string; beats: number } | undefined;
  for (const m of model.measures) {
    if (m.startBeats > note.onsetBeats + 1e-6) break;
    for (const d of m.dynamics) {
      if (d.beats <= note.onsetBeats + 1e-6 && d.kind !== 'wedge-stop') {
        activeDynamic = { value: d.value, beats: d.beats };
      }
    }
  }
  if (activeDynamic) {
    const info = DYNAMICS[activeDynamic.value];
    if (info) {
      items.push({ label: 'Dynamic level', symbol: info.symbol, text: info[audience] });
    }
  }

  if (measure.barline.repeatStart || measure.barline.repeatEnd) {
    const parts: string[] = [];
    if (measure.barline.repeatStart) parts.push(b ? 'a repeat-start sign (𝄆) — the passage from here will be played again' : 'repeat start (𝄆)');
    if (measure.barline.repeatEnd) parts.push(b ? 'a repeat-end sign (𝄇) — jump back and play the passage once more' : 'repeat end (𝄇)');
    items.push({ label: 'Repeats', symbol: '𝄆𝄇', text: capitalize(parts.join('; ')) + '.' });
  } else if (measure.barline.right === 'light-heavy') {
    items.push({
      label: 'Barline',
      symbol: '𝄂',
      text: b ? 'The thin+thick double barline marks the end of the piece (or a major section).' : 'Final barline.',
    });
  } else if (measure.barline.right === 'light-light') {
    items.push({
      label: 'Barline',
      symbol: '𝄁',
      text: b ? 'A double barline — the end of one section and the start of another.' : 'Section double barline.',
    });
  }

  return { id: 'measure', title: UI.sectionMeasure, items };
}

function denName(den: number): string {
  switch (den) {
    case 1: return 'whole';
    case 2: return 'half';
    case 4: return 'quarter';
    case 8: return 'eighth';
    case 16: return '16th';
    default: return `1/${den}`;
  }
}

function countPattern(num: number): string {
  return Array.from({ length: Math.min(num, 12) }, (_, i) => i + 1).join('-');
}

function labelize(tag: string): string {
  return capitalize(tag.replace(/-/g, ' '));
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
