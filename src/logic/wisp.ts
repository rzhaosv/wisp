/**
 * Pure selectors over WispState. No side effects, no Date.now() — callers pass `now`.
 */
import { WispState, Mood, QuitMode } from './types';

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

// ---------- Streak & stage ----------

/** Milliseconds of the current clean streak (since last slip or quit). */
export function streakMs(state: WispState, now: number): number {
  const start = Date.parse(state.quitAt);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, now - start);
}

/** Milliseconds since the very first quit (lifetime clock, never resets). */
export function lifetimeMs(state: WispState, now: number): number {
  const start = Date.parse(state.originalQuitAt);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, now - start);
}

export const STAGE_THRESHOLDS_DAYS = [0, 1, 3, 7, 14, 30];

/** Raw stage 0-5 derived only from the clean streak. */
export function stageFromMs(ms: number): number {
  const days = ms / DAY;
  let s = 0;
  for (let i = 0; i < STAGE_THRESHOLDS_DAYS.length; i++) {
    if (days >= STAGE_THRESHOLDS_DAYS[i]) s = i;
  }
  return s;
}

export function stage(state: WispState, now: number): number {
  return stageFromMs(streakMs(state, now));
}

/** Stage after applying the 24h slip penalty (never below 0). */
export function effectiveStage(state: WispState, now: number): number {
  const base = stage(state, now);
  const until = state.slipPenaltyUntil ? Date.parse(state.slipPenaltyUntil) : NaN;
  if (Number.isFinite(until) && now < until) return Math.max(0, base - 1);
  return base;
}

export function mood(state: WispState, now: number): Mood {
  const proud = state.proudUntil ? Date.parse(state.proudUntil) : NaN;
  if (Number.isFinite(proud) && now < proud) return 'proud';
  const until = state.slipPenaltyUntil ? Date.parse(state.slipPenaltyUntil) : NaN;
  if (Number.isFinite(until) && now < until) return 'sad';
  const s = stage(state, now);
  if (s >= 3) return 'happy';
  if (s >= 1) return 'neutral';
  return 'neutral';
}

/** Next stage milestone: which stage, and ms remaining. Null at max stage. */
export function nextMilestone(
  state: WispState,
  now: number,
): { stage: number; msLeft: number } | null {
  const s = stage(state, now);
  if (s >= 5) return null;
  const targetDays = STAGE_THRESHOLDS_DAYS[s + 1];
  const msLeft = targetDays * DAY - streakMs(state, now);
  return { stage: s + 1, msLeft: Math.max(0, msLeft) };
}

// ---------- Money / puffs / nicotine ----------

/**
 * Clean time used for savings. Lifetime minus what was vaped during slips
 * (each slip's puffs are subtracted from puffs avoided). In taper mode we
 * count the puffs *under* the original baseline instead.
 */
export function puffsAvoided(state: WispState, now: number): number {
  const days = lifetimeMs(state, now) / DAY;
  const baseline = state.puffsPerDay * days;
  const slipped = state.slips.reduce((a, s) => a + s.puffs, 0);
  const tapered = Object.values(state.taperPuffLog).reduce((a, n) => a + n, 0);
  return Math.max(0, Math.floor(baseline - slipped - tapered));
}

export function moneySaved(state: WispState, now: number): number {
  if (state.puffsPerDay <= 0) return 0;
  const perPuff = state.weeklyCost / 7 / state.puffsPerDay;
  return Math.max(0, puffsAvoided(state, now) * perPuff);
}

/**
 * Nicotine avoided in mg.
 * Assumption: one puff vaporises roughly 0.05 mL of e-liquid. Nicotine
 * strength "5%" means 50 mg/mL, so a puff carries ≈ 50 × 0.05 = 2.5 mg
 * of liquid nicotine (absorbed dose is lower). Formula:
 *   puffs × (pct / 100 × 1000 mg/mL) × 0.05 mL
 */
export const ML_PER_PUFF = 0.05;
export function nicotineAvoidedMg(state: WispState, now: number): number {
  const mgPerMl = (state.nicotinePct / 100) * 1000;
  return puffsAvoided(state, now) * mgPerMl * ML_PER_PUFF;
}

// ---------- Taper ----------

export function taperDays(mode: QuitMode): number {
  return mode === 'taper7' ? 7 : mode === 'taper14' ? 14 : mode === 'taper30' ? 30 : 0;
}

export function isTaper(state: WispState): boolean {
  return taperDays(state.quitMode) > 0;
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 0-based taper day index for a date (day 0 = the day you started). */
export function taperDayIndex(state: WispState, date: Date): number {
  const start = startOfDay(Date.parse(state.originalQuitAt));
  const cur = startOfDay(date.getTime());
  return Math.floor((cur - start) / DAY);
}

/**
 * Daily puff allowance: linear from puffsPerDay on day 0 to 0 on day N.
 * Returns 0 after the schedule ends or in cold mode.
 */
export function taperAllowance(state: WispState, date: Date): number {
  const n = taperDays(state.quitMode);
  if (n <= 0) return 0;
  const i = taperDayIndex(state, date);
  if (i < 0) return state.puffsPerDay;
  if (i >= n) return 0;
  return Math.round(state.puffsPerDay * (1 - i / n));
}

export function taperSchedule(state: WispState): { day: number; allowance: number; key: string }[] {
  const n = taperDays(state.quitMode);
  const start = startOfDay(Date.parse(state.originalQuitAt));
  const out: { day: number; allowance: number; key: string }[] = [];
  for (let i = 0; i <= n; i++) {
    const d = new Date(start + i * DAY);
    out.push({ day: i, allowance: taperAllowance(state, d), key: dateKey(d) });
  }
  return out;
}

export function taperFinished(state: WispState, now: number): boolean {
  return isTaper(state) && taperDayIndex(state, new Date(now)) >= taperDays(state.quitMode);
}

/** Consecutive days (ending today or yesterday) where logged puffs <= allowance. */
export function underAllowanceStreak(state: WispState, now: number): number {
  let streak = 0;
  const todayIdx = taperDayIndex(state, new Date(now));
  for (let i = todayIdx; i >= 0; i--) {
    const d = new Date(startOfDay(Date.parse(state.originalQuitAt)) + i * DAY);
    const key = dateKey(d);
    const used = state.taperPuffLog[key] ?? 0;
    if (used <= taperAllowance(state, d)) streak++;
    else break;
  }
  return streak;
}

// ---------- Health timeline ----------

export type HealthMilestone = {
  id: string;
  afterMs: number;
  icon: string;
  title: string;
  note: string;
};

export const HEALTH_MILESTONES: HealthMilestone[] = [
  { id: '20m', afterMs: 20 * 60_000, icon: '💓', title: '20 minutes', note: 'Heart rate and blood pressure start settling back to normal.' },
  { id: '8h', afterMs: 8 * HOUR, icon: '🌗', title: '8 hours', note: 'About half the nicotine has left your bloodstream.' },
  { id: '24h', afterMs: DAY, icon: '🌙', title: '24 hours', note: 'Nicotine is mostly gone. Cravings peak here — this is the hard part.' },
  { id: '48h', afterMs: 2 * DAY, icon: '🍓', title: '48 hours', note: 'Taste and smell begin to sharpen again.' },
  { id: '72h', afterMs: 3 * DAY, icon: '🌬️', title: '72 hours', note: 'Nicotine is fully out. Breathing often feels easier.' },
  { id: '1w', afterMs: 7 * DAY, icon: '🌱', title: '1 week', note: 'Cravings get shorter and weaker. Habits start to loosen.' },
  { id: '2w', afterMs: 14 * DAY, icon: '🩸', title: '2 weeks', note: 'Circulation improves; hands and feet feel warmer.' },
  { id: '1m', afterMs: 30 * DAY, icon: '🫁', title: '1 month', note: 'Lung function is noticeably better for many people.' },
  { id: '3m', afterMs: 90 * DAY, icon: '🏃', title: '3 months', note: 'Coughing and wheezing drop off. Exercise feels lighter.' },
  { id: '1y', afterMs: 365 * DAY, icon: '🏆', title: '1 year', note: 'Long-term risks tied to nicotine use are meaningfully lower.' },
];

export function healthMilestones(state: WispState, now: number) {
  const ms = streakMs(state, now);
  return HEALTH_MILESTONES.map((m) => ({
    ...m,
    reached: ms >= m.afterMs,
    progress: Math.min(1, ms / m.afterMs),
    msLeft: Math.max(0, m.afterMs - ms),
  }));
}

// ---------- Stats / achievements ----------

export function lifetimeCleanDays(state: WispState, now: number): number {
  return Math.floor(lifetimeMs(state, now) / DAY);
}

export type Achievement = { id: string; icon: string; title: string; unlocked: boolean };

export function achievements(state: WispState, now: number): Achievement[] {
  const best = Math.max(state.longestStreakMs, streakMs(state, now));
  const money = moneySaved(state, now);
  return [
    { id: 'day1', icon: '🌤️', title: 'First clean day', unlocked: best >= DAY },
    { id: 'day3', icon: '💧', title: '3 days', unlocked: best >= 3 * DAY },
    { id: 'week1', icon: '🌿', title: '1 week', unlocked: best >= 7 * DAY },
    { id: 'week2', icon: '🌊', title: '2 weeks', unlocked: best >= 14 * DAY },
    { id: 'month1', icon: '✨', title: '1 month', unlocked: best >= 30 * DAY },
    { id: 'crave10', icon: '🛡️', title: '10 cravings beaten', unlocked: state.cravingsBeaten >= 10 },
    { id: 'save50', icon: '💵', title: '$50 saved', unlocked: money >= 50 },
    { id: 'save100', icon: '💰', title: '$100 saved', unlocked: money >= 100 },
  ];
}

/** Per-day counts for the last `days` days, oldest first. */
export function dailyHistory(state: WispState, now: number, days = 14) {
  const out: { key: string; label: string; slips: number; cravings: number }[] = [];
  const today = startOfDay(now);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today - i * DAY);
    const key = dateKey(d);
    out.push({ key, label: String(d.getDate()), slips: 0, cravings: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.key, i]));
  for (const s of state.slips) {
    const i = idx.get(dateKey(new Date(Date.parse(s.at))));
    if (i !== undefined) out[i].slips++;
  }
  for (const c of state.cravings) {
    const i = idx.get(dateKey(new Date(Date.parse(c.at))));
    if (i !== undefined) out[i].cravings++;
  }
  return out;
}

export function cravingsBeatenToday(state: WispState, now: number): number {
  const key = dateKey(new Date(now));
  return state.cravings.filter((c) => c.beaten && dateKey(new Date(Date.parse(c.at))) === key).length;
}

// ---------- Formatting ----------

export function formatDuration(ms: number, opts: { compact?: boolean } = {}): string {
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  if (opts.compact) {
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  return `${d}d ${h}h ${m}m`;
}

export function formatMoney(n: number): string {
  return n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
