import { playNow } from '../../lib/audio/samplerEngine';

/**
 * An interactive slice of the piano for lesson answers. Bigger keys than the
 * main keyboard; highlights answer feedback.
 */

const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_W = 34;
const WHITE_H = 110;
const BLACK_W = 21;
const BLACK_H = 68;

export interface KeyFeedback {
  correctMidi?: number;
  wrongMidi?: number;
  highlight?: number[];
}

export function midiLabel(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function KeyboardSlice({
  fromMidi,
  toMidi,
  onKey,
  feedback = {},
  playOnTap = true,
  labelCs = true,
}: {
  fromMidi: number;
  toMidi: number;
  onKey?: (midi: number) => void;
  feedback?: KeyFeedback;
  playOnTap?: boolean;
  labelCs?: boolean;
}) {
  const keys: { midi: number; black: boolean; x: number }[] = [];
  let whiteIndex = 0;
  for (let midi = fromMidi; midi <= toMidi; midi++) {
    if (IS_BLACK[midi % 12]) {
      keys.push({ midi, black: true, x: whiteIndex * WHITE_W - BLACK_W / 2 });
    } else {
      keys.push({ midi, black: false, x: whiteIndex * WHITE_W });
      whiteIndex += 1;
    }
  }
  const width = whiteIndex * WHITE_W;

  const cls = (midi: number, black: boolean): string => {
    const c = [black ? 'kb-black' : 'kb-white'];
    if (feedback.correctMidi === midi) c.push('kb-correct');
    else if (feedback.wrongMidi === midi) c.push('kb-wrong');
    else if (feedback.highlight?.includes(midi)) c.push('kb-chord');
    return c.join(' ');
  };

  const press = (midi: number) => {
    if (playOnTap) void playNow([midiLabel(midi)], 0.8);
    onKey?.(midi);
  };

  return (
    <div className="kb-slice-wrap">
      <svg viewBox={`0 0 ${width} ${WHITE_H}`} className="kb-slice" role="group" aria-label="Answer keyboard">
        {keys.filter((k) => !k.black).map((k) => (
          <g key={k.midi}>
            <rect
              className={cls(k.midi, false)}
              data-midi={k.midi}
              x={k.x}
              y={0}
              width={WHITE_W}
              height={WHITE_H}
              rx={3}
              onPointerDown={() => press(k.midi)}
            />
            {labelCs && k.midi % 12 === 0 && (
              <text x={k.x + WHITE_W / 2} y={WHITE_H - 8} textAnchor="middle" className="kb-slice-label">
                {midiLabel(k.midi)}
              </text>
            )}
          </g>
        ))}
        {keys.filter((k) => k.black).map((k) => (
          <rect
            key={k.midi}
            className={cls(k.midi, true)}
            data-midi={k.midi}
            x={k.x}
            y={0}
            width={BLACK_W}
            height={BLACK_H}
            rx={2.5}
            onPointerDown={() => press(k.midi)}
          />
        ))}
      </svg>
    </div>
  );
}
