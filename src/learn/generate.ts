import type { ExerciseSpec, Question } from './types';
import { neighborNames, parseNote, prettyName } from './notes';

/** Deterministic PRNG so tests can reproduce lessons. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/** Build answer chips: the right name + plausible neighbors, shuffled. */
function noteChoices(name: string, pool: string[], rnd: () => number, withOctave: boolean): { choices: string[]; answerIndex: number } {
  const wrong = new Set<string>();
  // Prefer distractors from the lesson pool, then staff neighbors.
  for (const p of shuffle(pool.filter((n) => n !== name), rnd)) {
    if (wrong.size >= 3) break;
    wrong.add(prettyName(p, withOctave));
  }
  for (const n of shuffle(neighborNames(name, 2), rnd)) {
    if (wrong.size >= 3) break;
    const pretty = prettyName(n, withOctave);
    if (pretty !== prettyName(name, withOctave)) wrong.add(pretty);
  }
  const correct = prettyName(name, withOctave);
  const choices = shuffle([correct, ...[...wrong].filter((w) => w !== correct).slice(0, 3)], rnd);
  return { choices, answerIndex: choices.indexOf(correct) };
}

/** Expand a declarative exercise spec into concrete questions. */
export function generateQuestions(spec: ExerciseSpec, rnd: () => number): Question[] {
  switch (spec.kind) {
    case 'note-name': {
      const questions: Question[] = [];
      let last = '';
      for (let i = 0; i < spec.count; i++) {
        let name = pick(spec.pool, rnd);
        if (name === last && spec.pool.length > 1) name = pick(spec.pool.filter((n) => n !== last), rnd);
        last = name;
        const withOctave = !spec.withAccidentals; // accidental drills quiz the letter+sign
        const { choices, answerIndex } = noteChoices(name, spec.pool, rnd, withOctave);
        questions.push({
          kind: 'note-name',
          prompt: 'What note is this?',
          clef: spec.clef,
          noteName: name,
          choices,
          answerIndex,
        });
      }
      return questions;
    }

    case 'tap-key': {
      const questions: Question[] = [];
      let last = '';
      for (let i = 0; i < spec.count; i++) {
        let name = pick(spec.pool, rnd);
        if (name === last && spec.pool.length > 1) name = pick(spec.pool.filter((n) => n !== last), rnd);
        last = name;
        questions.push({
          kind: 'tap-key',
          prompt: 'Tap this note on the keyboard',
          clef: spec.clef,
          noteName: name,
          answerMidi: parseNote(name).midi,
        });
      }
      return questions;
    }

    case 'ear': {
      const questions: Question[] = [];
      for (let i = 0; i < spec.count; i++) {
        if (spec.mode === 'higher-lower') {
          // Two notes, 3–12 semitones apart, C3..C6.
          const a = 48 + Math.floor(rnd() * 25);
          const gap = 3 + Math.floor(rnd() * 10);
          const up = rnd() < 0.5;
          const b = up ? Math.min(84, a + gap) : Math.max(48, a - gap);
          const secondHigher = b > a;
          questions.push({
            kind: 'ear',
            prompt: 'Listen: is the second note higher or lower?',
            earMidis: [a, b],
            choices: ['Higher', 'Lower'],
            answerIndex: secondHigher ? 0 : 1,
          });
        } else {
          const name = pick(spec.pool, rnd);
          const choices = shuffle(spec.pool.map((n) => prettyName(n)), rnd);
          questions.push({
            kind: 'ear',
            prompt: 'Listen: which landmark note is this?',
            earMidis: [parseNote(name).midi],
            choices,
            answerIndex: choices.indexOf(prettyName(name)),
          });
        }
      }
      return questions;
    }

    case 'timing': {
      return spec.patterns.slice(0, spec.count).map((p) => ({
        kind: 'timing' as const,
        prompt: p.label,
        timing: { bpm: spec.bpm, taps: p.taps, glyphs: p.glyphs, label: p.label, barBeats: p.barBeats ?? 4 },
      }));
    }

    case 'quiz': {
      return spec.questions.map((q) => {
        const order = shuffle(q.choices.map((_, i) => i), rnd);
        return {
          kind: 'quiz' as const,
          prompt: q.prompt,
          choices: order.map((i) => q.choices[i]),
          answerIndex: order.indexOf(q.answer),
          glyphLine: q.glyphLine,
        };
      });
    }
  }
}
