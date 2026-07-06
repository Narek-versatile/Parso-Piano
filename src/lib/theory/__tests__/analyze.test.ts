import { describe, expect, it } from 'vitest';
import { extractFromXml } from '../../score/extractFromXml';
import { analyzeMoment, describeInterval } from '../analyze';

function chordFixture(fifths: number, notesXml: string): string {
  return `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>${fifths}</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      ${notesXml}
    </measure>
  </part>
</score-partwise>`;
}

function noteXml(step: string, octave: number, opts: { alter?: number; chord?: boolean } = {}): string {
  return `<note>${opts.chord ? '<chord/>' : ''}<pitch><step>${step}</step>${
    opts.alter ? `<alter>${opts.alter}</alter>` : ''
  }<octave>${octave}</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>`;
}

describe('analyzeMoment', () => {
  it('identifies a root-position C major triad as I in C', () => {
    const xml = chordFixture(0, noteXml('C', 4) + noteXml('E', 4, { chord: true }) + noteXml('G', 4, { chord: true }));
    const model = extractFromXml(xml, 'musicxml', 't.xml');
    const analysis = analyzeMoment(model, model.notes[0]);
    expect(analysis.chordSymbol).toMatch(/^C/);
    expect(analysis.inversion).toBe(0);
    expect(analysis.roman).toBe('I');
    expect(analysis.harmonicFunction).toBe('tonic');
    expect(analysis.bassNote).toBe('C4');
  });

  it('identifies first inversion (bass = third)', () => {
    const xml = chordFixture(0, noteXml('E', 3) + noteXml('G', 3, { chord: true }) + noteXml('C', 4, { chord: true }));
    const model = extractFromXml(xml, 'musicxml', 't.xml');
    const analysis = analyzeMoment(model, model.notes[0]);
    expect(analysis.inversion).toBe(1);
    expect(analysis.bassNote).toBe('E3');
  });

  it('identifies G7 as dominant in C', () => {
    const xml = chordFixture(0,
      noteXml('G', 3) + noteXml('B', 3, { chord: true }) + noteXml('D', 4, { chord: true }) + noteXml('F', 4, { chord: true }));
    const model = extractFromXml(xml, 'musicxml', 't.xml');
    const analysis = analyzeMoment(model, model.notes[0]);
    expect(analysis.chordSymbol).toMatch(/^G7/);
    expect(analysis.roman).toBe('V7');
    expect(analysis.harmonicFunction).toBe('dominant');
  });

  it('reports intervals for a dyad without naming a chord', () => {
    const xml = chordFixture(0, noteXml('C', 4) + noteXml('G', 4, { chord: true }));
    const model = extractFromXml(xml, 'musicxml', 't.xml');
    const analysis = analyzeMoment(model, model.notes[0]);
    expect(analysis.chordSymbol).toBeUndefined();
    expect(analysis.intervalsFromBass).toHaveLength(1);
    expect(analysis.intervalsFromBass[0].name).toBe('perfect fifth');
    expect(analysis.intervalsFromBass[0].semitones).toBe(7);
  });

  it('reports a single melody note', () => {
    const xml = chordFixture(0, noteXml('A', 4));
    const model = extractFromXml(xml, 'musicxml', 't.xml');
    const analysis = analyzeMoment(model, model.notes[0]);
    expect(analysis.soundingNotes).toHaveLength(1);
    expect(analysis.selectedDegree).toBe(6);
    expect(analysis.selectedIsDiatonic).toBe(true);
  });

  it('detects minor key numerals', () => {
    // A minor: key fifths 0 mode minor, chord E–G#–B (V in A minor)
    const xml = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><key><fifths>0</fifths><mode>minor</mode></key>
    <time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
    ${noteXml('E', 3)}${noteXml('G', 3, { alter: 1, chord: true })}${noteXml('B', 3, { chord: true })}
  </measure></part>
</score-partwise>`;
    const model = extractFromXml(xml, 'musicxml', 't.xml');
    const analysis = analyzeMoment(model, model.notes[0]);
    expect(analysis.key.tonic).toBe('A');
    expect(analysis.key.mode).toBe('minor');
    expect(analysis.roman).toBe('V');
    expect(analysis.harmonicFunction).toBe('dominant');
  });
});

describe('describeInterval', () => {
  it('names common intervals', () => {
    expect(describeInterval('3M')).toBe('major third');
    expect(describeInterval('3m')).toBe('minor third');
    expect(describeInterval('5P')).toBe('perfect fifth');
    expect(describeInterval('8P')).toBe('octave');
  });
});
