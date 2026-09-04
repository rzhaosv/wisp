import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors, radius, type } from '../theme';
import { PrimaryButton } from '../components/UI';
import Wisp from '../components/Wisp';
import { getPackages, purchase, restore, isCancelledError } from '../services/billing';
import { useApp } from '../store/AppContext';
import { ScreenProps } from '../navigation';

export const SITE = 'https://tryforma.app/wisp';
const BENEFITS: [string, string, string][] = [
  ['🆘', 'Craving SOS', 'Unlimited 3-minute rescue sessions.'],
  ['📉', 'Taper plan', 'A daily allowance that shrinks to zero.'],
  ['🫁', 'Health timeline', 'See what your body is doing right now.'],
  ['💸', 'Money & puff stats', 'Every dollar and puff you did not spend.'],
];

export default function PaywallScreen({ navigation, route }: ScreenProps<'Paywall'>) {
  const { setPro, state } = useApp();
  const [pkgs, setPkgs] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fromOnboarding = route.params?.fromOnboarding;

  useEffect(() => {
    getPackages().then((p) => {
      setPkgs(p);
      const annual = p.find((x) => x.packageType === 'ANNUAL' || x.identifier === '$rc_annual');
      setSelected((annual ?? p[0])?.identifier ?? null);
      setLoaded(true);
    });
  }, []);

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Home');
  };

  const isAnnual = (p: PurchasesPackage) => p.packageType === 'ANNUAL' || p.identifier === '$rc_annual';
  const isWeekly = (p: PurchasesPackage) => p.packageType === 'WEEKLY' || p.identifier === '$rc_weekly';
  const titleFor = (p: PurchasesPackage) =>
    isAnnual(p) ? 'Yearly' : isWeekly(p) ? 'Weekly' : p.packageType === 'MONTHLY' ? 'Monthly' : p.product.title;

  const onSubscribe = async () => {
    const pkg = pkgs.find((p) => p.identifier === selected);
    if (!pkg) {
      Alert.alert('Not available yet', 'Plans could not be loaded right now. Please check your connection and try again.');
      return;
    }
    setBusy(true);
    try {
      const ok = await purchase(pkg);
      if (ok) {
        setPro(true);
        close();
      }
    } catch (e) {
      if (!isCancelledError(e)) Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      if (ok) {
        setPro(true);
        close();
      } else {
        Alert.alert('Nothing to restore', 'No active subscription was found for this Apple ID.');
      }
    } catch {
      Alert.alert('Restore failed', 'Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable onPress={close} hitSlop={12} style={styles.close}>
        <Text style={{ color: colors.inkFaint, fontSize: 16, fontWeight: '600' }}>{fromOnboarding ? 'Skip' : '✕'}</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center' }}>
          <Wisp stage={4} mood="happy" size={150} />
        </View>
        <Text style={[type.display, { textAlign: 'center', marginTop: 4 }]}>Help {state.wispName} glow</Text>
        <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 6 }]}>
          Everything you need for the hard moments.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map(([icon, label, sub]) => (
            <View key={label} style={styles.benefitRow}>
              <Text style={{ fontSize: 20, width: 32 }}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{label}</Text>
                <Text style={type.sub}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 12, marginTop: 4 }}>
          {!loaded ? (
            <Text style={[type.caption, { textAlign: 'center' }]}>Loading plans…</Text>
          ) : pkgs.length === 0 ? (
            <View style={styles.plan}>
              <Text style={[type.bodySoft, { textAlign: 'center', flex: 1 }]}>
                Plans are not available right now. You can keep using the free core loop and try again later.
              </Text>
            </View>
          ) : (
            pkgs.map((p) => {
              const active = p.identifier === selected;
              return (
                <Pressable
                  key={p.identifier}
                  onPress={() => setSelected(p.identifier)}
                  style={[styles.plan, active && styles.planActive]}
                >
                  <View>
                    <Text style={type.h3}>{titleFor(p)}</Text>
                    {isAnnual(p) && <Text style={[type.caption, { color: colors.gold, marginTop: 2 }]}>Best value</Text>}
                    {isWeekly(p) && <Text style={[type.caption, { color: colors.accent, marginTop: 2 }]}>3-day free trial</Text>}
                  </View>
                  <Text style={[type.h3, { color: active ? colors.ink : colors.inkSoft }]}>{p.product.priceString}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <PrimaryButton title="Continue" onPress={onSubscribe} loading={busy} disabled={!selected} style={{ marginTop: 20 }} />
        <Text style={[type.caption, { textAlign: 'center', marginTop: 12, lineHeight: 17 }]}>
          Payment is charged to your Apple ID at confirmation. Subscriptions auto-renew unless cancelled at least 24 hours before
          the end of the current period. Cancel anytime in Settings › Apple ID › Subscriptions.
        </Text>

        <View style={styles.links}>
          <Pressable onPress={onRestore}><Text style={styles.link}>Restore purchases</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(`${SITE}/terms.html`)}><Text style={styles.link}>Terms</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(`${SITE}/privacy.html`)}><Text style={styles.link}>Privacy</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  close: { position: 'absolute', top: 54, right: 20, zIndex: 5, padding: 6 },
  scroll: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 30 },
  benefits: { marginTop: 22, marginBottom: 20, gap: 14 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plan: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
  },
  planActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 20 },
  link: { color: colors.inkFaint, fontSize: 13, fontWeight: '600' },
});
