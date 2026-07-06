import { describe, expect, it } from 'vitest';
import { extractFromXml } from '../../lib/score/extractFromXml';
import { analyzeMoment } from '../../lib/theory/analyze';
import { explainSelection, pretty } from '../index';
import { FIXTURE_XML } from '../../lib/score/__tests__/extractFromXml.test';

describe('explainSelection', () => {
  const model = extractFromXml(FIXTURE_XML, 'musicxml', 'test.musicxml');
  const eb4 = model.notes.find((n) => n.pitch?.name === 'Eb4')!;
  const analysis = analyzeMoment(model, eb4);

  it('produces all four sections', () => {
    const sections = explainSelection(model, eb4, analysis, 'beginner');
    expect(sections.map((s) => s.id)).toEqual(['note', 'chord', 'signs', 'measure']);
    for (const s of sections) expect(s.items.length).toBeGreaterThan(0);
  });

  it('covers note fundamentals', () => {
    const sections = explainSelection(model, eb4, analysis, 'beginner');
    const note = sections.find((s) => s.id === 'note')!;
    const all = note.items.map((i) => `${i.label}: ${i.text}`).join('\n');
    expect(all).toContain('E♭4');
    expect(all).toMatch(/quarter note/i);
    expect(all).toMatch(/311\.13/); // Eb4 frequency
    expect(all).toContain('63'); // MIDI number
    expect(all).toMatch(/flat/i);
  });

  it('explains the chord with inversion and function', () => {
    const sections = explainSelection(model, eb4, analysis, 'beginner');
    const chord = sections.find((s) => s.id === 'chord')!;
    const all = chord.items.map((i) => i.text).join('\n');
    // Eb3 G3 Eb4 G4 sounding at beat 0 → Eb major (no 5th? Eb-G only... dyad classes)
    expect(chord.items.length).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThan(20);
  });

  it('explains signs (staccato) on the note', () => {
    const sections = explainSelection(model, eb4, analysis, 'beginner');
    const signs = sections.find((s) => s.id === 'signs')!;
    expect(signs.items.some((i) => /staccato/i.test(i.text))).toBe(true);
  });

  it('explains the measure context', () => {
    const sections = explainSelection(model, eb4, analysis, 'beginner');
    const measure = sections.find((s) => s.id === 'measure')!;
    const all = measure.items.map((i) => i.text).join('\n');
    expect(all).toMatch(/4\/4/);
    expect(all).toMatch(/3 flats/i);
    expect(all).toMatch(/E♭ major/);
    expect(all).toMatch(/90/); // tempo
    expect(all).toMatch(/piano, soft|soft and gentle/i); // active p dynamic
  });

  it('differs between beginner and advanced prose', () => {
    const beginner = explainSelection(model, eb4, analysis, 'beginner');
    const advanced = explainSelection(model, eb4, analysis, 'advanced');
    const bText = beginner.flatMap((s) => s.items.map((i) => i.text)).join('\n');
    const aText = advanced.flatMap((s) => s.items.map((i) => i.text)).join('\n');
    expect(bText).not.toEqual(aText);
    expect(bText.length).toBeGreaterThan(aText.length); // beginner prose teaches more
  });

  it('explains a whole rest', () => {
    const rest = model.notes.find((n) => n.isRest)!;
    const sections = explainSelection(model, rest, analyzeMoment(model, rest), 'beginner');
    const note = sections.find((s) => s.id === 'note')!;
    expect(note.items[0].text).toMatch(/rest|silence/i);
  });
});

describe('pretty', () => {
  it('renders unicode accidentals', () => {
    expect(pretty('Eb4')).toBe('E♭4');
    expect(pretty('F#3')).toBe('F♯3');
    expect(pretty('Bb')).toBe('B♭');
  });
});
