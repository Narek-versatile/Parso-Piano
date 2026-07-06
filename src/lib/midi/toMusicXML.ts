import type { BuiltMeasure, MeasureEntry } from './types';

const TYPE_BY_UNITS: Record<number, { type: string; dots: number }> = {
  16: { type: 'whole', dots: 0 },
  12: { type: 'half', dots: 1 },
  8: { type: 'half', dots: 0 },
  6: { type: 'quarter', dots: 1 },
  4: { type: 'quarter', dots: 0 },
  3: { type: 'eighth', dots: 1 },
  2: { type: 'eighth', dots: 0 },
  1: { type: '16th', dots: 0 },
};

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Serialize built measures into a two-staff piano MusicXML document
 * (divisions = 4, i.e. one division per 16th note).
 */
export function serializeMusicXML(measures: BuiltMeasure[], fifths: number, title: string): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<score-partwise version="3.1">');
  lines.push(`  <work><work-title>${esc(title)}</work-title></work>`);
  lines.push('  <part-list>');
  lines.push('    <score-part id="P1"><part-name>Piano</part-name></score-part>');
  lines.push('  </part-list>');
  lines.push('  <part id="P1">');

  measures.forEach((m, i) => {
    lines.push(`    <measure number="${i + 1}">`);

    const attrs: string[] = [];
    if (i === 0) attrs.push('<divisions>4</divisions>');
    if (i === 0) attrs.push(`<key><fifths>${fifths}</fifths></key>`);
    if (m.timeSigChanged) {
      attrs.push(`<time><beats>${m.timeSig.num}</beats><beat-type>${m.timeSig.den}</beat-type></time>`);
    }
    if (i === 0) {
      attrs.push('<staves>2</staves>');
      attrs.push('<clef number="1"><sign>G</sign><line>2</line></clef>');
      attrs.push('<clef number="2"><sign>F</sign><line>4</line></clef>');
    }
    if (attrs.length > 0) {
      lines.push(`      <attributes>${attrs.join('')}</attributes>`);
    }

    if (m.tempo !== undefined) {
      lines.push(
        '      <direction placement="above"><direction-type>' +
          `<metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(m.tempo)}</per-minute></metronome>` +
          `</direction-type><sound tempo="${m.tempo}"/></direction>`,
      );
    }

    for (const entry of m.staves[1]) lines.push(...entryToXml(entry, 1));
    lines.push(`      <backup><duration>${m.durationUnits}</duration></backup>`);
    for (const entry of m.staves[2]) lines.push(...entryToXml(entry, 2));

    lines.push('    </measure>');
  });

  lines.push('  </part>');
  lines.push('</score-partwise>');
  return lines.join('\n');
}

function entryToXml(entry: MeasureEntry, staff: 1 | 2): string[] {
  const voice = staff === 1 ? 1 : 2;
  const lines: string[] = [];

  if (entry.notes.length === 0) {
    // Rest
    if (entry.fullMeasureRest) {
      lines.push(
        `      <note><rest measure="yes"/><duration>${entry.duration}</duration>` +
          `<voice>${voice}</voice><staff>${staff}</staff></note>`,
      );
    } else {
      const t = TYPE_BY_UNITS[entry.duration] ?? { type: '16th', dots: 0 };
      lines.push(
        `      <note><rest/><duration>${entry.duration}</duration><voice>${voice}</voice>` +
          `<type>${t.type}</type>${'<dot/>'.repeat(t.dots)}<staff>${staff}</staff></note>`,
      );
    }
    return lines;
  }

  const t = TYPE_BY_UNITS[entry.duration] ?? { type: '16th', dots: 0 };
  entry.notes.forEach((p, idx) => {
    const parts: string[] = ['      <note>'];
    if (idx > 0) parts.push('<chord/>');
    parts.push('<pitch>');
    parts.push(`<step>${p.step}</step>`);
    if (p.alter !== 0) parts.push(`<alter>${p.alter}</alter>`);
    parts.push(`<octave>${p.octave}</octave>`);
    parts.push('</pitch>');
    parts.push(`<duration>${entry.duration}</duration>`);
    if (entry.tieStop) parts.push('<tie type="stop"/>');
    if (entry.tieStart) parts.push('<tie type="start"/>');
    parts.push(`<voice>${voice}</voice>`);
    parts.push(`<type>${t.type}</type>`);
    parts.push('<dot/>'.repeat(t.dots));
    parts.push(`<staff>${staff}</staff>`);
    if (entry.tieStart || entry.tieStop) {
      const tied: string[] = [];
      if (entry.tieStop) tied.push('<tied type="stop"/>');
      if (entry.tieStart) tied.push('<tied type="start"/>');
      parts.push(`<notations>${tied.join('')}</notations>`);
    }
    parts.push('</note>');
    lines.push(parts.join(''));
  });
  return lines;
}
