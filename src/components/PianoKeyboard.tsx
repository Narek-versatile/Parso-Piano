import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../app/store';
import { playNow } from '../lib/audio/samplerEngine';

const FIRST_MIDI = 21; // A0
const LAST_MIDI = 108; // C8
const WHITE_W = 13;
const WHITE_H = 52;
const BLACK_W = 8;
const BLACK_H = 32;

const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyGeom {
  midi: number;
  black: boolean;
  x: number;
  label?: string;
}

function buildKeys(): { keys: KeyGeom[]; width: number } {
  const keys: KeyGeom[] = [];
  let whiteIndex = 0;
  for (let midi = FIRST_MIDI; midi <= LAST_MIDI; midi++) {
    const pc = midi % 12;
    if (IS_BLACK[pc]) {
      keys.push({ midi, black: true, x: whiteIndex * WHITE_W - BLACK_W / 2 });
    } else {
      const octave = Math.floor(midi / 12) - 1;
      keys.push({
        midi,
        black: false,
        x: whiteIndex * WHITE_W,
        label: pc === 0 ? `C${octave}` : undefined,
      });
      whiteIndex += 1;
    }
  }
  return { keys, width: whiteIndex * WHITE_W };
}

export function PianoKeyboard() {
  const selectedMidi = useAppStore((s) => s.selectedMidi);
  const chordMidis = useAppStore((s) => s.chordMidis);
  const activeMidis = useAppStore((s) => s.activeMidis);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { keys, width } = useMemo(buildKeys, []);

  // Keep highlighted keys visible on narrow screens.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const targets = activeMidis.length > 0 ? activeMidis : selectedMidi !== null ? [selectedMidi, ...chordMidis] : [];
    if (targets.length === 0) return;
    const mean = targets.reduce((a, b) => a + b, 0) / targets.length;
    const key = keys.find((k) => k.midi === Math.round(mean)) ?? keys.find((k) => k.midi === targets[0]);
    if (!key) return;
    const x = key.x - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
  }, [selectedMidi, chordMidis, activeMidis, keys]);

  const classFor = (midi: number, black: boolean): string => {
    const cls = [black ? 'kb-black' : 'kb-white'];
    if (activeMidis.includes(midi)) cls.push('kb-playing');
    else if (midi === selectedMidi) cls.push('kb-selected');
    else if (chordMidis.includes(midi)) cls.push('kb-chord');
    return cls.join(' ');
  };

  const pressKey = (midi: number) => {
    const pc = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    void playNow([`${NOTE_NAMES[pc]}${octave}`], 0.8);
  };

  return (
    <div className="keyboard-scroll" ref={scrollRef} aria-label="Piano keyboard">
      <svg
        width={width}
        height={WHITE_H}
        viewBox={`0 0 ${width} ${WHITE_H}`}
        className="keyboard-svg"
        role="img"
      >
        {keys.filter((k) => !k.black).map((k) => (
          <g key={k.midi}>
            <rect
              className={classFor(k.midi, false)}
              x={k.x}
              y={0}
              width={WHITE_W}
              height={WHITE_H}
              rx={1.5}
              onPointerDown={() => pressKey(k.midi)}
            />
            {k.label && (
              <text x={k.x + WHITE_W / 2} y={WHITE_H - 4} className="kb-label" textAnchor="middle">
                {k.label}
              </text>
            )}
          </g>
        ))}
        {keys.filter((k) => k.black).map((k) => (
          <rect
            key={k.midi}
            className={classFor(k.midi, true)}
            x={k.x}
            y={0}
            width={BLACK_W}
            height={BLACK_H}
            rx={1.2}
            onPointerDown={() => pressKey(k.midi)}
          />
        ))}
      </svg>
    </div>
  );
}
