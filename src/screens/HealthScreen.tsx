import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, Card } from '../components/UI';
import { colors, radius, type } from '../theme';
import { useApp, useNow } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import { healthMilestones, formatDuration, streakMs } from '../logic/wisp';

export default function HealthScreen({ navigation }: ScreenProps<'Health'>) {
  const { state } = useApp();
  const now = useNow(60_000);
  const items = healthMilestones(state, now);
  const reached = items.filter((i) => i.reached).length;

  return (
    <Screen scroll>
      <Header title="Health timeline" onBack={() => navigation.goBack()} />
      <Card style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 30 }}>🫁</Text>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{formatDuration(streakMs(state, now), { compact: true })} clean</Text>
          <Text style={type.sub}>
            {reached} of {items.length} milestones reached
          </Text>
        </View>
      </Card>

      <View style={{ marginTop: 16, gap: 10 }}>
        {items.map((m) => (
          <View key={m.id} style={[styles.row, m.reached && styles.rowDone]}>
            <View style={[styles.icon, m.reached && { backgroundColor: 'rgba(126,240,196,0.15)' }]}>
              <Text style={{ fontSize: 20 }}>{m.reached ? '✓' : m.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[type.h3, m.reached && { color: colors.accent }]}>{m.title}</Text>
                {!m.reached && <Text style={type.caption}>{formatDuration(m.msLeft, { compact: true })} to go</Text>}
              </View>
              <Text style={[type.sub, { marginTop: 3, lineHeight: 18 }]}>{m.note}</Text>
              {!m.reached && (
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${Math.round(m.progress * 100)}%` }]} />
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      <Text style={[type.caption, { marginTop: 22, lineHeight: 17 }]}>
        This timeline is general wellness information based on widely published quit timelines. Everyone's body is
        different. It is not medical advice — talk to a clinician about your own health.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowDone: { borderColor: 'rgba(126,240,196,0.35)' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.cardAlt, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.lavender },
});
