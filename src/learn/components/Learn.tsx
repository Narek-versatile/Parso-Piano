import { useState } from 'react';
import { LearnHome } from './LearnHome';
import { LessonRunner } from './LessonRunner';
import { findLesson } from '../curriculum';
import { loadProgress, recordLessonComplete } from '../progress';

/** The Learn tab: skill tree ↔ lesson runner. */
export function Learn() {
  const [progress, setProgress] = useState(loadProgress);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const active = activeLessonId ? findLesson(activeLessonId) : undefined;

  if (active) {
    return (
      <LessonRunner
        lesson={active.lesson}
        onFinish={(score, xp) => {
          setProgress((p) => recordLessonComplete(p, active.lesson.id, score, xp));
        }}
        onExit={() => setActiveLessonId(null)}
      />
    );
  }

  return (
    <LearnHome progress={progress} onStartLesson={setActiveLessonId} onProgressChange={setProgress} />
  );
}
