export type VapeType = 'disposable' | 'pod' | 'refillable' | 'pouches';
export type QuitMode = 'cold' | 'taper7' | 'taper14' | 'taper30';
export type Reason = 'health' | 'money' | 'freedom' | 'breathing' | 'loved' | 'anxiety';
export type Mood = 'happy' | 'neutral' | 'sad' | 'craving' | 'proud';

export type Slip = { at: string; puffs: number };
export type Craving = { at: string; beaten: boolean };

export type WispState = {
  onboarded: boolean;
  wispName: string;
  vapeType: VapeType;
  puffsPerDay: number;
  nicotinePct: number;
  weeklyCost: number;
  reasons: Reason[];
  quitMode: QuitMode;
  /** ISO of the current clean-streak start (restarts on slip). */
  quitAt: string;
  /** ISO of the very first quit — lifetime stats count from here. */
  originalQuitAt: string;
  slips: Slip[];
  cravings: Craving[];
  taperPuffLog: Record<string, number>;
  cravingsBeaten: number;
  longestStreakMs: number;
  slipPenaltyUntil: string | null;
  notificationsEnabled: boolean;
  proudUntil: string | null;
};

export const DEFAULT_STATE: WispState = {
  onboarded: false,
  wispName: 'Wisp',
  vapeType: 'disposable',
  puffsPerDay: 300,
  nicotinePct: 5,
  weeklyCost: 25,
  reasons: [],
  quitMode: 'cold',
  quitAt: new Date(0).toISOString(),
  originalQuitAt: new Date(0).toISOString(),
  slips: [],
  cravings: [],
  taperPuffLog: {},
  cravingsBeaten: 0,
  longestStreakMs: 0,
  slipPenaltyUntil: null,
  notificationsEnabled: false,
  proudUntil: null,
};

export const REASON_LABELS: Record<Reason, string> = {
  health: 'Health',
  money: 'Money',
  freedom: 'Freedom',
  breathing: 'Breathing & fitness',
  loved: 'Someone I love',
  anxiety: 'Anxiety',
};

export const REASON_LINES: Record<Reason, string> = {
  health: 'Every clean hour, your body gets a little more of itself back.',
  money: 'That money stays in your pocket now. Future you says thanks.',
  freedom: 'No more planning your day around a device. You decide.',
  breathing: 'Deeper breaths, easier stairs, longer runs. It is coming.',
  loved: 'Someone is proud of you right now, even if they do not know it yet.',
  anxiety: 'Nicotine borrows calm and charges interest. You are paying it off.',
};

export const VAPE_LABELS: Record<VapeType, string> = {
  disposable: 'Disposable',
  pod: 'Pod system',
  refillable: 'Refillable',
  pouches: 'Nicotine pouches too',
};

export const QUIT_MODE_LABELS: Record<QuitMode, string> = {
  cold: 'Cold turkey today',
  taper7: 'Taper over 7 days',
  taper14: 'Taper over 14 days',
  taper30: 'Taper over 30 days',
};
