import { beforeEach, describe, expect, it } from 'vitest';
import { UNITS, findLesson } from '../curriculum';
import { generateQuestions, mulberry32 } from '../generate';
import { parseNote, neighborNames, prettyName } from '../notes';
import {
  currentStreak,
  decodeProgress,
  encodeProgress,
  lessonState,
  loadProgress,
  mergeProgress,
  recordLessonComplete,
  type Progress,
} from '../progress';

describe('note helpers', () => {
  it('parses names to MIDI', () => {
    expect(parseNote('C4').midi).toBe(60);
    expect(parseNote('A4').midi).toBe(69);
    expect(parseNote('F#3').midi).toBe(54);
    expect(parseNote('Bb2').midi).toBe(46);
  });

  it('builds diatonic neighbors', () => {
    expect(neighborNames('G4', 1)).toEqual(['F4', 'A4']);
  });

  it('pretty-prints accidentals', () => {
    expect(prettyName('F#4')).toBe('F♯4');
    expect(prettyName('Bb3', false)).toBe('B♭');
  });
});

describe('curriculum integrity', () => {
  it('has 5 units with unique lesson ids', () => {
    expect(UNITS.length).toBe(5);
    const ids = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(findLesson('treble-1')?.lesson.title).toMatch(/treble/i);
  });

  it('every exercise spec generates valid questions', () => {
    const rnd = mulberry32(42);
    for (const unit of UNITS) {
      for (const lesson of unit.lessons) {
        for (const item of lesson.items) {
          if (item.kind === 'tip') continue;
          const questions = generateQuestions(item, rnd);
          expect(questions.length).toBeGreaterThan(0);
          for (const q of questions) {
            if (q.choices) {
              expect(q.answerIndex).toBeGreaterThanOrEqual(0);
              expect(q.answerIndex!).toBeLessThan(q.choices.length);
              expect(new Set(q.choices).size).toBe(q.choices.length); // no duplicate chips
            }
            if (q.kind === 'tap-key') {
              expect(q.answerMidi).toBe(parseNote(q.noteName!).midi);
            }
            if (q.kind === 'timing') {
              expect(q.timing!.taps.length).toBeGreaterThan(0);
              for (const t of q.timing!.taps) expect(t).toBeLessThan(q.timing!.barBeats);
            }
          }
        }
      }
    }
  });

  it('note-name questions place the correct answer among the chips', () => {
    const rnd = mulberry32(7);
    const qs = generateQuestions({ kind: 'note-name', clef: 'treble', pool: ['E4', 'G4', 'B4'], count: 10 }, rnd);
    for (const q of qs) {
      expect(q.choices![q.answerIndex!]).toBe(prettyName(q.noteName!));
    }
  });
});

describe('progress & streaks', () => {
  beforeEach(() => localStorage.clear());

  it('opens every lesson from the start (no locking)', () => {
    const p = loadProgress();
    expect(p.xp).toBe(0);
    expect(lessonState(p, 0, 0)).toBe('available');
    expect(lessonState(p, 0, 1)).toBe('available');
    expect(lessonState(p, 4, 3)).toBe('available'); // last lesson of the last unit
  });

  it('marks a lesson done once completed, others stay open', () => {
    let p = loadProgress();
    p = recordLessonComplete(p, UNITS[2].lessons[1].id, 90, 100);
    expect(lessonState(p, 2, 1)).toBe('done');
    expect(lessonState(p, 2, 0)).toBe('available');
    expect(lessonState(p, 0, 0)).toBe('available');
  });

  it('keeps the best score and accumulates XP', () => {
    let p = loadProgress();
    p = recordLessonComplete(p, 'treble-1', 60, 50);
    p = recordLessonComplete(p, 'treble-1', 40, 30);
    expect(p.completed['treble-1']).toBe(60);
    expect(p.xp).toBe(80);
  });

  it('counts streaks day by day and breaks after a gap', () => {
    let p: Progress = loadProgress();
    p = recordLessonComplete(p, 'a', 100, 10, new Date('2026-07-01T10:00:00Z'));
    expect(p.streak).toBe(1);
    p = recordLessonComplete(p, 'b', 100, 10, new Date('2026-07-02T10:00:00Z'));
    expect(p.streak).toBe(2);
    p = recordLessonComplete(p, 'c', 100, 10, new Date('2026-07-02T20:00:00Z'));
    expect(p.streak).toBe(2); // same day
    p = recordLessonComplete(p, 'd', 100, 10, new Date('2026-07-05T10:00:00Z'));
    expect(p.streak).toBe(1); // gap broke it
    expect(currentStreak(p, new Date('2026-07-05T12:00:00Z'))).toBe(1);
    expect(currentStreak(p, new Date('2026-07-09T12:00:00Z'))).toBe(0);
  });
});

describe('cross-device sync', () => {
  it('round-trips progress through encode/decode', () => {
    const p: Progress = { xp: 340, streak: 4, lastActiveDay: '2026-07-06', completed: { 'treble-1': 95, 'bass-2': 80 } };
    const restored = decodeProgress(encodeProgress(p));
    expect(restored).toEqual(p);
  });

  it('rejects malformed codes', () => {
    expect(decodeProgress('not-valid-base64!!')).toBeNull();
    expect(decodeProgress(encodeProgress({ foo: 1 } as never))).toBeNull();
  });

  it('accepts a code even when pasted as a full ?sync= link tail', () => {
    const p: Progress = { xp: 10, streak: 1, lastActiveDay: '2026-07-06', completed: { 'treble-1': 100 } };
    const code = encodeProgress(p);
    // The panel strips the URL prefix before decoding; the raw code must parse.
    expect(decodeProgress(code)).toEqual(p);
  });

  it('merges progress keeping the best of each device', () => {
    const a: Progress = { xp: 200, streak: 3, lastActiveDay: '2026-07-04', completed: { 'treble-1': 90, 'treble-2': 60 } };
    const b: Progress = { xp: 150, streak: 5, lastActiveDay: '2026-07-06', completed: { 'treble-2': 80, 'bass-1': 100 } };
    const m = mergeProgress(a, b);
    expect(m.xp).toBe(200); // higher XP wins
    expect(m.streak).toBe(5); // more recent day owns the streak
    expect(m.lastActiveDay).toBe('2026-07-06');
    expect(m.completed).toEqual({ 'treble-1': 90, 'treble-2': 80, 'bass-1': 100 }); // per-lesson best
  });

  it('merge is safe when one side is empty', () => {
    const a: Progress = { xp: 0, streak: 0, lastActiveDay: null, completed: {} };
    const b: Progress = { xp: 50, streak: 2, lastActiveDay: '2026-07-06', completed: { 'treble-1': 70 } };
    expect(mergeProgress(a, b)).toEqual(b);
  });
});
