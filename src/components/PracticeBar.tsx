import { useAppStore } from '../app/store';
import { scoreController } from '../app/scoreController';
import { midiLabel } from '../learn/components/KeyboardSlice';

/** Status strip shown over the score during play-along practice. */
export function PracticeBar() {
  const practice = useAppStore((s) => s.practice);
  if (practice.state === 'off') return null;

  if (practice.state === 'done') {
    const total = practice.correct + practice.wrong;
    const accuracy = total > 0 ? Math.round((practice.correct / total) * 100) : 100;
    return (
      <div className="practice-bar practice-done">
        <span>🎉 Piece complete! {practice.correct} steps · {practice.wrong} wrong notes · {accuracy}% accuracy</span>
        <button className="btn btn-small" onClick={() => scoreController.stopPractice()}>Close</button>
      </div>
    );
  }

  return (
    <div className="practice-bar">
      <span className="practice-progress">
        Step {practice.stepIndex + 1}/{practice.totalSteps}
      </span>
      <span className="practice-expected">
        Play: {practice.expectedMidis.map(midiLabel).join(' + ') || '…'}
      </span>
      <span className="practice-score">✓ {practice.correct} · ✗ {practice.wrong}</span>
      <button className="btn btn-small" onClick={() => scoreController.stopPractice()}>Stop</button>
    </div>
  );
}
