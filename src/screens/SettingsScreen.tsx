import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Switch, TextInput, Alert, Modal } from 'react-native';
import { Screen, Header, PrimaryButton, Card } from '../components/UI';
import { colors, radius, type } from '../theme';
import { useApp } from '../store/AppContext';
import { restore } from '../services/billing';
import { ScreenProps } from '../navigation';
import { SITE } from './PaywallScreen';

function Row({ label, value, onPress, danger }: { label: string; value?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={[type.body, { fontWeight: '600' }, danger && { color: colors.danger }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value ? <Text style={type.sub}>{value}</Text> : null}
        <Text style={{ color: colors.inkFaint, fontSize: 18 }}>›</Text>
      </View>
    </Pressable>
  );
}

type EditKey = 'wispName' | 'quitAt' | 'puffsPerDay' | 'weeklyCost' | null;

export default function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { state, isPro, setPro, update, setQuitDate, setReminders, resetAll } = useApp();
  const [edit, setEdit] = useState<EditKey>(null);
  const [draft, setDraft] = useState('');

  const open = (k: Exclude<EditKey, null>) => {
    setDraft(
      k === 'quitAt'
        ? new Date(state.quitAt).toISOString().slice(0, 16).replace('T', ' ')
        : String(state[k]),
    );
    setEdit(k);
  };

  const save = () => {
    if (!edit) return;
    if (edit === 'wispName') update({ wispName: draft.trim().slice(0, 16) || 'Wisp' });
    if (edit === 'puffsPerDay') update({ puffsPerDay: Math.max(1, Math.round(parseFloat(draft) || state.puffsPerDay)) });
    if (edit === 'weeklyCost') update({ weeklyCost: Math.max(0, parseFloat(draft) || 0) });
    if (edit === 'quitAt') {
      const ms = Date.parse(draft.replace(' ', 'T'));
      if (!Number.isFinite(ms) || ms > Date.now()) {
        Alert.alert('Check the date', 'Use the format YYYY-MM-DD HH:MM and pick a time in the past.');
        return;
      }
      setQuitDate(new Date(ms).toISOString());
    }
    setEdit(null);
  };

  const onReminders = async (v: boolean) => {
    const ok = await setReminders(v);
    if (v && !ok) Alert.alert('Notifications are off', 'Enable notifications for Wisp in iOS Settings to get reminders.');
  };

  const onReset = () =>
    Alert.alert('Reset everything?', 'This clears your streak, stats and settings. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetAll() },
    ]);

  const labels: Record<Exclude<EditKey, null>, string> = {
    wispName: 'Wisp name',
    quitAt: 'Quit date (YYYY-MM-DD HH:MM)',
    puffsPerDay: 'Puffs per day (before quitting)',
    weeklyCost: 'Weekly spend ($)',
  };

  return (
    <Screen scroll>
      <Header title="Settings" onBack={() => navigation.goBack()} />

      <Card style={{ marginTop: 8 }}>
        <Text style={type.label}>Plan</Text>
        <Text style={[type.h2, { marginTop: 6 }]}>{isPro ? 'Wisp Pro ✦' : 'Free'}</Text>
        {!isPro && (
          <PrimaryButton title="Unlock everything" onPress={() => navigation.navigate('Paywall')} style={{ marginTop: 14, height: 46 }} />
        )}
      </Card>

      <Text style={[type.caption, { marginTop: 20, marginBottom: 6 }]}>YOUR WISP</Text>
      <View style={styles.group}>
        <Row label="Wisp name" value={state.wispName} onPress={() => open('wispName')} />
        <Row label="Quit date" value={new Date(state.quitAt).toLocaleDateString()} onPress={() => open('quitAt')} />
        <Row label="Puffs per day" value={String(state.puffsPerDay)} onPress={() => open('puffsPerDay')} />
        <Row label="Weekly spend" value={`$${state.weeklyCost}`} onPress={() => open('weeklyCost')} />
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { fontWeight: '600' }]}>Reminders</Text>
            <Text style={type.caption}>Daily 8pm check-in and milestone celebrations</Text>
          </View>
          <Switch
            value={state.notificationsEnabled}
            onValueChange={onReminders}
            trackColor={{ true: colors.accent, false: colors.cardAlt }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={[type.caption, { marginTop: 20, marginBottom: 6 }]}>SUBSCRIPTION</Text>
      <View style={styles.group}>
        <Row
          label="Restore purchases"
          onPress={async () => {
            const ok = await restore().catch(() => false);
            if (ok) setPro(true);
            else Alert.alert('Nothing to restore', 'No active subscription was found for this Apple ID.');
          }}
        />
        <Row label="Manage subscription" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} />
        <Row label="Privacy policy" onPress={() => Linking.openURL(`${SITE}/privacy.html`)} />
        <Row label="Terms of use" onPress={() => Linking.openURL(`${SITE}/terms.html`)} />
        <Row label="Support" onPress={() => Linking.openURL('mailto:ray@thezenithlabs.com?subject=Wisp%20support')} />
      </View>

      <Text style={[type.caption, { marginTop: 20, marginBottom: 6 }]}>DANGER ZONE</Text>
      <View style={styles.group}>
        <Row label="Reset everything" onPress={onReset} danger />
      </View>

      <Text style={[type.caption, { marginTop: 20, lineHeight: 17 }]}>
        Wisp is a habit companion, not a medical device. Health timeline content is general information from widely
        published quit timelines. If you are struggling, a doctor or a quitline can help.
      </Text>

      <Modal visible={edit !== null} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEdit(null)} />
        <View style={styles.sheet}>
          <Text style={type.h3}>{edit ? labels[edit] : ''}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            style={styles.input}
            keyboardType={edit === 'puffsPerDay' || edit === 'weeklyCost' ? 'decimal-pad' : 'default'}
            placeholderTextColor={colors.inkFaint}
          />
          <PrimaryButton title="Save" onPress={save} style={{ marginTop: 14 }} />
          <Pressable onPress={() => setEdit(null)} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={type.sub}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 10,
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
  input: {
    marginTop: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
});
