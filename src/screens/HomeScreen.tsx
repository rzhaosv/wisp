import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Screen, PrimaryButton, SecondaryButton, StatTile, Card } from '../components/UI';
import Wisp from '../components/Wisp';
import { colors, radius, type, STAGE_NAMES } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import {
  streakMs,
  effectiveStage,
  mood as moodOf,
  nextMilestone,
  moneySaved,
  puffsAvoided,
  nicotineAvoidedMg,
  formatDuration,
  formatMoney,
  formatCompact,
  isTaper,
  taperAllowance,
  dateKey,
  cravingsBeatenToday,
  taperFinished,
} from '../logic/wisp';
import { REASON_LINES } from '../logic/types';

const FREE_SOS_PER_DAY = 1;

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { state, isPro, logSlip } = useApp();
  const now = useNow(60_000);
  const [slipOpen, setSlipOpen] = useState(false);
  const [slipToast, setSlipToast] = useState(false);

  const stage = effectiveStage(state, now);
  const mood = moodOf(state, now);
  const streak = streakMs(state, now);
  const next = nextMilestone(state, now);
  const taper = isTaper(state);
  const todayKey = dateKey(new Date(now));
  const allowance = taperAllowance(state, new Date(now));
  const used = state.taperPuffLog[todayKey] ?? 0;
  const penalty = state.slipPenaltyUntil && Date.parse(state.slipPenaltyUntil) > now;
  const reasonLine = state.reasons.length
    ? REASON_LINES[state.reasons[Math.floor(now / 3_600_000) % state.reasons.length]]
    : 'One hour at a time. That is all this is.';

  const gate = (screen: 'Stats' | 'Health' | 'Taper') => {
    if (isPro) navigation.navigate(screen);
    else navigation.navigate('Paywall');
  };

  const onSOS = () => {
    if (isPro || cravingsBeatenToday(state, now) < FREE_SOS_PER_DAY) navigation.navigate('SOS');
    else navigation.navigate('Paywall');
  };

  const doSlip = (puffs: number) => {
    logSlip(puffs);
    setSlipOpen(false);
    setSlipToast(true);
    setTimeout(() => setSlipToast(false), 4000);
  };

  return (
    <Screen scroll contentStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <HeaderBtn icon="📊" onPress={() => gate('Stats')} />
        <View style={{ flex: 1 }} />
        <HeaderBtn icon="🫁" onPress={() => gate('Health')} />
        <HeaderBtn icon="⚙️" onPress={() => navigation.navigate('Settings')} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Wisp stage={stage} mood={mood} size={240} />
        <Text style={[type.h1, { marginTop: -4 }]}>{state.wispName}</Text>
        <Text style={[type.sub, { color: colors.lavender, marginTop: 2 }]}>
          {STAGE_NAMES[stage]}
          {penalty ? ' · resting' : ''}
        </Text>
      </View>

      <Card style={{ marginTop: 18, alignItems: 'center' }}>
        <Text style={type.caption}>CLEAN FOR</Text>
        <Text style={[type.numLg, { marginTop: 4 }]}>{formatDuration(streak)}</Text>
        <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 8 }]}>
          {penalty ? `Slips happen. ${state.wispName} is still here.` : reasonLine}
        </Text>
      </Card>

      {next ? (
        <View style={styles.milestone}>
          <Text style={{ fontSize: 18 }}>✨</Text>
          <Text style={[type.body, { flex: 1 }]}>
            <Text style={{ fontWeight: '800', color: colors.gold }}>{STAGE_NAMES[next.stage]}</Text> in{' '}
            {formatDuration(next.msLeft, { compact: true })}
          </Text>
        </View>
      ) : (
        <View style={styles.milestone}>
          <Text style={{ fontSize: 18 }}>🌟</Text>
          <Text style={[type.body, { flex: 1 }]}>{state.wispName} is fully radiant. Keep the glow.</Text>
        </View>
      )}

      <View style={styles.tiles}>
        <StatTile label="SAVED" value={formatMoney(moneySaved(state, now))} color={colors.accent} />
        <StatTile label="PUFFS AVOIDED" value={formatCompact(puffsAvoided(state, now))} />
        <StatTile label="NICOTINE" value={`${formatCompact(nicotineAvoidedMg(state, now))} mg`} sub="avoided" />
      </View>

      {taper && (
        <Pressable onPress={() => gate('Taper')} style={styles.taperCard}>
          <TaperRing used={used} allowance={allowance} />
          <View style={{ flex: 1 }}>
            <Text style={type.h3}>{taperFinished(state, now) ? 'Taper complete' : "Today's allowance"}</Text>
            <Text style={type.sub}>
              {taperFinished(state, now)
                ? 'Tap to go fully clean.'
                : `${Math.max(0, allowance - used)} of ${allowance} puffs left · tap to log`}
            </Text>
          </View>
          <Text style={{ color: colors.inkFaint, fontSize: 20 }}>›</Text>
        </Pressable>
      )}

      <PrimaryButton title="Craving?  SOS" onPress={onSOS} style={{ marginTop: 22 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <SecondaryButton title="I slipped" onPress={() => setSlipOpen(true)} style={{ flex: 1 }} />
        {taper && <SecondaryButton title="Log puffs" onPress={() => gate('Taper')} style={{ flex: 1 }} />}
      </View>

      {slipToast && (
        <View style={styles.toast}>
          <Text style={[type.body, { textAlign: 'center' }]}>Slips happen. {state.wispName} is still here.</Text>
        </View>
      )}

      <Modal visible={slipOpen} transparent animationType="fade" onRequestClose={() => setSlipOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSlipOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.grip} />
          <Text style={type.h2}>How many puffs?</Text>
          <Text style={[type.bodySoft, { marginTop: 4 }]}>
            No judgment. {state.wispName} dims a little and your streak clock restarts — everything else you have earned stays.
          </Text>
          <View style={{ gap: 10, marginTop: 18 }}>
            {[
              [1, 'Just one'],
              [5, 'A few (~5)'],
              [10, 'About 10'],
              [Math.max(20, Math.round(state.puffsPerDay / 6)), 'A whole session'],
            ].map(([n, label]) => (
              <Pressable key={String(label)} style={styles.sheetBtn} onPress={() => doSlip(Number(n))}>
                <Text style={type.h3}>{label as string}</Text>
                <Text style={type.caption}>{n} puff{Number(n) === 1 ? '' : 's'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setSlipOpen(false)} style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={type.sub}>Never mind</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

function HeaderBtn({ icon, onPress }: { icon: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.hbtn}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
    </Pressable>
  );
}

function TaperRing({ used, allowance }: { used: number; allowance: number }) {
  const ratio = allowance > 0 ? Math.min(1, used / allowance) : 1;
  return (
    <View style={styles.ring}>
      <View style={[styles.ringFill, { height: `${Math.round(ratio * 100)}%` }]} />
      <Text style={[type.h3, { fontVariant: ['tabular-nums'] }]}>{used}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  hbtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  taperCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.lavender,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  ringFill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(185,167,255,0.35)' },
  toast: {
    marginTop: 14,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.lavender,
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 22,
    paddingBottom: 30,
  },
  grip: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, alignSelf: 'center', marginBottom: 16 },
  sheetBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
