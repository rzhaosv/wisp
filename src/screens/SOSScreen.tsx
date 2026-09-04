import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import { PrimaryButton, GhostButton } from '../components/UI';
import Wisp from '../components/Wisp';
import { useApp } from '../store/AppContext';
import { ScreenProps } from '../navigation';
import { effectiveStage } from '../logic/wisp';
import { REASON_LINES, REASON_LABELS, Reason } from '../logic/types';

const STEP_SECONDS = 60;
const TAP_GOAL = 20;
const PHASES = ['In', 'Hold', 'Out', 'Hold'];

async function haptic(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const H = await import('expo-haptics');
    if (kind === 'success') await H.notificationAsync(H.NotificationFeedbackType.Success);
    else await H.impactAsync(kind === 'light' ? H.ImpactFeedbackStyle.Light : H.ImpactFeedbackStyle.Medium);
  } catch {
    /* ignore */
  }
}

export default function SOSScreen({ navigation }: ScreenProps<'SOS'>) {
  const { state, logCraving } = useApp();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [seconds, setSeconds] = useState(STEP_SECONDS);
  const stage = effectiveStage(state, Date.now());

  // Countdown per step
  useEffect(() => {
    if (step === 3) return;
    setSeconds(STEP_SECONDS);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setStep((p) => (p < 3 ? ((p + 1) as 0 | 1 | 2 | 3) : p));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 3) {
      logCraving(true);
      haptic('success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const leave = () => {
    if (step < 3) logCraving(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text style={type.label}>{step < 3 ? `Step ${step + 1} of 3` : 'Done'}</Text>
        {step < 3 && <Text style={[type.h3, { fontVariant: ['tabular-nums'] }]}>{seconds}s</Text>}
      </View>

      <View style={{ flex: 1 }}>
        {step === 0 && <Breathing />}
        {step === 1 && <TapGame stage={stage} name={state.wispName} />}
        {step === 2 && <Reflect reasons={state.reasons} seconds={seconds} />}
        {step === 3 && <Beaten name={state.wispName} stage={stage} />}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 6 }}>
        {step === 3 ? (
          <PrimaryButton title="Back to home" onPress={() => navigation.goBack()} />
        ) : (
          <>
            <PrimaryButton title={step === 2 ? 'I beat it' : 'Skip ahead'} onPress={() => setStep((p) => (p + 1) as 0 | 1 | 2 | 3)} />
            <GhostButton title="I need to leave" onPress={leave} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Breathing() {
  const scale = useRef(new Animated.Value(0.55)).current;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let alive = true;
    const run = (i: number) => {
      if (!alive) return;
      setPhase(i % 4);
      haptic(i % 2 === 0 ? 'medium' : 'light');
      const to = i % 4 === 0 ? 1 : i % 4 === 2 ? 0.55 : undefined;
      const anim =
        to === undefined
          ? Animated.delay(4000)
          : Animated.timing(scale, { toValue: to, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
      anim.start(({ finished }) => finished && run(i + 1));
    };
    run(0);
    return () => {
      alive = false;
      scale.stopAnimation();
    };
  }, [scale]);

  return (
    <View style={styles.center}>
      <Text style={[type.h1, { textAlign: 'center' }]}>Surf the wave</Text>
      <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 6, paddingHorizontal: 30 }]}>
        Cravings crest and fall in about three minutes. Breathe with the circle.
      </Text>
      <View style={styles.breathWrap}>
        <Animated.View style={[styles.breathOuter, { transform: [{ scale }] }]} />
        <View style={styles.breathLabel}>
          <Text style={[type.display, { fontSize: 28 }]}>{PHASES[phase]}</Text>
          <Text style={type.sub}>4 seconds</Text>
        </View>
      </View>
    </View>
  );
}

function TapGame({ stage, name }: { stage: number; name: string }) {
  const [taps, setTaps] = useState(0);
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const W = Dimensions.get('window').width;
  const areaW = W - 48 - 120;
  const areaH = 260;

  useEffect(() => {
    let alive = true;
    const drift = () => {
      if (!alive) return;
      Animated.timing(pos, {
        toValue: { x: Math.random() * areaW, y: Math.random() * areaH },
        duration: 1400 + Math.random() * 800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => finished && drift());
    };
    drift();
    return () => {
      alive = false;
      pos.stopAnimation();
    };
  }, [pos, areaW, areaH]);

  const tap = () => {
    haptic('light');
    setTaps((t) => Math.min(TAP_GOAL, t + 1));
  };
  const done = taps >= TAP_GOAL;

  return (
    <View style={styles.center}>
      <Text style={[type.h1, { textAlign: 'center' }]}>Catch {name}</Text>
      <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 6 }]}>
        {done ? `${name} is giggling. Nice reflexes.` : `Tap ${name} ${TAP_GOAL - taps} more times.`}
      </Text>
      <View style={{ width: areaW + 120, height: areaH + 120, marginTop: 16 }}>
        <Animated.View style={{ position: 'absolute', transform: pos.getTranslateTransform() }}>
          <Pressable onPress={tap} hitSlop={10}>
            <Wisp stage={stage} mood={done ? 'proud' : 'craving'} size={120} animate={false} />
          </Pressable>
        </Animated.View>
      </View>
      <Text style={[type.num, { marginTop: 4 }]}>
        {taps}
        <Text style={type.sub}> / {TAP_GOAL}</Text>
      </Text>
    </View>
  );
}

function Reflect({ reasons, seconds }: { reasons: Reason[]; seconds: number }) {
  const list = reasons.length ? reasons : (['freedom'] as Reason[]);
  const idx = Math.floor((STEP_SECONDS - seconds) / 8) % list.length;
  const r = list[idx];
  return (
    <View style={styles.center}>
      <Text style={[type.h1, { textAlign: 'center' }]}>Remember why</Text>
      <View style={styles.reflectCard}>
        <Text style={[type.label, { color: colors.lavender }]}>{REASON_LABELS[r]}</Text>
        <Text style={[type.h2, { marginTop: 10, lineHeight: 28 }]}>{REASON_LINES[r]}</Text>
      </View>
      <Text style={[type.caption, { marginTop: 16 }]}>The wave is passing. {seconds}s to go.</Text>
    </View>
  );
}

function Beaten({ name, stage }: { name: string; stage: number }) {
  const burst = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(burst, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [burst]);
  const sparks = Array.from({ length: 12 }).map((_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: Math.cos(a) * 120, y: Math.sin(a) * 120, key: i };
  });
  return (
    <View style={styles.center}>
      <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
        {sparks.map((s) => (
          <Animated.Text
            key={s.key}
            style={{
              position: 'absolute',
              fontSize: 18,
              opacity: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, s.x] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, s.y] }) },
              ],
            }}
          >
            {s.key % 2 ? '✨' : '⭐'}
          </Animated.Text>
        ))}
        <Wisp stage={stage} mood="proud" size={220} />
      </View>
      <Text style={[type.display, { textAlign: 'center' }]}>Craving beaten</Text>
      <Text style={[type.bodySoft, { textAlign: 'center', marginTop: 8, paddingHorizontal: 30 }]}>
        {name} is glowing with pride. That wave is behind you.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  breathWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  breathOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(126,240,196,0.18)',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  breathLabel: { alignItems: 'center' },
  reflectCard: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
  },
});
