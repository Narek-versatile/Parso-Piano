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
 * Every lesson is open — you can start (or revisit) any of them at any time.
 * A lesson is 'done' once completed, otherwise 'available'. Nothing is ever
 * 'locked' (the value is kept in the union for UI compatibility).
 */
export function lessonState(p: Progress, unitIndex: number, lessonIndex: number): LockState {
  const lesson = UNITS[unitIndex].lessons[lessonIndex];
  return p.completed[lesson.id] !== undefined ? 'done' : 'available';
}

export function unitCompletion(p: Progress, unitIndex: number): { done: number; total: number } {
  const lessons = UNITS[unitIndex].lessons;
  return {
    done: lessons.filter((l) => p.completed[l.id] !== undefined).length,
    total: lessons.length,
  };
}

/* ---------------- Cross-device sync (no backend) ----------------
 * Progress is encoded into a compact URL-safe string that can be carried in a
 * link or pasted as a code. Importing MERGES with local progress (keeps the
 * best of both) so moving between devices never loses anything.
 */

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Serialize progress into a shareable code. */
export function encodeProgress(p: Progress): string {
  return b64urlEncode(JSON.stringify(p));
}

/** Parse a sync code back into progress; returns null if it's malformed. */
export function decodeProgress(code: string): Progress | null {
  try {
    const parsed = JSON.parse(b64urlDecode(code.trim())) as Partial<Progress>;
    if (typeof parsed.xp !== 'number' || typeof parsed.completed !== 'object' || parsed.completed === null) {
      return null;
    }
    return { ...EMPTY, ...parsed, completed: { ...parsed.completed } };
  } catch {
    return null;
  }
}

/** Combine two progress records, keeping the better value of each field. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const completed: Record<string, number> = { ...a.completed };
  for (const [id, score] of Object.entries(b.completed)) {
    completed[id] = Math.max(completed[id] ?? 0, score);
  }
  const aDay = a.lastActiveDay ?? '';
  const bDay = b.lastActiveDay ?? '';
  // The device used more recently owns the streak; same day → the longer streak.
  const [lastActiveDay, streak] =
    bDay > aDay ? [b.lastActiveDay, b.streak] :
    aDay > bDay ? [a.lastActiveDay, a.streak] :
    [a.lastActiveDay, Math.max(a.streak, b.streak)];
  return { xp: Math.max(a.xp, b.xp), streak, lastActiveDay, completed };
}

/**
 * If the page URL carries a ?sync=… code, merge it into stored progress and
 * strip the parameter. Call once at startup, before anything reads progress.
 * Returns true when a code was applied.
 */
export function applySyncFromUrl(): boolean {
  let applied = false;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('sync');
    if (code) {
      const incoming = decodeProgress(code);
      if (incoming) {
        saveProgress(mergeProgress(loadProgress(), incoming));
        applied = true;
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('sync');
      window.history.replaceState(null, '', url);
    }
  } catch {
    /* best-effort */
  }
  return applied;
}
