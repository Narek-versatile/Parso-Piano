import { useEffect, useRef } from 'react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { UNITS } from '../../curriculum';
import type { Progress } from '../../progress';
import { lessonState, type LockState } from '../../progress';
import './graph.css';

export type GraphTheme = 'aurora' | 'synthwave' | 'tree';

interface GNode extends SimulationNodeDatum {
  id: string;
  type: 'root' | 'hub' | 'lesson';
  r: number;
  title: string;
  icon: string;
  unitIndex: number;
  state: LockState | 'root';
  score?: number;
  lessonId?: string;
  /** Per-node phase for the ambient wander */
  phase: number;
}

interface GLink {
  source: string | GNode;
  target: string | GNode;
  dist: number;
  kind: 'trunk' | 'spoke' | 'chain';
  lit: boolean;
}

function buildGraph(progress: Progress): { nodes: GNode[]; links: GLink[] } {
  const nodes: GNode[] = [];
  const links: GLink[] = [];

  nodes.push({
    id: 'root', type: 'root', r: 34, title: 'Parso', icon: '🎹',
    unitIndex: -1, state: 'root', phase: Math.random() * Math.PI * 2,
  });

  UNITS.forEach((unit, ui) => {
    const locked = unit.lessons.every((_, li) => lessonState(progress, ui, li) === 'locked');
    const hubId = `hub-${unit.id}`;
    nodes.push({
      id: hubId, type: 'hub', r: 27, title: unit.title, icon: unit.icon,
      unitIndex: ui, state: locked ? 'locked' : 'available', phase: Math.random() * Math.PI * 2,
    });
    links.push({
      source: ui === 0 ? 'root' : `hub-${UNITS[ui - 1].id}`,
      target: hubId,
      dist: 150,
      kind: 'trunk',
      lit: !locked,
    });

    let prevId = hubId;
    unit.lessons.forEach((lesson, li) => {
      const state = lessonState(progress, ui, li);
      const id = `lesson-${lesson.id}`;
      nodes.push({
        id, type: 'lesson', r: 16, title: lesson.title, icon: unit.icon,
        unitIndex: ui, state, score: progress.completed[lesson.id],
        lessonId: lesson.id, phase: Math.random() * Math.PI * 2,
      });
      // Chain within the unit + a spoke back to the hub → organic clusters.
      links.push({ source: prevId, target: id, dist: 62, kind: 'chain', lit: state !== 'locked' });
      if (li > 0) links.push({ source: hubId, target: id, dist: 74 + li * 14, kind: 'spoke', lit: state !== 'locked' });
      prevId = id;
    });
  });

  return { nodes, links };
}

/**
 * Obsidian-style living skill graph: a d3-force simulation that never fully
 * sleeps (gentle wander keeps nodes floating), with dragging, pan/zoom and
 * hover-connected highlighting. Rendering is direct-to-SVG on each tick.
 */
export function ConstellationGraph({
  progress,
  theme,
  onStartLesson,
}: {
  progress: Progress;
  theme: GraphTheme;
  onStartLesson: (lessonId: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onStartRef = useRef(onStartLesson);
  onStartRef.current = onStartLesson;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const { nodes, links } = buildGraph(progress);

    // ----- Static SVG scaffold -----
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'cg-svg');
    const world = document.createElementNS(svgNS, 'g');
    svg.appendChild(world);
    host.appendChild(svg);

    const linkEls = links.map((l) => {
      const el = document.createElementNS(svgNS, 'line');
      el.setAttribute('class', `cg-link cg-${l.kind} ${l.lit ? 'cg-lit' : 'cg-dim'}`);
      world.appendChild(el);
      return el;
    });

    const nodeEls = nodes.map((n) => {
      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('class', `cg-node cg-${n.type} cg-state-${n.state}`);
      g.setAttribute('data-id', n.id);
      const unitColor = n.unitIndex >= 0 ? UNITS[n.unitIndex].color : '#7c5cff';
      g.style.setProperty('--unit-color', unitColor);

      const halo = document.createElementNS(svgNS, 'circle');
      halo.setAttribute('class', 'cg-halo');
      halo.setAttribute('r', String(n.r + 7));
      g.appendChild(halo);

      if (n.type === 'lesson' && n.state === 'done') {
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('class', 'cg-score-ring');
        ring.setAttribute('r', String(n.r + 3.5));
        const c = 2 * Math.PI * (n.r + 3.5);
        ring.setAttribute('stroke-dasharray', `${(c * (n.score ?? 0)) / 100} ${c}`);
        g.appendChild(ring);
      }

      const body = document.createElementNS(svgNS, 'circle');
      body.setAttribute('class', 'cg-body');
      body.setAttribute('r', String(n.r));
      g.appendChild(body);

      const icon = document.createElementNS(svgNS, 'text');
      icon.setAttribute('class', 'cg-icon');
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('dy', n.type === 'lesson' ? '4.5' : '7');
      icon.textContent = n.type === 'lesson' ? (n.state === 'done' ? '✓' : n.state === 'available' ? '★' : '🔒') : n.icon;
      g.appendChild(icon);

      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('class', 'cg-label');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dy', String(n.r + 15));
      label.textContent = n.type === 'root' ? 'Start here' : n.title;
      g.appendChild(label);

      world.appendChild(g);
      return g;
    });

    // ----- Physics -----
    const sim: Simulation<GNode, undefined> = forceSimulation(nodes)
      .force('link', forceLink<GNode, GLink>(links).id((d) => d.id).distance((l) => l.dist)
        .strength((l) => (l.kind === 'trunk' ? 0.9 : l.kind === 'chain' ? 0.55 : 0.25)))
      .force('charge', forceManyBody<GNode>().strength((n) => (n.type === 'lesson' ? -220 : -520)))
      .force('collide', forceCollide<GNode>((n) => n.r + (n.type === 'lesson' ? 27 : 22)))
      .force('x', forceX<GNode>(0).strength(0.045))
      .force('y', forceY<GNode>((n) => (n.unitIndex + 0.5) * 170).strength(0.09))
      .alphaDecay(0.02)
      .alphaMin(0.001)
      .alphaTarget(0.03); // never fully sleeps → the float

    // ----- Viewport (pan/zoom, fit) -----
    let scale = 1;
    let tx = 0;
    let ty = 0;
    const applyView = () => world.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);

    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, (n.x ?? 0) - 70);
        maxX = Math.max(maxX, (n.x ?? 0) + 70);
        minY = Math.min(minY, (n.y ?? 0) - 60);
        maxY = Math.max(maxY, (n.y ?? 0) + 60);
      }
      scale = Math.min(1.4, Math.max(0.35, Math.min(w / (maxX - minX), h / (maxY - minY))));
      tx = w / 2 - ((minX + maxX) / 2) * scale;
      ty = h / 2 - ((minY + maxY) / 2) * scale;
      applyView();
    };

    // Warm up off-screen so the first paint is already organic, then fit.
    for (let i = 0; i < 180; i++) sim.tick();
    fit();

    // ----- Render loop -----
    let time = 0;
    sim.on('tick', () => {
      time += 0.016;
      // Ambient wander: tiny per-node breeze keeps the constellation alive.
      for (const n of nodes) {
        if (n.fx == null) {
          n.vx = (n.vx ?? 0) + Math.sin(time * 0.7 + n.phase) * 0.012;
          n.vy = (n.vy ?? 0) + Math.cos(time * 0.55 + n.phase * 1.3) * 0.012;
        }
      }
      links.forEach((l, i) => {
        const s = l.source as GNode;
        const t = l.target as GNode;
        linkEls[i].setAttribute('x1', String(s.x ?? 0));
        linkEls[i].setAttribute('y1', String(s.y ?? 0));
        linkEls[i].setAttribute('x2', String(t.x ?? 0));
        linkEls[i].setAttribute('y2', String(t.y ?? 0));
      });
      nodes.forEach((n, i) => {
        nodeEls[i].setAttribute('transform', `translate(${n.x ?? 0} ${n.y ?? 0})`);
      });
    });

    // ----- Interaction -----
    const toWorld = (cx: number, cy: number) => {
      const rect = svg.getBoundingClientRect();
      return { x: (cx - rect.left - tx) / scale, y: (cy - rect.top - ty) / scale };
    };

    let dragNode: GNode | null = null;
    let panStart: { x: number; y: number; tx: number; ty: number } | null = null;
    let downAt = { x: 0, y: 0 };
    let moved = false;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStart: { dist: number; scale: number } | null = null;

    const nodeAt = (wx: number, wy: number): GNode | null => {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = wx - (n.x ?? 0);
        const dy = wy - (n.y ?? 0);
        if (dx * dx + dy * dy <= (n.r + 12) * (n.r + 12)) return n;
      }
      return null;
    };

    const setHover = (n: GNode | null) => {
      host.classList.toggle('cg-hovering', !!n);
      nodes.forEach((m, i) => {
        const connected = !n || m === n || links.some((l) =>
          (l.source === n && l.target === m) || (l.target === n && l.source === m));
        nodeEls[i].classList.toggle('cg-faded', !!n && !connected);
      });
      links.forEach((l, i) => {
        const touches = !n || l.source === n || l.target === n;
        linkEls[i].classList.toggle('cg-faded', !!n && !touches);
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      svg.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
        dragNode = null;
        panStart = null;
        return;
      }
      moved = false;
      downAt = { x: e.clientX, y: e.clientY };
      const w = toWorld(e.clientX, e.clientY);
      const n = nodeAt(w.x, w.y);
      if (n) {
        dragNode = n;
        n.fx = w.x;
        n.fy = w.y;
        sim.alphaTarget(0.35).restart();
      } else {
        panStart = { x: e.clientX, y: e.clientY, tx, ty };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchStart && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const next = Math.min(2.4, Math.max(0.3, (pinchStart.scale * d) / pinchStart.dist));
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const rect = svg.getBoundingClientRect();
        const wx = (cx - rect.left - tx) / scale;
        const wy = (cy - rect.top - ty) / scale;
        scale = next;
        tx = cx - rect.left - wx * scale;
        ty = cy - rect.top - wy * scale;
        applyView();
        return;
      }
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) moved = true;
      if (dragNode) {
        const w = toWorld(e.clientX, e.clientY);
        dragNode.fx = w.x;
        dragNode.fy = w.y;
      } else if (panStart) {
        tx = panStart.tx + (e.clientX - panStart.x);
        ty = panStart.ty + (e.clientY - panStart.y);
        applyView();
      } else {
        const w = toWorld(e.clientX, e.clientY);
        setHover(nodeAt(w.x, w.y));
      }
    };

    const endPointer = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (dragNode) {
        const n = dragNode;
        dragNode = null;
        n.fx = null;
        n.fy = null;
        sim.alphaTarget(0.03);
        if (!moved && n.type === 'lesson' && n.lessonId && n.state !== 'locked') {
          onStartRef.current(n.lessonId);
        }
      }
      panStart = null;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const wx = (e.clientX - rect.left - tx) / scale;
      const wy = (e.clientY - rect.top - ty) / scale;
      scale = Math.min(2.4, Math.max(0.3, scale * Math.exp(-e.deltaY * 0.0014)));
      tx = e.clientX - rect.left - wx * scale;
      ty = e.clientY - rect.top - wy * scale;
      applyView();
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', endPointer);
    svg.addEventListener('pointercancel', endPointer);
    svg.addEventListener('pointerleave', () => setHover(null));
    svg.addEventListener('wheel', onWheel, { passive: false });

    const resize = new ResizeObserver(() => fit());
    resize.observe(host);

    return () => {
      sim.stop();
      resize.disconnect();
      svg.remove();
    };
  }, [progress]);

  return (
    <div ref={hostRef} className={`constellation theme-${theme}`}>
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
      <div className="cg-hint">drag nodes · pinch/scroll to zoom · tap a star to learn</div>
    </div>
  );
}
