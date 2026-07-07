import { beforeEach, describe, expect, it } from 'vitest';
import { UNITS, findLesson } from '../curriculum';
import { generateQuestions, mulberry32 } from '../generate';
import { parseNote, neighborNames, prettyName } from '../notes';
import {
  currentStreak,
  lessonState,
  loadProgress,
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

  it('starts empty and unlocks only the first lesson', () => {
    const p = loadProgress();
    expect(p.xp).toBe(0);
    expect(lessonState(p, 0, 0)).toBe('available');
    expect(lessonState(p, 0, 1)).toBe('locked');
    expect(lessonState(p, 1, 0)).toBe('locked');
  });

  it('unlocks sequentially and across units', () => {
    let p = loadProgress();
    for (const lesson of UNITS[0].lessons) p = recordLessonComplete(p, lesson.id, 90, 100);
    expect(lessonState(p, 0, 0)).toBe('done');
    expect(lessonState(p, 1, 0)).toBe('available');
    expect(lessonState(p, 2, 0)).toBe('locked');
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
