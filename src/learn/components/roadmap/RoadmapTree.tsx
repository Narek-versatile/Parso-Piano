import type { Progress } from '../../progress';
import { buildGeometry, ROADMAP_WIDTH, type RoadmapLayout } from './geometry';
import './roadmap.css';

export type RoadmapTheme = 'aurora' | 'synthwave' | 'tree';

const NODE_ICON: Record<RoadmapTheme, { done: string; available: string; locked: string }> = {
  aurora: { done: '✦', available: '★', locked: '🔒' },
  synthwave: { done: '✓', available: '▶', locked: '🔒' },
  tree: { done: '🌸', available: '🌱', locked: '🔒' },
};

/**
 * The visual skill roadmap: SVG connectors + positioned HTML nodes, themed
 * via CSS. Coordinates come from the geometry engine; horizontal positions
 * are percentages of the design width so the map scales with its container.
 */
export function RoadmapTree({
  progress,
  theme,
  layout,
  onStartLesson,
}: {
  progress: Progress;
  theme: RoadmapTheme;
  layout: RoadmapLayout;
  onStartLesson: (lessonId: string) => void;
}) {
  const geo = buildGeometry(progress, layout);
  const pct = (x: number) => `${(x / ROADMAP_WIDTH) * 100}%`;
  const icons = NODE_ICON[theme];

  return (
    <div className={`roadmap theme-${theme} layout-${layout}`} style={{ height: geo.height }}>
      {/* Ambient theme decorations */}
      <div className="rm-bg" aria-hidden>
        {theme === 'aurora' && (
          <>
            <div className="aurora-blob blob-a" />
            <div className="aurora-blob blob-b" />
            <div className="aurora-blob blob-c" />
            <div className="starfield" />
          </>
        )}
        {theme === 'synthwave' && (
          <>
            <div className="synth-sun" />
            <div className="synth-grid" />
            <div className="synth-scan" />
          </>
        )}
        {theme === 'tree' && (
          <>
            <div className="canopy canopy-a" />
            <div className="canopy canopy-b" />
            <div className="fireflies" />
          </>
        )}
      </div>

      <svg
        className="rm-svg"
        viewBox={`0 0 ${ROADMAP_WIDTH} ${geo.height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="rm-lit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="grad-lit-a" />
            <stop offset="100%" className="grad-lit-b" />
          </linearGradient>
          <filter id="rm-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {geo.connectors.map((c, i) => (
          <path
            key={i}
            d={c.d}
            className={`rm-connector ${c.lit ? 'rm-lit' : 'rm-dim'} ${c.trunk ? 'rm-trunk' : ''}`}
            style={{ animationDelay: `${Math.min(i * 90, 1400)}ms` }}
          />
        ))}
      </svg>

      {geo.markers.map((m) => (
        <div
          key={`u${m.unitIndex}`}
          className={`rm-marker ${m.locked ? 'rm-marker-locked' : ''}`}
          style={{ left: pct(m.x), top: m.y, ['--unit-color' as string]: m.color }}
        >
          <span className="rm-marker-icon">{m.icon}</span>
          <span className="rm-marker-text">
            <span className="rm-marker-title">{m.title}</span>
            <span className="rm-marker-sub">{m.locked ? 'Locked' : `${m.done}/${m.total} lessons`}</span>
          </span>
        </div>
      ))}

      {geo.nodes.map((n) => {
        const unitColor = geo.markers[n.unitIndex]?.color ?? '#7c5cff';
        return (
          <button
            key={n.lessonId}
            className={`rm-node rm-${n.state}`}
            disabled={n.state === 'locked'}
            style={{
              left: pct(n.x),
              top: n.y,
              ['--unit-color' as string]: unitColor,
              ['--score' as string]: `${(n.score ?? 0) * 3.6}deg`,
            }}
            onClick={() => onStartLesson(n.lessonId)}
            aria-label={`${n.title} — ${n.state === 'done' ? `completed, best ${n.score}%` : n.state}`}
          >
            {n.state === 'available' && <span className="rm-start-bubble">START</span>}
            <span className="rm-orb">
              <span className="rm-orb-icon">{icons[n.state]}</span>
            </span>
            <span className="rm-node-label">
              <span className="rm-node-title">{n.title}</span>
              <span className="rm-node-blurb">{n.state === 'done' ? `Best ${n.score}%` : n.blurb}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
