import { UNITS } from './curriculum';

/** Persistent learner progress (browser localStorage, no accounts). */
export interface Progress {
  xp: number;
  /** Consecutive days with at least one completed lesson */
  streak: number;
  /** ISO date (YYYY-MM-DD) of the last day a lesson was completed */
  lastActiveDay: string | null;
  /** lessonId → best score in percent */
  completed: Record<string, number>;
}

const KEY = 'parso-learn-v1';

const EMPTY: Progress = { xp: 0, streak: 0, lastActiveDay: null, completed: {} };

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Progress;
    return { ...EMPTY, ...parsed, completed: { ...(parsed.completed ?? {}) } };
  } catch {
    return { ...EMPTY };
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be unavailable (private mode) — progress just won't persist */
  }
}

function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** Record a finished lesson; returns the updated progress. */
export function recordLessonComplete(
  p: Progress,
  lessonId: string,
  scorePercent: number,
  xpEarned: number,
  now = new Date(),
): Progress {
  const today = todayISO(now);
  let streak = p.streak;
  if (p.lastActiveDay === null) streak = 1;
  else {
    const gap = daysBetween(p.lastActiveDay, today);
    if (gap === 1) streak = p.streak + 1;
    else if (gap > 1) streak = 1;
    // gap === 0: same day, streak unchanged
  }
  const next: Progress = {
    xp: p.xp + xpEarned,
    streak,
    lastActiveDay: today,
    completed: { ...p.completed, [lessonId]: Math.max(p.completed[lessonId] ?? 0, scorePercent) },
  };
  saveProgress(next);
  return next;
}

/** The streak shown in the UI: broken (0) if more than a day has passed. */
export function currentStreak(p: Progress, now = new Date()): number {
  if (!p.lastActiveDay) return 0;
  return daysBetween(p.lastActiveDay, todayISO(now)) > 1 ? 0 : p.streak;
}

export type LockState = 'done' | 'available' | 'locked';

/**
 * Sequential unlocking: within a unit, each lesson unlocks after the previous
 * one; a unit unlocks once the previous unit is fully completed.
 */
export function lessonState(p: Progress, unitIndex: number, lessonIndex: number): LockState {
  const lesson = UNITS[unitIndex].lessons[lessonIndex];
  if (p.completed[lesson.id] !== undefined) return 'done';
  const unitUnlocked =
    unitIndex === 0 || UNITS[unitIndex - 1].lessons.every((l) => p.completed[l.id] !== undefined);
  if (!unitUnlocked) return 'locked';
  const prevDone =
    lessonIndex === 0 || p.completed[UNITS[unitIndex].lessons[lessonIndex - 1].id] !== undefined;
  return prevDone ? 'available' : 'locked';
}

export function unitCompletion(p: Progress, unitIndex: number): { done: number; total: number } {
  const lessons = UNITS[unitIndex].lessons;
  return {
    done: lessons.filter((l) => p.completed[l.id] !== undefined).length,
    total: lessons.length,
  };
}
