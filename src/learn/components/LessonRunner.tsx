import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lesson, Question, TipCard } from '../types';
import { generateQuestions, mulberry32 } from '../generate';
import { StaffGlyph } from './StaffGlyph';
import { KeyboardSlice, midiLabel } from './KeyboardSlice';
import { playNow, ensureAudio } from '../../lib/audio/samplerEngine';
import { subscribeNotes } from '../../lib/input/pianoInput';
import { useAppStore } from '../../app/store';
import { prettyName } from '../notes';

type RunnerItem = { type: 'tip'; tip: TipCard } | { type: 'q'; q: Question; requeued: boolean };

interface Feedback {
  correct: boolean;
  text: string;
}

export function LessonRunner({
  lesson,
  onFinish,
  onExit,
}: {
  lesson: Lesson;
  onFinish: (scorePercent: number, xp: number) => void;
  onExit: () => void;
}) {
  const initialQueue = useMemo<RunnerItem[]>(() => {
    const rnd = mulberry32(Date.now() % 2147483647);
    const items: RunnerItem[] = [];
    for (const item of lesson.items) {
      if (item.kind === 'tip') items.push({ type: 'tip', tip: item });
      else for (const q of generateQuestions(item, rnd)) items.push({ type: 'q', q, requeued: false });
    }
    return items;
  }, [lesson]);

  const [queue, setQueue] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [xp, setXp] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [phase, setPhase] = useState<'run' | 'complete' | 'failed'>('run');
  const firstTryTotal = useRef(initialQueue.filter((i) => i.type === 'q').length);
  const firstTryCorrect = useRef(0);

  const current = queue[index];

  const answer = useCallback(
    (correct: boolean, explain: string) => {
      if (!current || current.type !== 'q' || feedback) return;
      if (correct) {
        const gained = current.requeued ? 5 : 10;
        if (!current.requeued) firstTryCorrect.current += 1;
        setXp((x) => x + gained);
        setFeedback({ correct: true, text: explain ? `Correct! ${explain}` : 'Correct!' });
      } else {
        setHearts((h) => h - 1);
        setFeedback({ correct: false, text: explain });
        // Requeue the question so the lesson ends only when everything is right.
        setQueue((qs) => [...qs, { type: 'q', q: current.q, requeued: true }]);
      }
    },
    [current, feedback],
  );

  const next = useCallback(() => {
    setFeedback(null);
    if (hearts <= 0) {
      setPhase('failed');
      return;
    }
    if (index + 1 >= queue.length) {
      const score = Math.round((firstTryCorrect.current / Math.max(1, firstTryTotal.current)) * 100);
      const total = xp + 20; // completion bonus
      setXp(total);
      setPhase('complete');
      onFinish(score, total);
      return;
    }
    setIndex(index + 1);
  }, [hearts, index, queue.length, xp, onFinish]);

  if (phase === 'failed') {
    return (
      <div className="runner runner-end">
        <div className="end-icon">💔</div>
        <h2>Out of hearts</h2>
        <p>No worries — mistakes are the drill working. Take a breath and run it again.</p>
        <button className="btn btn-primary btn-large" onClick={onExit}>
          Back to the tree
        </button>
      </div>
    );
  }

  if (phase === 'complete') {
    const score = Math.round((firstTryCorrect.current / Math.max(1, firstTryTotal.current)) * 100);
    return (
      <div className="runner runner-end">
        <div className="end-icon">🎉</div>
        <h2>Lesson complete!</h2>
        <div className="end-stats">
          <div className="end-stat"><span className="end-num">+{xp}</span> XP</div>
          <div className="end-stat"><span className="end-num">{score}%</span> first-try accuracy</div>
        </div>
        <button className="btn btn-primary btn-large" onClick={onExit}>
          Continue
        </button>
      </div>
    );
  }

  const progress = Math.round((index / Math.max(1, queue.length)) * 100);

  return (
    <div className="runner">
      <header className="runner-head">
        <button className="runner-close" onClick={onExit} aria-label="Exit lesson">✕</button>
        <div className="runner-bar"><div className="runner-bar-fill" style={{ width: `${progress}%` }} /></div>
        <div className="runner-hearts" aria-label={`${hearts} hearts left`}>
          {'❤️'.repeat(Math.max(0, hearts))}{'🖤'.repeat(Math.max(0, 5 - hearts))}
        </div>
      </header>

      <div className="runner-body">
        {current?.type === 'tip' && <TipView tip={current.tip} onContinue={next} />}
        {current?.type === 'q' && (
          <QuestionView key={index} q={current.q} onAnswer={answer} feedbackShown={!!feedback} />
        )}
      </div>

      {feedback && current?.type === 'q' && (
        <div className={`runner-feedback ${feedback.correct ? 'fb-correct' : 'fb-wrong'}`}>
          <div className="fb-text">{feedback.text}</div>
          <button className="btn btn-primary" onClick={next}>Continue</button>
        </div>
      )}
    </div>
  );
}

// ----- Tip card -----

function TipView({ tip, onContinue }: { tip: TipCard; onContinue: () => void }) {
  return (
    <div className="tip-card">
      <h2>{tip.title}</h2>
      {tip.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {tip.glyphLine && <div className="tip-glyphs">{tip.glyphLine}</div>}
      {tip.staffNotes && (
        <div className="tip-staff">
          <StaffGlyph clef={tip.staffNotes.clef} notes={tip.staffNotes.notes} labels={tip.staffNotes.labels} />
        </div>
      )}
      {tip.keyboardHighlight && (
        <KeyboardSlice fromMidi={60} toMidi={72} feedback={{ highlight: tip.keyboardHighlight }} />
      )}
      <button className="btn btn-primary btn-large" onClick={onContinue}>
        Got it
      </button>
    </div>
  );
}

// ----- Question dispatcher -----

function QuestionView({
  q,
  onAnswer,
  feedbackShown,
}: {
  q: Question;
  onAnswer: (correct: boolean, explain: string) => void;
  feedbackShown: boolean;
}) {
  switch (q.kind) {
    case 'note-name':
    case 'quiz':
      return <ChoiceExercise q={q} onAnswer={onAnswer} locked={feedbackShown} />;
    case 'tap-key':
      return <TapKeyExercise q={q} onAnswer={onAnswer} locked={feedbackShown} />;
    case 'ear':
      return <EarExercise q={q} onAnswer={onAnswer} locked={feedbackShown} />;
    case 'timing':
      return <TimingExercise q={q} onAnswer={onAnswer} locked={feedbackShown} />;
  }
}

// ----- Multiple choice (note-name & quiz) -----

function ChoiceExercise({
  q,
  onAnswer,
  locked,
}: {
  q: Question;
  onAnswer: (correct: boolean, explain: string) => void;
  locked: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (locked || picked !== null) return;
    setPicked(i);
    const correct = i === q.answerIndex;
    const right = q.choices![q.answerIndex!];
    // Hearing the note after answering reinforces the sound-name link.
    if (q.kind === 'note-name' && q.noteName) void playNow([q.noteName], 0.9);
    onAnswer(correct, correct ? '' : `The right answer is ${right}.`);
  };
  return (
    <div className="exercise">
      <h2 className="exercise-prompt">{q.prompt}</h2>
      {q.glyphLine && <div className="tip-glyphs">{q.glyphLine}</div>}
      {q.kind === 'note-name' && q.clef && q.noteName && (
        <div className="exercise-staff"><StaffGlyph clef={q.clef} notes={[q.noteName]} height={150} /></div>
      )}
      <div className={`chips ${q.kind === 'quiz' ? 'chips-column' : ''}`}>
        {q.choices!.map((c, i) => (
          <button
            key={i}
            className={`chip ${picked === i ? (i === q.answerIndex ? 'chip-correct' : 'chip-wrong') : ''} ${picked !== null && i === q.answerIndex ? 'chip-correct' : ''}`}
            onClick={() => pick(i)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// ----- Tap the key -----

function TapKeyExercise({
  q,
  onAnswer,
  locked,
}: {
  q: Question;
  onAnswer: (correct: boolean, explain: string) => void;
  locked: boolean;
}) {
  const [result, setResult] = useState<{ midi: number; correct: boolean } | null>(null);
  const inputStatus = useAppStore((s) => s.inputStatus);
  const answered = useRef(false);

  const range = useMemo(() => {
    const center = q.answerMidi!;
    const from = Math.floor((center - 8) / 12) * 12; // start on a C
    return { from: Math.max(21, from), to: Math.min(108, from + 24) };
  }, [q.answerMidi]);

  const handle = useCallback(
    (midi: number) => {
      if (locked || answered.current) return;
      answered.current = true;
      const correct = midi === q.answerMidi;
      setResult({ midi, correct });
      onAnswer(
        correct,
        correct
          ? ''
          : `You played ${midiLabel(midi)} — the note is ${prettyName(q.noteName!)} (${midiLabel(q.answerMidi!)}).`,
      );
    },
    [locked, q, onAnswer],
  );

  // Real piano answers.
  useEffect(() => subscribeNotes((midi) => handle(midi)), [handle]);

  return (
    <div className="exercise">
      <h2 className="exercise-prompt">{q.prompt}</h2>
      <div className="exercise-staff"><StaffGlyph clef={q.clef!} notes={[q.noteName!]} height={150} /></div>
      {inputStatus !== 'off' && <div className="input-hint">🎹 You can answer on your piano</div>}
      <KeyboardSlice
        fromMidi={range.from}
        toMidi={range.to}
        onKey={handle}
        feedback={
          result
            ? result.correct
              ? { correctMidi: result.midi }
              : { wrongMidi: result.midi, correctMidi: q.answerMidi }
            : {}
        }
      />
    </div>
  );
}

// ----- Ear training -----

function EarExercise({
  q,
  onAnswer,
  locked,
}: {
  q: Question;
  onAnswer: (correct: boolean, explain: string) => void;
  locked: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [played, setPlayed] = useState(false);

  const play = async () => {
    await ensureAudio();
    q.earMidis!.forEach((midi, i) => {
      setTimeout(() => void playNow([midiLabel(midi)], 0.9), i * 900);
    });
    setPlayed(true);
  };

  const pick = (i: number) => {
    if (locked || picked !== null || !played) return;
    setPicked(i);
    const correct = i === q.answerIndex;
    onAnswer(correct, correct ? '' : `It was: ${q.choices![q.answerIndex!]}.`);
  };

  return (
    <div className="exercise">
      <h2 className="exercise-prompt">{q.prompt}</h2>
      <button className="btn btn-primary btn-large ear-play" onClick={() => void play()}>
        {played ? '🔁 Play again' : '▶ Play'}
      </button>
      <div className="chips">
        {q.choices!.map((c, i) => (
          <button
            key={i}
            className={`chip ${picked === i ? (i === q.answerIndex ? 'chip-correct' : 'chip-wrong') : ''} ${picked !== null && i === q.answerIndex ? 'chip-correct' : ''} ${!played ? 'chip-disabled' : ''}`}
            onClick={() => pick(i)}
          >
            {c}
          </button>
        ))}
      </div>
      {!played && <p className="ear-hint">Play the sound first, then answer.</p>}
    </div>
  );
}

// ----- Timing drill -----

type TapMark = { beat: number; verdict: 'perfect' | 'good' | 'miss' };

function TimingExercise({
  q,
  onAnswer,
  locked,
}: {
  q: Question;
  onAnswer: (correct: boolean, explain: string) => void;
  locked: boolean;
}) {
  const t = q.timing!;
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [beatNow, setBeatNow] = useState(-1);
  const [marks, setMarks] = useState<TapMark[]>([]);
  const startRef = useRef(0);
  const tapsRef = useRef<number[]>([]);
  const timersRef = useRef<number[]>([]);
  const beatMs = 60000 / t.bpm;
  const COUNT_IN = 4;

  const start = async () => {
    if (state === 'running') return;
    await ensureAudio();
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    tapsRef.current = [];
    setMarks([]);
    setState('running');

    const totalBeats = COUNT_IN + t.barBeats;
    const t0 = ctx.currentTime + 0.15;
    startRef.current = performance.now() + 150;

    for (let b = 0; b < totalBeats; b++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = b < COUNT_IN ? 1320 : b % t.barBeats === 0 ? 1100 : 880;
      gain.gain.setValueAtTime(0.25, t0 + b * (beatMs / 1000));
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + b * (beatMs / 1000) + 0.07);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + b * (beatMs / 1000));
      osc.stop(t0 + b * (beatMs / 1000) + 0.09);
      timersRef.current.push(window.setTimeout(() => setBeatNow(b), 150 + b * beatMs));
    }

    // Evaluate shortly after the final expected tap window closes.
    const endMs = 150 + (COUNT_IN + t.barBeats) * beatMs + 400;
    timersRef.current.push(
      window.setTimeout(() => {
        void ctx.close();
        evaluate();
      }, endMs),
    );
  };

  const tap = useCallback(() => {
    if (state !== 'running') return;
    tapsRef.current.push(performance.now());
  }, [state]);

  // Real piano taps count too.
  useEffect(() => subscribeNotes(() => tap()), [tap]);

  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const evaluate = () => {
    const expected = t.taps.map((beat) => startRef.current + (COUNT_IN + beat) * beatMs);
    const taps = tapsRef.current;
    const results: TapMark[] = expected.map((time, i) => {
      let best = Infinity;
      for (const tapTime of taps) best = Math.min(best, Math.abs(tapTime - time));
      const verdict = best <= 100 ? 'perfect' : best <= 200 ? 'good' : 'miss';
      return { beat: t.taps[i], verdict };
    });
    setMarks(results);
    setState('done');
    const misses = results.filter((r) => r.verdict === 'miss').length;
    const perfects = results.filter((r) => r.verdict === 'perfect').length;
    const correct = misses === 0;
    onAnswer(
      correct,
      correct
        ? `${perfects}/${results.length} perfect.`
        : `${misses} tap${misses > 1 ? 's' : ''} missed the window — try locking onto the click.`,
    );
  };

  return (
    <div className="exercise">
      <h2 className="exercise-prompt">Tap the rhythm: {t.label}</h2>
      <div className="timing-glyphs">{t.glyphs}</div>
      <div className="timing-beats">
        {Array.from({ length: COUNT_IN + t.barBeats }, (_, b) => (
          <span
            key={b}
            className={`beat-dot ${b < COUNT_IN ? 'beat-countin' : ''} ${beatNow === b && state === 'running' ? 'beat-now' : ''}`}
          >
            {b < COUNT_IN ? '•' : b - COUNT_IN + 1}
          </span>
        ))}
      </div>
      {state === 'idle' && !locked && (
        <button className="btn btn-primary btn-large" onClick={() => void start()}>
          ▶ Start (4 clicks count you in)
        </button>
      )}
      {state === 'running' && (
        <button className="tap-pad" onPointerDown={tap}>
          TAP
        </button>
      )}
      {state === 'done' && (
        <div className="timing-results">
          {marks.map((m, i) => (
            <span key={i} className={`mark mark-${m.verdict}`}>
              beat {1 + m.beat}: {m.verdict}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
