import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  ScrollView,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';

export function Screen({
  children,
  scroll,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Header({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ width: 70 }}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        )}
      </View>
      <Text style={[type.h3, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
        {title ?? ''}
      </Text>
      <View style={{ width: 70, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <Text style={[type.label, { marginBottom: 8 }, color ? { color } : null]}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  color,
  textColor,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  color?: string;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        color ? { backgroundColor: color } : null,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#08122B" />
      ) : (
        <Text style={[styles.primaryText, textColor ? { color: textColor } : null]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondary, disabled && { opacity: 0.5 }, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function GhostButton({ title, onPress, style }: { title: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.6 }, style]}>
      <Text style={styles.ghostText}>{title}</Text>
    </Pressable>
  );
}

export function OptionButton({
  label,
  sub,
  selected,
  onPress,
  icon,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionActive, pressed && { opacity: 0.85 }]}
    >
      {icon ? <Text style={{ fontSize: 22, width: 34 }}>{icon}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.h3, selected && { color: colors.accent }]}>{label}</Text>
        {sub ? <Text style={[type.sub, { marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioActive]}>{selected && <View style={styles.radioDot} />}</View>
    </Pressable>
  );
}

export function Chip({
  text,
  selected,
  onPress,
}: {
  text: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.chip, selected && styles.chipActive]}>
      <Text style={[styles.chipText, selected && { color: '#08122B' }]}>{text}</Text>
    </Pressable>
  );
}

export function ProgressDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === index ? 22 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= index ? colors.accent : colors.lineStrong,
          }}
        />
      ))}
    </View>
  );
}

/** Dependency-free slider driven by PanResponder. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromX = (x: number) => {
    const w = widthRef.current || 1;
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChangeRef.current(Math.max(min, Math.min(max, snapped)));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const ratio = (value - min) / (max - min);
  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View onLayout={onLayout} style={styles.sliderTrackWrap} {...pan.panHandlers}>
      <View style={styles.sliderTrack} pointerEvents="none">
        <View style={[styles.sliderFill, { width: Math.max(0, ratio * width) }]} />
      </View>
      <View pointerEvents="none" style={[styles.sliderThumb, { left: Math.max(0, ratio * width - 14) }]} />
    </View>
  );
}

export function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[type.caption, { marginBottom: 6 }]}>{label}</Text>
      <Text style={[type.num, { fontSize: 22, color: color ?? colors.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={[type.caption, { marginTop: 2 }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: 20 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  back: { color: colors.inkSoft, fontSize: 17, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryText: { color: '#08122B', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
  secondary: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  ghost: { height: 48, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.inkSoft, fontSize: 15, fontWeight: '600' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  optionActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  chip: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  sliderTrackWrap: { height: 44, justifyContent: 'center' },
  sliderTrack: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, overflow: 'hidden' },
  sliderFill: { height: 8, backgroundColor: colors.accent },
  sliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
