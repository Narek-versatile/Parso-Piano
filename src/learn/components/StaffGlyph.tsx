import type { Clef } from '../types';
import { diatonicIndex, parseNote, prettyName } from '../notes';

/**
 * A small self-drawn SVG staff for lessons — one clef, one or more notes,
 * optional letter labels. Line gap 12px, one diatonic step = 6px.
 */

const TOP = 26;
const GAP = 12;
const BOTTOM = TOP + GAP * 4;

function topLineDiatonic(clef: Clef): number {
  return clef === 'treble' ? diatonicIndex('F', 5) : diatonicIndex('A', 3);
}

function noteY(clef: Clef, name: string): number {
  const p = parseNote(name);
  return TOP + (topLineDiatonic(clef) - diatonicIndex(p.step, p.octave)) * (GAP / 2);
}

function LedgerLines({ x, y }: { x: number; y: number }) {
  const lines: number[] = [];
  for (let ly = TOP - GAP; ly >= y - 3; ly -= GAP) lines.push(ly);
  for (let ly = BOTTOM + GAP; ly <= y + 3; ly += GAP) lines.push(ly);
  return (
    <>
      {lines.map((ly) => (
        <line key={ly} x1={x - 11} x2={x + 11} y1={ly} y2={ly} className="staff-line" />
      ))}
    </>
  );
}

function Note({ clef, name, x, label }: { clef: Clef; name: string; x: number; label?: boolean }) {
  const p = parseNote(name);
  const y = noteY(clef, name);
  const stemUp = y >= TOP + GAP * 2;
  const acc = p.alter === 1 ? '♯' : p.alter === -1 ? '♭' : '';
  return (
    <g>
      <LedgerLines x={x} y={y} />
      {acc && (
        <text x={x - 20} y={y + 5.5} className="staff-acc">
          {acc}
        </text>
      )}
      <ellipse cx={x} cy={y} rx={6.6} ry={4.9} transform={`rotate(-14 ${x} ${y})`} className="staff-notehead" />
      <line
        x1={stemUp ? x + 6 : x - 6}
        x2={stemUp ? x + 6 : x - 6}
        y1={y + (stemUp ? -1 : 1)}
        y2={y + (stemUp ? -36 : 36)}
        className="staff-stem"
      />
      {label && (
        <text x={x} y={BOTTOM + 34} textAnchor="middle" className="staff-label">
          {prettyName(name)}
        </text>
      )}
    </g>
  );
}

export function StaffGlyph({
  clef,
  notes,
  labels = false,
  height = 120,
}: {
  clef: Clef;
  notes: string[];
  labels?: boolean;
  height?: number;
}) {
  const startX = 78;
  const stepX = notes.length > 1 ? 48 : 0;
  const width = Math.max(170, startX + stepX * (notes.length - 1) + 60);
  const viewH = labels ? 138 : 118;

  return (
    <svg
      viewBox={`0 0 ${width} ${viewH}`}
      height={height}
      className="staff-glyph"
      role="img"
      aria-label={`${clef} clef: ${notes.map((n) => prettyName(n)).join(', ')}`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={6} x2={width - 6} y1={TOP + i * GAP} y2={TOP + i * GAP} className="staff-line" />
      ))}
      {clef === 'treble' ? (
        <text x={8} y={TOP + GAP * 3 + 11} className="staff-clef staff-clef-treble">𝄞</text>
      ) : (
        <text x={8} y={TOP + GAP * 3 - 2} className="staff-clef staff-clef-bass">𝄢</text>
      )}
      {notes.map((n, i) => (
        <Note key={`${n}-${i}`} clef={clef} name={n} x={startX + i * stepX} label={labels} />
      ))}
    </svg>
  );
}
