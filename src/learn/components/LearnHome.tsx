import { UNITS } from '../curriculum';
import type { Progress } from '../progress';
import { currentStreak, lessonState, unitCompletion } from '../progress';

export function LearnHome({
  progress,
  onStartLesson,
}: {
  progress: Progress;
  onStartLesson: (lessonId: string) => void;
}) {
  const streak = currentStreak(progress);
  return (
    <div className="learn-home">
      <div className="learn-stats">
        <div className="stat-pill" title="Daily streak">🔥 {streak}</div>
        <div className="stat-pill" title="Total XP">⚡ {progress.xp} XP</div>
      </div>

      <div className="tree">
        {UNITS.map((unit, ui) => {
          const { done, total } = unitCompletion(progress, ui);
          const unitLocked = UNITS[ui].lessons.every((_, li) => lessonState(progress, ui, li) === 'locked');
          return (
            <section key={unit.id} className={`tree-unit ${unitLocked ? 'unit-locked' : ''}`} style={{ ['--unit-color' as string]: unit.color }}>
              <header className="unit-head">
                <span className="unit-icon">{unit.icon}</span>
                <div>
                  <h2>{unit.title}</h2>
                  <span className="unit-progress">{done}/{total} lessons</span>
                </div>
                {unitLocked && <span className="unit-lock">🔒</span>}
              </header>
              <div className="unit-lessons">
                {unit.lessons.map((lesson, li) => {
                  const state = lessonState(progress, ui, li);
                  const score = progress.completed[lesson.id];
                  return (
                    <button
                      key={lesson.id}
                      className={`lesson-node node-${state}`}
                      disabled={state === 'locked'}
                      onClick={() => onStartLesson(lesson.id)}
                    >
                      <span className="node-circle">
                        {state === 'done' ? '✓' : state === 'locked' ? '🔒' : '★'}
                      </span>
                      <span className="node-text">
                        <span className="node-title">{lesson.title}</span>
                        <span className="node-blurb">
                          {state === 'done' ? `Best: ${score}% — tap to practice again` : lesson.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
