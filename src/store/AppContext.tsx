import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WispState, DEFAULT_STATE } from '../logic/types';
import { streakMs, DAY } from '../logic/wisp';
import { configureBilling, getCustomerInfo, isPremium, addPremiumListener } from '../services/billing';
import { scheduleAll, cancelAll, requestPermission } from '../services/notifications';

export const STORAGE_KEY = 'wisp.state.v1';
const DEV_UNLOCK = process.env.EXPO_PUBLIC_DEV_UNLOCK === '1' || process.env.EXPO_PUBLIC_DEV_UNLOCK === 'true';

type Ctx = {
  ready: boolean;
  state: WispState;
  isPro: boolean;
  setPro: (v: boolean) => void;
  update: (patch: Partial<WispState> | ((s: WispState) => Partial<WispState>)) => void;
  completeOnboarding: (setup: Partial<WispState>) => void;
  logSlip: (puffs: number) => void;
  logCraving: (beaten: boolean) => void;
  logTaperPuffs: (n: number) => void;
  switchToCold: () => void;
  setQuitDate: (iso: string) => void;
  setReminders: (on: boolean) => Promise<boolean>;
  resetAll: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

function dateKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<WispState>(DEFAULT_STATE);
  const [isPro, setIsPro] = useState(DEV_UNLOCK);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load persisted state + billing
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<WispState>) });
      } catch {
        /* start fresh */
      }
      configureBilling();
      const info = await getCustomerInfo();
      if (isPremium(info)) setIsPro(true);
      unsub = addPremiumListener((pro) => setIsPro(pro || DEV_UNLOCK));
      setReady(true);
    })();
    return () => unsub();
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const update = useCallback<Ctx['update']>((patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  const completeOnboarding = useCallback((setup: Partial<WispState>) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      ...setup,
      onboarded: true,
      quitAt: now,
      originalQuitAt: now,
      slips: [],
      cravings: [],
      taperPuffLog: {},
      cravingsBeaten: 0,
      longestStreakMs: 0,
      slipPenaltyUntil: null,
      proudUntil: null,
    }));
  }, []);

  const logSlip = useCallback((puffs: number) => {
    setState((prev) => {
      const now = Date.now();
      const current = streakMs(prev, now);
      const nowIso = new Date(now).toISOString();
      return {
        ...prev,
        slips: [...prev.slips, { at: nowIso, puffs }],
        longestStreakMs: Math.max(prev.longestStreakMs, current),
        quitAt: nowIso,
        slipPenaltyUntil: new Date(now + DAY).toISOString(),
        proudUntil: null,
      };
    });
  }, []);

  const logCraving = useCallback((beaten: boolean) => {
    setState((prev) => {
      const now = Date.now();
      return {
        ...prev,
        cravings: [...prev.cravings, { at: new Date(now).toISOString(), beaten }],
        cravingsBeaten: prev.cravingsBeaten + (beaten ? 1 : 0),
        proudUntil: beaten ? new Date(now + 10 * 60_000).toISOString() : prev.proudUntil,
      };
    });
  }, []);

  const logTaperPuffs = useCallback((n: number) => {
    setState((prev) => {
      const key = dateKeyOf(new Date());
      return { ...prev, taperPuffLog: { ...prev.taperPuffLog, [key]: Math.max(0, (prev.taperPuffLog[key] ?? 0) + n) } };
    });
  }, []);

  const switchToCold = useCallback(() => {
    const nowIso = new Date().toISOString();
    setState((prev) => ({ ...prev, quitMode: 'cold', quitAt: nowIso }));
  }, []);

  const setQuitDate = useCallback((iso: string) => {
    setState((prev) => {
      const next = { ...prev, quitAt: iso, originalQuitAt: iso, slipPenaltyUntil: null };
      if (next.notificationsEnabled) scheduleAll(next.wispName, iso);
      return next;
    });
  }, []);

  const setReminders = useCallback(async (on: boolean) => {
    if (on) {
      const ok = await requestPermission();
      if (!ok) return false;
      const s = stateRef.current;
      await scheduleAll(s.wispName, s.quitAt);
      setState((prev) => ({ ...prev, notificationsEnabled: true }));
      return true;
    }
    await cancelAll();
    setState((prev) => ({ ...prev, notificationsEnabled: false }));
    return false;
  }, []);

  const resetAll = useCallback(async () => {
    await cancelAll();
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setState(DEFAULT_STATE);
  }, []);

  return (
    <AppCtx.Provider
      value={{
        ready,
        state,
        isPro,
        setPro: (v) => setIsPro(v || DEV_UNLOCK),
        update,
        completeOnboarding,
        logSlip,
        logCraving,
        logTaperPuffs,
        switchToCold,
        setQuitDate,
        setReminders,
        resetAll,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}

/** Re-renders every `intervalMs` so streak timers tick. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
