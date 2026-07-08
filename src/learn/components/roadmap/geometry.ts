import { UNITS } from '../../curriculum';
import type { Progress } from '../../progress';
import { lessonState, type LockState } from '../../progress';

/**
 * Layout engine for the skill roadmap. Produces node coordinates and SVG
 * connector paths for two shapes:
 *  - 'path':   one winding S-curve from bottom of the journey to the top
 *  - 'branch': a central trunk with unit branches fanning out left/right
 * Coordinates live in a fixed-width design space (WIDTH px) and natural
 * pixel heights; the component scales horizontally via percentages.
 */

export const ROADMAP_WIDTH = 420;

export type RoadmapLayout = 'path' | 'branch';

export interface RoadNode {
  kind: 'lesson';
  lessonId: string;
  title: string;
  blurb: string;
  unitIndex: number;
  lessonIndex: number;
  state: LockState;
  score?: number;
  x: number;
  y: number;
}

export interface UnitMarker {
  kind: 'unit';
  unitIndex: number;
  title: string;
  icon: string;
  color: string;
  locked: boolean;
  done: number;
  total: number;
  x: number;
  y: number;
}

export interface Connector {
  d: string;
  unitIndex: number;
  /** True when the segment leads to a completed/available node (lit up) */
  lit: boolean;
  /** Branch connectors get tapered widths */
  trunk?: boolean;
}

export interface RoadmapGeometry {
  nodes: RoadNode[];
  markers: UnitMarker[];
  connectors: Connector[];
  height: number;
}

function curveBetween(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

export function buildGeometry(progress: Progress, layout: RoadmapLayout): RoadmapGeometry {
  return layout === 'path' ? buildPath(progress) : buildBranch(progress);
}

/** One continuous serpentine trail; units introduced by milestone banners. */
function buildPath(progress: Progress): RoadmapGeometry {
  const cx = ROADMAP_WIDTH / 2;
  const amplitude = 118;
  const stepY = 108;
  const nodes: RoadNode[] = [];
  const markers: UnitMarker[] = [];
  const connectors: Connector[] = [];

  let y = 96;
  let phase = 0;
  let prev: { x: number; y: number } | null = null;

  UNITS.forEach((unit, ui) => {
    const done = unit.lessons.filter((l) => progress.completed[l.id] !== undefined).length;
    const locked = unit.lessons.every((_, li) => lessonState(progress, ui, li) === 'locked');
    markers.push({
      kind: 'unit', unitIndex: ui, title: unit.title, icon: unit.icon, color: unit.color,
      locked, done, total: unit.lessons.length, x: cx, y,
    });
    y += 92;

    unit.lessons.forEach((lesson, li) => {
      const x = cx + amplitude * Math.sin(phase);
      phase += 1.05;
      const state = lessonState(progress, ui, li);
      const node: RoadNode = {
        kind: 'lesson', lessonId: lesson.id, title: lesson.title, blurb: lesson.blurb,
        unitIndex: ui, lessonIndex: li, state, score: progress.completed[lesson.id], x, y,
      };
      if (prev) {
        connectors.push({
          d: curveBetween(prev.x, prev.y, x, y),
          unitIndex: ui,
          lit: state !== 'locked',
        });
      }
      nodes.push(node);
      prev = { x, y };
      y += stepY;
    });
    y += 36;
  });

  return { nodes, markers, connectors, height: y + 60 };
}

/** Central trunk with unit branches alternating left/right. */
function buildBranch(progress: Progress): RoadmapGeometry {
  const cx = ROADMAP_WIDTH / 2;
  const nodes: RoadNode[] = [];
  const markers: UnitMarker[] = [];
  const connectors: Connector[] = [];

  let y = 110;
  let prevHub: { x: number; y: number } | null = null;

  UNITS.forEach((unit, ui) => {
    const side = ui % 2 === 0 ? -1 : 1;
    const done = unit.lessons.filter((l) => progress.completed[l.id] !== undefined).length;
    const locked = unit.lessons.every((_, li) => lessonState(progress, ui, li) === 'locked');
    const hub = { x: cx, y };

    if (prevHub) {
      connectors.push({
        d: curveBetween(prevHub.x, prevHub.y, hub.x, hub.y),
        unitIndex: ui,
        lit: !locked,
        trunk: true,
      });
    }
    markers.push({
      kind: 'unit', unitIndex: ui, title: unit.title, icon: unit.icon, color: unit.color,
      locked, done, total: unit.lessons.length, x: cx, y,
    });

    // Lessons along a curved branch reaching out and down from the hub.
    const n = unit.lessons.length;
    let px = hub.x;
    let py = hub.y;
    unit.lessons.forEach((lesson, li) => {
      const t = (li + 1) / n;
      const reach = side * (42 + 98 * t);
      const x = cx + reach;
      const ny = y + 66 + li * 96;
      const state = lessonState(progress, ui, li);
      connectors.push({
        d: `M ${px} ${py} Q ${cx + side * (28 + 88 * t)} ${(py + ny) / 2} ${x} ${ny}`,
        unitIndex: ui,
        lit: state !== 'locked',
      });
      nodes.push({
        kind: 'lesson', lessonId: lesson.id, title: lesson.title, blurb: lesson.blurb,
        unitIndex: ui, lessonIndex: li, state, score: progress.completed[lesson.id], x, y: ny,
      });
      px = x;
      py = ny;
    });

    prevHub = hub;
    y += 66 + n * 96 + 46;
  });

  return { nodes, markers, connectors, height: y + 40 };
}
