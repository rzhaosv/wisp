import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import { PrimaryButton, GhostButton, OptionButton, Chip, ProgressDots, Slider } from '../components/UI';
import Wisp from '../components/Wisp';
import { useApp } from '../store/AppContext';
import {
  VapeType,
  QuitMode,
  Reason,
  VAPE_LABELS,
  QUIT_MODE_LABELS,
  REASON_LABELS,
} from '../logic/types';

const STEPS = 6;

export default function OnboardingScreen({ onDone, initialStep }: { onDone: () => void; initialStep?: number }) {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(initialStep ?? 0);
  const [vapeType, setVapeType] = useState<VapeType>('disposable');
  const [puffs, setPuffs] = useState(300);
  const [nic, setNic] = useState<number>(5);
  const [nicOther, setNicOther] = useState('');
  const [cost, setCost] = useState('25');
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [mode, setMode] = useState<QuitMode>('cold');
  const [name, setName] = useState('Wisp');
  const [revealed, setRevealed] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const toggleReason = (r: Reason) =>
    setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const nicValue = nic === -1 ? Math.max(0, Math.min(10, parseFloat(nicOther) || 0)) : nic;
  const costValue = Math.max(0, parseFloat(cost) || 0);

  const canContinue =
    step === 3 ? reasons.length > 0 : step === 5 ? name.trim().length > 0 && revealed : true;

  useEffect(() => {
    if (step !== 5) return;
    reveal.setValue(0);
    setRevealed(false);
    Animated.spring(reveal, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start(() => setRevealed(true));
  }, [step, reveal]);

  const finish = () => {
    completeOnboarding({
      wispName: name.trim() || 'Wisp',
      vapeType,
      puffsPerDay: puffs,
      nicotinePct: nicValue,
      weeklyCost: costValue,
      reasons,
      quitMode: mode,
    });
    onDone();
  };

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish());
  const back = () => step > 0 && setStep(step - 1);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <ProgressDots count={STEPS} index={step} />
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <Text style={type.label}>Step 1</Text>
              <Text style={styles.q}>What do you vape?</Text>
              <View style={{ gap: 12, marginTop: 20 }}>
                {(Object.keys(VAPE_LABELS) as VapeType[]).map((k) => (
                  <OptionButton key={k} label={VAPE_LABELS[k]} selected={vapeType === k} onPress={() => setVapeType(k)} />
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={type.label}>Step 2</Text>
              <Text style={styles.q}>How much do you vape?</Text>
              <Text style={[type.bodySoft, { marginTop: 6 }]}>A rough guess is fine. You can change this later.</Text>
              <View style={styles.block}>
                <Text style={type.caption}>PUFFS PER DAY</Text>
                <Text style={[type.numLg, { marginTop: 4 }]}>{puffs}</Text>
                <Slider value={puffs} min={50} max={800} step={10} onChange={setPuffs} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={type.caption}>50</Text>
                  <Text style={type.caption}>800</Text>
                </View>
              </View>
              <View style={styles.block}>
                <Text style={[type.caption, { marginBottom: 10 }]}>NICOTINE STRENGTH</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[2, 3, 5].map((n) => (
                    <Chip key={n} text={`${n}%`} selected={nic === n} onPress={() => setNic(n)} />
                  ))}
                  <Chip text="Other" selected={nic === -1} onPress={() => setNic(-1)} />
                </View>
                {nic === -1 && (
                  <TextInput
                    value={nicOther}
                    onChangeText={setNicOther}
                    placeholder="e.g. 1.5"
                    placeholderTextColor={colors.inkFaint}
                    keyboardType="decimal-pad"
                    style={[styles.input, { marginTop: 12 }]}
                  />
                )}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={type.label}>Step 3</Text>
              <Text style={styles.q}>What does it cost you?</Text>
              <Text style={[type.bodySoft, { marginTop: 6 }]}>Roughly how much you spend on vaping each week.</Text>
              <View style={[styles.block, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <Text style={[type.numLg, { color: colors.accent }]}>$</Text>
                <TextInput
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="decimal-pad"
                  style={[type.numLg, { flex: 1, paddingVertical: 8 }]}
                  placeholder="25"
                  placeholderTextColor={colors.inkFaint}
                />
                <Text style={type.sub}>/ week</Text>
              </View>
              <Text style={[type.caption, { marginTop: 10 }]}>
                That is about ${(costValue * 52).toFixed(0)} a year.
              </Text>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={type.label}>Step 4</Text>
              <Text style={styles.q}>Why do you want to quit?</Text>
              <Text style={[type.bodySoft, { marginTop: 6 }]}>Pick everything that fits. We will remind you when it gets hard.</Text>
              <View style={{ gap: 12, marginTop: 20 }}>
                {(Object.keys(REASON_LABELS) as Reason[]).map((r) => (
                  <OptionButton
                    key={r}
                    label={REASON_LABELS[r]}
                    selected={reasons.includes(r)}
                    onPress={() => toggleReason(r)}
                    icon={{ health: '💚', money: '💸', freedom: '🕊️', breathing: '🌬️', loved: '💞', anxiety: '🧘' }[r]}
                  />
                ))}
              </View>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={type.label}>Step 5</Text>
              <Text style={styles.q}>How do you want to quit?</Text>
              <View style={{ gap: 12, marginTop: 20 }}>
                {(Object.keys(QUIT_MODE_LABELS) as QuitMode[]).map((k) => (
                  <OptionButton
                    key={k}
                    label={QUIT_MODE_LABELS[k]}
                    sub={
                      k === 'cold'
                        ? 'Your streak starts the moment you finish setup.'
                        : 'A daily puff allowance that shrinks to zero.'
                    }
                    selected={mode === k}
                    onPress={() => setMode(k)}
                  />
                ))}
              </View>
            </>
          )}

          {step === 5 && (
            <>
              <Text style={type.label}>Step 6</Text>
              <Text style={styles.q}>Name your Wisp</Text>
              <TextInput
                value={name}
                onChangeText={(t) => setName(t.slice(0, 16))}
                style={[styles.input, { marginTop: 16 }]}
                placeholder="Wisp"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="words"
                returnKeyType="done"
              />
              <Animated.View
                style={{
                  alignItems: 'center',
                  marginTop: 16,
                  opacity: reveal,
                  transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                }}
              >
                <Wisp stage={0} mood="neutral" size={200} />
                <Text style={[type.body, { textAlign: 'center', marginTop: 8, paddingHorizontal: 10 }]}>
                  This is <Text style={{ fontWeight: '800', color: colors.accent }}>{name.trim() || 'Wisp'}</Text>. Every
                  clean hour makes them brighter. Slips only dim them — they never die.
                </Text>
              </Animated.View>
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton title={step === STEPS - 1 ? "Let's go" : 'Continue'} onPress={next} disabled={!canContinue} />
          {step > 0 ? <GhostButton title="Back" onPress={back} /> : <View style={{ height: 48 }} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { paddingTop: 14, paddingBottom: 6 },
  body: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  q: { ...type.display, fontSize: 30, marginTop: 8 },
  block: {
    marginTop: 22,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
  footer: { paddingHorizontal: 24, paddingBottom: 4 },
});
