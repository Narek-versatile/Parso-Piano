import { useAppStore } from '../app/store';
import { scoreController } from '../app/scoreController';

export function AudienceToggle() {
  const audience = useAppStore((s) => s.audience);
  const set = useAppStore((s) => s.set);

  const choose = (value: 'beginner' | 'advanced') => {
    set({ audience: value });
    scoreController.refreshSections();
  };

  return (
    <div className="segmented" role="radiogroup" aria-label="Explanation level">
      <button
        role="radio"
        aria-checked={audience === 'beginner'}
        className={audience === 'beginner' ? 'seg-active' : ''}
        onClick={() => choose('beginner')}
      >
        Beginner
      </button>
      <button
        role="radio"
        aria-checked={audience === 'advanced'}
        className={audience === 'advanced' ? 'seg-active' : ''}
        onClick={() => choose('advanced')}
      >
        Advanced
      </button>
    </div>
  );
}
