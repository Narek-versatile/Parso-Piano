import { describe, expect, it } from 'vitest';
import { extractFromXml } from '../extractFromXml';
import { beatsToSeconds, midiToFrequency, notesSoundingAt, rhythmFromBeats } from '../model';

export const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Test Piece</work-title></work>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>-3</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type>
        <sound tempo="90"/>
      </direction>
      <direction placement="below"><direction-type><dynamics><p/></dynamics></direction-type></direction>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>4</duration><voice>1</voice><type>quarter</type><staff>1</staff>
        <notations><articulations><staccato/></articulations></notations>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>4</duration><voice>1</voice><type>quarter</type><staff>1</staff>
      </note>
      <note>
        <pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch>
        <duration>6</duration><voice>1</voice><type>quarter</type><dot/><staff>1</staff>
        <notations><fermata/></notations>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>eighth</type><staff>1</staff>
      </note>
      <backup><duration>16</duration></backup>
      <note>
        <pitch><step>E</step><alter>-1</alter><octave>3</octave></pitch>
        <duration>16</duration><voice>2</voice><type>whole</type><staff>2</staff>
      </note>
      <note><chord/>
        <pitch><step>G</step><octave>3</octave></pitch>
        <duration>16</duration><voice>2</voice><type>whole</type><staff>2</staff>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>16</duration><voice>1</voice><type>whole</type><staff>1</staff>
      </note>
      <backup><duration>16</duration></backup>
      <note><rest/><duration>16</duration><voice>2</voice><staff>2</staff></note>
      <barline location="right"><bar-style>light-heavy</bar-style></barline>
    </measure>
  </part>
</score-partwise>`;

describe('extractFromXml', () => {
  const model = extractFromXml(FIXTURE_XML, 'musicxml', 'test.musicxml');

  it('reads title, measures and staves', () => {
    expect(model.title).toBe('Test Piece');
    expect(model.measures.length).toBe(2);
    expect(model.staffCount).toBe(2);
  });

  it('reads key, time, clefs and tempo', () => {
    const m1 = model.measures[0];
    expect(m1.keySig.fifths).toBe(-3);
    expect(m1.keySig.tonic).toBe('Eb');
    expect(m1.timeSig).toEqual({ num: 4, den: 4 });
    expect(m1.clefByStaff[1]).toBe('treble');
    expect(m1.clefByStaff[2]).toBe('bass');
    expect(model.tempoMap[0].bpm).toBe(90);
  });

  it('computes onsets across backup and chords', () => {
    const eb4 = model.notes.find((n) => n.pitch?.name === 'Eb4')!;
    expect(eb4.onsetBeats).toBe(0);
    expect(eb4.durationBeats).toBe(1);
    expect(eb4.staff).toBe(1);

    const bb4 = model.notes.find((n) => n.pitch?.name === 'Bb4')!;
    expect(bb4.onsetBeats).toBe(2);
    expect(bb4.durationBeats).toBe(1.5);
    expect(bb4.dots).toBe(1);
    expect(bb4.notations.fermata).toBe(true);

    // Chord member shares the onset of its entry
    const g3 = model.notes.find((n) => n.pitch?.name === 'G3')!;
    const eb3 = model.notes.find((n) => n.pitch?.name === 'Eb3')!;
    expect(g3.onsetBeats).toBe(eb3.onsetBeats);
    expect(g3.chordGroupId).toBe(eb3.chordGroupId);

    // Measure 2 starts after 4 beats
    const c5 = model.notes.find((n) => n.pitch?.name === 'C5')!;
    expect(c5.onsetBeats).toBe(4);
    expect(c5.measureIndex).toBe(1);
  });

  it('captures notations and dynamics', () => {
    const eb4 = model.notes.find((n) => n.pitch?.name === 'Eb4')!;
    expect(eb4.notations.articulations).toContain('staccato');
    expect(model.measures[0].dynamics.some((d) => d.value === 'p')).toBe(true);
    expect(model.measures[1].barline.right).toBe('light-heavy');
  });

  it('finds all notes sounding at a moment across staves', () => {
    const sounding = notesSoundingAt(model, 0);
    const names = sounding.map((n) => n.pitch!.name).sort();
    expect(names).toEqual(['Eb3', 'Eb4', 'G3']);
  });
});

describe('model helpers', () => {
  it('converts beats to seconds through tempo changes', () => {
    const map = [
      { beats: 0, bpm: 60 },
      { beats: 4, bpm: 120 },
    ];
    expect(beatsToSeconds(map, 4)).toBeCloseTo(4);
    expect(beatsToSeconds(map, 8)).toBeCloseTo(6);
  });

  it('derives rhythm names from beat lengths', () => {
    expect(rhythmFromBeats(1)).toEqual({ type: 'quarter', dots: 0 });
    expect(rhythmFromBeats(1.5)).toEqual({ type: 'quarter', dots: 1 });
    expect(rhythmFromBeats(4)).toEqual({ type: 'whole', dots: 0 });
  });

  it('computes frequencies', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });
});
