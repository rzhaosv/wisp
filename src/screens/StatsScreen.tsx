import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { Screen, Header, StatTile, Card } from '../components/UI';
import { colors, radius, type } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import {
  lifetimeCleanDays,
  streakMs,
  moneySaved,
  puffsAvoided,
  achievements,
  dailyHistory,
  formatMoney,
  formatCompact,
  DAY,
} from '../logic/wisp';

export default function StatsScreen({ navigation }: ScreenProps<'Stats'>) {
  const { state } = useApp();
  const now = useNow(60_000);
  const cur = streakMs(state, now);
  const longest = Math.max(state.longestStreakMs, cur);
  const ach = achievements(state, now);
  const hist = dailyHistory(state, now, 14);

  return (
    <Screen scroll>
      <Header title="Stats" onBack={() => navigation.goBack()} />
      <View style={styles.grid}>
        <StatTile label="LIFETIME CLEAN" value={`${lifetimeCleanDays(state, now)}d`} />
        <StatTile label="CURRENT STREAK" value={`${Math.floor(cur / DAY)}d`} color={colors.accent} />
      </View>
      <View style={styles.grid}>
        <StatTile label="LONGEST STREAK" value={`${Math.floor(longest / DAY)}d`} color={colors.gold} />
        <StatTile label="CRAVINGS BEATEN" value={String(state.cravingsBeaten)} color={colors.lavender} />
      </View>
      <View style={styles.grid}>
        <StatTile label="MONEY SAVED" value={formatMoney(moneySaved(state, now))} />
        <StatTile label="PUFFS AVOIDED" value={formatCompact(puffsAvoided(state, now))} />
      </View>

      <Card style={{ marginTop: 10 }}>
        <Text style={type.caption}>SLIPS</Text>
        <Text style={[type.num, { marginTop: 4 }]}>{state.slips.length}</Text>
        <Text style={[type.sub, { marginTop: 4 }]}>
          {state.slips.length === 0
            ? 'None so far. And if one happens, it is just a dim — never a reset of what you have built.'
            : 'Each one was a moment, not a verdict. You kept going, and that is the whole game.'}
        </Text>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Text style={type.caption}>LAST 14 DAYS</Text>
        <Chart data={hist} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <Legend color={colors.accent} label="Cravings beaten" />
          <Legend color={colors.lavender} label="Slips" />
        </View>
      </Card>

      <Text style={[type.h3, { marginTop: 22, marginBottom: 10 }]}>Achievements</Text>
      <View style={styles.achGrid}>
        {ach.map((a) => (
          <View key={a.id} style={[styles.ach, !a.unlocked && { opacity: 0.4 }]}>
            <Text style={{ fontSize: 26 }}>{a.unlocked ? a.icon : '🔒'}</Text>
            <Text style={[type.sub, { textAlign: 'center', marginTop: 6, color: colors.ink }]}>{a.title}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

function Chart({ data }: { data: { label: string; slips: number; cravings: number }[] }) {
  const W = Dimensions.get('window').width - 40 - 36;
  const H = 120;
  const pad = 16;
  const max = Math.max(1, ...data.map((d) => Math.max(d.slips, d.cravings)));
  const slot = W / data.length;
  const bw = Math.max(3, slot * 0.3);
  return (
    <Svg width={W} height={H + pad} style={{ marginTop: 8 }}>
      <Line x1={0} y1={H} x2={W} y2={H} stroke={colors.lineStrong} strokeWidth={1} />
      {data.map((d, i) => {
        const x = i * slot + slot / 2;
        const ch = (d.cravings / max) * (H - 10);
        const sh = (d.slips / max) * (H - 10);
        return (
          <React.Fragment key={d.label + i}>
            <Rect x={x - bw - 1} y={H - ch} width={bw} height={ch} rx={2} fill={colors.accent} />
            <Rect x={x + 1} y={H - sh} width={bw} height={sh} rx={2} fill={colors.lavender} />
            {(i % 2 === 0 || i === data.length - 1) && (
              <SvgText x={x} y={H + 13} fontSize={10} fill={colors.inkFaint} textAnchor="middle">
                {d.label}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ach: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
});
