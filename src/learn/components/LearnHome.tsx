import { useState } from 'react';
import type { Progress } from '../progress';
import { currentStreak } from '../progress';
import { RoadmapTree, type RoadmapTheme } from './roadmap/RoadmapTree';
import type { RoadmapLayout } from './roadmap/geometry';

const THEMES: { id: RoadmapTheme; label: string }[] = [
  { id: 'aurora', label: '🌌 Aurora' },
  { id: 'synthwave', label: '🌆 Synthwave' },
  { id: 'tree', label: '🌳 Living Tree' },
];
const LAYOUTS: { id: RoadmapLayout; label: string }[] = [
  { id: 'path', label: '🛤 Path' },
  { id: 'branch', label: '🌿 Branches' },
];

const PREF_KEY = 'parso-roadmap-pref';

function loadPref(): { theme: RoadmapTheme; layout: RoadmapLayout } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
    return {
      theme: THEMES.some((t) => t.id === raw.theme) ? raw.theme : 'aurora',
      layout: LAYOUTS.some((l) => l.id === raw.layout) ? raw.layout : 'path',
    };
  } catch {
    return { theme: 'aurora', layout: 'path' };
  }
}

export function LearnHome({
  progress,
  onStartLesson,
}: {
  progress: Progress;
  onStartLesson: (lessonId: string) => void;
}) {
  const [pref, setPref] = useState(loadPref);
  const streak = currentStreak(progress);

  const update = (partial: Partial<typeof pref>) => {
    const next = { ...pref, ...partial };
    setPref(next);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {
      /* persistence is best-effort */
    }
  };

  return (
    <div className="learn-home">
      <div className="learn-stats">
        <div className="stat-pill" title="Daily streak">🔥 {streak}</div>
        <div className="stat-pill" title="Total XP">⚡ {progress.xp} XP</div>
      </div>

      {/* Temporary style chooser — remove once a theme is picked */}
      <div className="theme-picker" role="group" aria-label="Roadmap style">
        <span className="picker-label">Theme</span>
        {THEMES.map((t) => (
          <button key={t.id} className={pref.theme === t.id ? 'picked' : ''} onClick={() => update({ theme: t.id })}>
            {t.label}
          </button>
        ))}
        <span className="picker-label">Shape</span>
        {LAYOUTS.map((l) => (
          <button key={l.id} className={pref.layout === l.id ? 'picked' : ''} onClick={() => update({ layout: l.id })}>
            {l.label}
          </button>
        ))}
      </div>

      <RoadmapTree progress={progress} theme={pref.theme} layout={pref.layout} onStartLesson={onStartLesson} />
    </div>
  );
}
