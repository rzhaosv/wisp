/**
 * Web-only demo seeding for App Store screenshots.
 *
 * When the app runs on web with `?demo=<name>` in the URL, a canned WispState is
 * written to localStorage under the AsyncStorage key *before* AppContext hydrates,
 * and `demo.screen` / `demo.onboardStep` tell App.tsx which screen to open.
 *
 * Everything here is guarded by `Platform.OS === 'web'`; on iOS/Android `demo`
 * is always `null` and nothing runs.
 */
import { Platform } from 'react-native';
import { WispState, DEFAULT_STATE, Craving, Slip } from '../logic/types';
import { RootStackParamList } from '../navigation';
import { DAY, HOUR } from '../logic/wisp';

const STORAGE_KEY = 'wisp.state.v1';

export type DemoName = 'home' | 'home5' | 'sos' | 'health' | 'stats' | 'taper' | 'onboard' | 'paywall';

export type Demo = {
  name: DemoName;
  /** Initial route for the stack (null = onboarding flow). */
  screen: keyof RootStackParamList | null;
  /** Onboarding step to open when `screen` is null. */
  onboardStep: number;
  /** `?snap=1` — freeze idle animations for a crisp capture. */
  snap: boolean;
};

const iso = (ms: number) => new Date(ms).toISOString();

function base(now: number, daysClean: number): WispState {
  const quitAt = iso(now - daysClean * DAY - 4 * HOUR - 12 * 60_000);
  return {
    ...DEFAULT_STATE,
    onboarded: true,
    wispName: 'Wisp',
    vapeType: 'disposable',
    puffsPerDay: 300,
    nicotinePct: 5,
    weeklyCost: 25,
    reasons: ['health', 'money', 'freedom'],
    quitMode: 'cold',
    quitAt,
    originalQuitAt: quitAt,
    notificationsEnabled: true,
  };
}

function cravingsOver(now: number, days: number[], beaten = true): Craving[] {
  return days.map((d, i) => ({ at: iso(now - d * DAY - ((i * 5) % 11) * HOUR), beaten }));
}

function buildState(name: DemoName, now: number): WispState | null {
  switch (name) {
    case 'onboard':
      return null;
    case 'home':
    case 'sos':
    case 'health':
    case 'paywall': {
      const s = base(now, 9);
      const cravings = cravingsOver(now, [8, 7, 6, 5, 3, 2, 1, 0]);
      return { ...s, cravings, cravingsBeaten: cravings.length, longestStreakMs: 0 };
    }
    case 'home5': {
      const s = base(now, 32);
      const cravings = cravingsOver(now, [30, 28, 26, 25, 22, 21, 19, 17, 15, 14, 12, 11, 9, 8, 6, 5, 3, 2, 1]);
      // 2% nicotine keeps the mg figure short enough for the home tile (web has no adjustsFontSizeToFit).
      return { ...s, nicotinePct: 2, cravings, cravingsBeaten: cravings.length, longestStreakMs: 0 };
    }
    case 'stats': {
      // 16 days since the first quit; one slip on day -11 and one on day -3 (current streak = 3d).
      const s = base(now, 16);
      const slipA = now - 11 * DAY - 6 * HOUR;
      const slipB = now - 3 * DAY - 5 * HOUR;
      const slips: Slip[] = [
        { at: iso(slipA), puffs: 5 },
        { at: iso(slipB), puffs: 10 },
      ];
      const beaten = cravingsOver(now, [13, 12, 12, 10, 9, 8, 7, 6, 5, 4, 4, 2, 1, 0]);
      const missed = cravingsOver(now, [11, 3], false);
      const cravings = [...beaten, ...missed].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      return {
        ...s,
        quitAt: iso(slipB),
        slips,
        cravings,
        cravingsBeaten: beaten.length,
        longestStreakMs: 8 * DAY + 1 * HOUR,
        slipPenaltyUntil: null,
      };
    }
    case 'taper': {
      // 14-day taper, currently on day 5 (index 4). Every past day was under allowance.
      const start = now - 4 * DAY - 3 * HOUR;
      const s = base(now, 0);
      const key = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const log: Record<string, number> = {};
      const usedByDay = [268, 240, 221, 196, 96];
      for (let i = 0; i < usedByDay.length; i++) {
        const d = new Date(start + i * DAY);
        log[key(d)] = usedByDay[i];
      }
      const cravings = cravingsOver(now, [3, 2, 1, 0]);
      return {
        ...s,
        quitMode: 'taper14',
        quitAt: iso(start),
        originalQuitAt: iso(start),
        taperPuffLog: log,
        cravings,
        cravingsBeaten: cravings.length,
      };
    }
  }
}

function screenFor(name: DemoName): keyof RootStackParamList | null {
  switch (name) {
    case 'home':
    case 'home5':
      return 'Home';
    case 'sos':
      return 'SOS';
    case 'health':
      return 'Health';
    case 'stats':
      return 'Stats';
    case 'taper':
      return 'Taper';
    case 'paywall':
      return 'Paywall';
    case 'onboard':
      return null;
  }
}

function read(): Demo | null {
  if (Platform.OS !== 'web') return null;
  if (typeof window === 'undefined' || !window.location || !window.localStorage) return null;
  const params = new URLSearchParams(window.location.search);
  const name = params.get('demo') as DemoName | null;
  const valid: DemoName[] = ['home', 'home5', 'sos', 'health', 'stats', 'taper', 'onboard', 'paywall'];
  if (!name || !valid.includes(name)) return null;
  const now = Date.now();
  const state = buildState(name, now);
  try {
    if (state) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return {
    name,
    screen: screenFor(name),
    onboardStep: name === 'onboard' ? 5 : 0,
    snap: params.get('snap') === '1',
  };
}

/** Null everywhere except web with `?demo=`. Evaluated once at module load, before hydration. */
export const demo: Demo | null = read();
