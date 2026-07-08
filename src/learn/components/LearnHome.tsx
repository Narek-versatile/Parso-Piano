import { useState } from 'react';
import type { Progress } from '../progress';
import { currentStreak } from '../progress';
import { ConstellationGraph, type GraphTheme } from './graph/ConstellationGraph';
import { SyncPanel } from './SyncPanel';

const THEMES: { id: GraphTheme; label: string }[] = [
  { id: 'aurora', label: '🌌 Aurora' },
  { id: 'synthwave', label: '🌆 Synthwave' },
  { id: 'tree', label: '🌳 Living Tree' },
];

const PREF_KEY = 'parso-roadmap-pref';

function loadTheme(): GraphTheme {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
    return THEMES.some((t) => t.id === raw.theme) ? raw.theme : 'aurora';
  } catch {
    return 'aurora';
  }
}

export function LearnHome({
  progress,
  onStartLesson,
  onProgressChange,
}: {
  progress: Progress;
  onStartLesson: (lessonId: string) => void;
  onProgressChange: (p: Progress) => void;
}) {
  const [theme, setTheme] = useState<GraphTheme>(loadTheme);
  const streak = currentStreak(progress);

  const pick = (t: GraphTheme) => {
    setTheme(t);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ theme: t }));
    } catch {
      /* persistence is best-effort */
    }
  };

  return (
    <div className="learn-home learn-home-graph">
      <div className="learn-stats">
        <div className="stat-pill" title="Daily streak">🔥 {streak}</div>
        <div className="stat-pill" title="Total XP">⚡ {progress.xp} XP</div>
        <div className="theme-picker theme-picker-inline" role="group" aria-label="Graph theme">
          {THEMES.map((t) => (
            <button key={t.id} className={theme === t.id ? 'picked' : ''} onClick={() => pick(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <SyncPanel progress={progress} onImported={onProgressChange} />
      </div>

      <ConstellationGraph progress={progress} theme={theme} onStartLesson={onStartLesson} />
    </div>
  );
}
