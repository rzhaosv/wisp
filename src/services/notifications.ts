import { Platform } from 'react-native';

/**
 * Local notifications: a daily 8pm check-in plus one-off milestone pings.
 * expo-notifications is native-only; everything is guarded so the web bundle
 * (used for smoke tests) never touches it.
 */

const MILESTONES: { id: string; afterMs: number; title: (n: string) => string; body: (n: string) => string }[] = [
  { id: 'm24h', afterMs: 24 * 3_600_000, title: (n) => `${n} made it a full day`, body: () => 'Nicotine is mostly out of your system. Cravings peak around now — you have got this.' },
  { id: 'm72h', afterMs: 72 * 3_600_000, title: (n) => `${n} is glowing brighter`, body: () => '72 hours clean. Nicotine is fully out and breathing gets easier from here.' },
  { id: 'm7d', afterMs: 7 * 86_400_000, title: (n) => `One week. ${n} is a Mint Wisp.`, body: () => 'Cravings are shorter and weaker now. Look at you.' },
  { id: 'm14d', afterMs: 14 * 86_400_000, title: (n) => `${n} turned golden`, body: () => 'Two weeks clean. Circulation is improving. Keep going.' },
  { id: 'm30d', afterMs: 30 * 86_400_000, title: (n) => `${n} is radiant`, body: () => 'Thirty days. A month without vaping. That is enormous.' },
];

function native() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function mod() {
  if (!native()) return null;
  try {
    const m = await import('expo-notifications');
    return m;
  } catch {
    return null;
  }
}

let handlerSet = false;
export async function setupNotificationHandler() {
  const N = await mod();
  if (!N || handlerSet) return;
  handlerSet = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* ignore */
  }
}

/** Ask for permission. Only call when the user explicitly enables reminders. */
export async function requestPermission(): Promise<boolean> {
  const N = await mod();
  if (!N) return false;
  try {
    const cur = await N.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return res.granted;
  } catch {
    return false;
  }
}

export async function cancelAll() {
  const N = await mod();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}

/** (Re)schedule everything from scratch for the given quit date. */
export async function scheduleAll(wispName: string, quitAtIso: string) {
  const N = await mod();
  if (!N) return;
  await cancelAll();
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: `How's ${wispName} doing?`,
        body: 'Take ten seconds to check in. Every clean hour counts.',
        sound: false,
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 },
    });
    const quitAt = Date.parse(quitAtIso);
    const now = Date.now();
    for (const m of MILESTONES) {
      const at = quitAt + m.afterMs;
      if (at <= now + 60_000) continue;
      await N.scheduleNotificationAsync({
        identifier: m.id,
        content: { title: m.title(wispName), body: m.body(wispName), sound: false },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      });
    }
  } catch {
    /* best-effort */
  }
}
