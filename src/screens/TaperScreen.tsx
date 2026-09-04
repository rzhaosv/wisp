import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Header, Card, PrimaryButton } from '../components/UI';
import { colors, radius, type } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import { taperAllowance, taperSchedule, taperDayIndex, dateKey, underAllowanceStreak, taperFinished, taperDays } from '../logic/wisp';

export default function TaperScreen({ navigation }: ScreenProps<'Taper'>) {
  const { state, logTaperPuffs, switchToCold } = useApp();
  const now = useNow(60_000);
  const today = new Date(now);
  const key = dateKey(today);
  const allowance = taperAllowance(state, today);
  const used = state.taperPuffLog[key] ?? 0;
  const left = allowance - used;
  const finished = taperFinished(state, now);
  const idx = taperDayIndex(state, today);
  const schedule = taperSchedule(state);
  const streak = underAllowanceStreak(state, now);

  const goClean = () => {
    Alert.alert('Go fully clean today?', `Your taper is done. ${state.wispName}'s streak clock starts fresh from right now.`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, fully clean',
        onPress: () => {
          switchToCold();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Header title="Taper plan" onBack={() => navigation.goBack()} />

      <Card style={{ alignItems: 'center', marginTop: 8 }}>
        <Ring used={used} allowance={allowance} />
        <Text style={[type.h2, { marginTop: 12 }]}>
          {finished ? 'Schedule complete' : left >= 0 ? `${left} puffs left today` : `${-left} over today`}
        </Text>
        <Text style={[type.sub, { marginTop: 4, textAlign: 'center' }]}>
          {finished
            ? 'You tapered all the way down. Ready for the last step?'
            : left >= 0
              ? `Day ${idx + 1} of ${taperDays(state.quitMode)} · allowance ${allowance}`
              : 'That is okay. Tomorrow is a fresh allowance — no failure here.'}
        </Text>
        {!finished && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' }}>
            <Pressable onPress={() => logTaperPuffs(1)} style={styles.big}>
              <Text style={styles.bigText}>+1 puff</Text>
            </Pressable>
            <Pressable onPress={() => logTaperPuffs(5)} style={styles.big}>
              <Text style={styles.bigText}>+5</Text>
            </Pressable>
          </View>
        )}
        {!finished && used > 0 && (
          <Pressable onPress={() => logTaperPuffs(-1)} style={{ marginTop: 12 }}>
            <Text style={type.sub}>Undo one</Text>
          </Pressable>
        )}
      </Card>

      {finished && <PrimaryButton title="Go fully clean today" onPress={goClean} style={{ marginTop: 14 }} />}

      <View style={styles.streakRow}>
        <Text style={{ fontSize: 20 }}>🔥</Text>
        <Text style={[type.body, { flex: 1 }]}>
          <Text style={{ fontWeight: '800', color: colors.gold }}>{streak}</Text> day{streak === 1 ? '' : 's'} under allowance
        </Text>
      </View>

      <Text style={[type.h3, { marginTop: 22, marginBottom: 8 }]}>Schedule</Text>
      <View style={{ gap: 6 }}>
        {schedule.map((s) => {
          const isToday = s.day === idx;
          const past = s.day < idx;
          const usedThat = state.taperPuffLog[s.key] ?? 0;
          return (
            <View key={s.key} style={[styles.schedRow, isToday && styles.schedToday]}>
              <Text style={[type.sub, { width: 64, color: isToday ? colors.accent : colors.inkSoft }]}>
                {s.day === schedule.length - 1 ? 'Clean' : `Day ${s.day + 1}`}
              </Text>
              <View style={styles.track}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${Math.round((s.allowance / Math.max(1, state.puffsPerDay)) * 100)}%` },
                    past && usedThat > s.allowance && { backgroundColor: colors.lavender },
                  ]}
                />
              </View>
              <Text style={[type.sub, { width: 74, textAlign: 'right', fontVariant: ['tabular-nums'] }]}>
                {past ? `${usedThat} / ${s.allowance}` : `${s.allowance}`}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function Ring({ used, allowance }: { used: number; allowance: number }) {
  const R = 64;
  const C = 2 * Math.PI * R;
  const ratio = allowance > 0 ? Math.min(1, used / allowance) : 1;
  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        <Circle cx={80} cy={80} r={R} stroke={colors.cardAlt} strokeWidth={12} fill="none" />
        <Circle
          cx={80}
          cy={80}
          r={R}
          stroke={ratio >= 1 ? colors.lavender : colors.accent}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={C * (1 - ratio)}
          transform="rotate(-90 80 80)"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={type.numLg}>{used}</Text>
        <Text style={type.caption}>of {allowance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: {
    flex: 1,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigText: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  streakRow: {
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
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.sm },
  schedToday: { backgroundColor: colors.card },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  trackFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
});
