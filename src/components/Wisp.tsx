import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Ellipse, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { Mood } from '../logic/types';
import { STAGE_COLORS } from '../theme';

type Props = {
  stage: number; // 0-5
  mood?: Mood;
  size?: number;
  animate?: boolean;
  style?: ViewStyle;
};

const EYE = '#1B2140';
const EYE_DULL = '#3C4360';
const CHEEK = '#FF9BB5';
const GOLD = '#FFD97A';

function sparkle(cx: number, cy: number, s: number) {
  return `M${cx} ${cy - s} Q${cx} ${cy} ${cx + s} ${cy} Q${cx} ${cy} ${cx} ${cy + s} Q${cx} ${cy} ${cx - s} ${cy} Q${cx} ${cy} ${cx} ${cy - s} Z`;
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const SPARKLE_SPOTS: [number, number, number][] = [
  [28, 60, 7],
  [172, 56, 6],
  [24, 130, 5],
  [178, 128, 7],
  [60, 24, 5],
  [146, 22, 6],
];

export default function Wisp({ stage, mood = 'neutral', size = 220, animate = true, style }: Props) {
  const s = Math.max(0, Math.min(5, Math.round(stage)));
  const color = STAGE_COLORS[s];
  const breathe = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animate) return;
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const f = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    b.start();
    f.start();
    return () => {
      b.stop();
      f.stop();
    };
  }, [animate, breathe, float]);

  useEffect(() => {
    if (!animate) return;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let alive = true;
    const loop = () => {
      t1 = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        t2 = setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          loop();
        }, 130);
      }, 3000 + Math.random() * 2000);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [animate]);

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });

  const dull = s === 0;
  const eyeColor = dull ? EYE_DULL : EYE;
  const glowOpacity = [0.12, 0.25, 0.35, 0.45, 0.6, 0.8][s];
  const sparkCount = s >= 5 ? 6 : s === 4 ? 4 : s === 3 ? 2 : 0;
  const eyesClosed = blink && mood !== 'proud';

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={s >= 4 ? GOLD : color} stopOpacity={glowOpacity} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="body" cx="42%" cy="35%" r="70%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={s === 0 ? 0.35 : 0.65} />
              <Stop offset="100%" stopColor={color} stopOpacity={1} />
            </RadialGradient>
          </Defs>

          {/* Ambient glow */}
          <Circle cx={100} cy={104} r={96} fill="url(#glow)" />

          {/* Halo (stage 5) / golden ring (stage 4) */}
          {s === 4 && <Circle cx={100} cy={104} r={78} fill="none" stroke={GOLD} strokeWidth={3} opacity={0.75} />}
          {s === 5 && (
            <>
              <Circle cx={100} cy={104} r={82} fill="none" stroke="#FFF4D6" strokeWidth={2} opacity={0.5} />
              <Ellipse cx={100} cy={38} rx={30} ry={8} fill="none" stroke={GOLD} strokeWidth={4} opacity={0.95} />
            </>
          )}

          {/* Smoke swirl (stage 0) */}
          {s === 0 && (
            <Path
              d="M92 40 C80 30, 84 14, 100 16 C114 18, 108 34, 120 30 C132 26, 134 12, 126 8"
              stroke="#B7BECF"
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              opacity={0.45}
            />
          )}

          {/* Body: overlapping circles → one puffy blob */}
          <G fill="url(#body)">
            <Circle cx={100} cy={104} r={54} />
            <Circle cx={62} cy={114} r={32} />
            <Circle cx={138} cy={112} r={34} />
            <Circle cx={78} cy={72} r={32} />
            <Circle cx={124} cy={70} r={30} />
            <Circle cx={100} cy={140} r={30} />
          </G>
          {/* soft underside shadow */}
          <Ellipse cx={100} cy={150} rx={44} ry={12} fill="#000" opacity={0.06} />

          {/* Cheeks */}
          <Ellipse cx={70} cy={112} rx={9} ry={5} fill={CHEEK} opacity={dull ? 0.18 : 0.42} />
          <Ellipse cx={130} cy={112} rx={9} ry={5} fill={CHEEK} opacity={dull ? 0.18 : 0.42} />

          {/* Eyes */}
          <Eyes mood={mood} closed={eyesClosed} color={eyeColor} dull={dull} />

          {/* Mouth */}
          <Mouth mood={mood} color={eyeColor} />

          {/* Sparkles */}
          {SPARKLE_SPOTS.slice(0, sparkCount).map(([x, y, r], i) => (
            <Path key={i} d={sparkle(x, y, r)} fill={s >= 4 ? GOLD : '#FFFFFF'} opacity={0.9} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

function Eyes({ mood, closed, color, dull }: { mood: Mood; closed: boolean; color: string; dull: boolean }) {
  const lx = 84;
  const rx = 116;
  const y = 98;
  if (mood === 'proud') {
    return (
      <G fill={GOLD}>
        <Path d={star(lx, y, 9)} />
        <Path d={star(rx, y, 9)} />
      </G>
    );
  }
  if (closed) {
    return (
      <G stroke={color} strokeWidth={3} strokeLinecap="round" fill="none">
        <Path d={`M${lx - 6} ${y} Q${lx} ${y + 4} ${lx + 6} ${y}`} />
        <Path d={`M${rx - 6} ${y} Q${rx} ${y + 4} ${rx + 6} ${y}`} />
      </G>
    );
  }
  const ry = mood === 'craving' ? 4.5 : 6.5;
  return (
    <G>
      {mood === 'sad' && (
        <G stroke={color} strokeWidth={2.5} strokeLinecap="round" fill="none">
          <Path d={`M${lx - 8} ${y - 12} L${lx + 5} ${y - 8}`} />
          <Path d={`M${rx + 8} ${y - 12} L${rx - 5} ${y - 8}`} />
        </G>
      )}
      <Ellipse cx={lx} cy={y} rx={6.5} ry={ry} fill={color} />
      <Ellipse cx={rx} cy={y} rx={6.5} ry={ry} fill={color} />
      {!dull && (
        <>
          <Circle cx={lx + 2.2} cy={y - 2.2} r={2} fill="#FFF" />
          <Circle cx={rx + 2.2} cy={y - 2.2} r={2} fill="#FFF" />
        </>
      )}
      {mood === 'sad' && <Path d={`M${lx + 4} ${y + 9} q4 6 0 12 q-4 -6 0 -12`} fill="#8FD3FF" opacity={0.9} />}
      {mood === 'craving' && <Path d={`M140 62 q5 8 0 14 q-5 -6 0 -14`} fill="#8FD3FF" opacity={0.95} />}
    </G>
  );
}

function Mouth({ mood, color }: { mood: Mood; color: string }) {
  const cx = 100;
  const y = 118;
  const common = { stroke: color, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' as const };
  switch (mood) {
    case 'happy':
      return <Path d={`M${cx - 11} ${y} Q${cx} ${y + 12} ${cx + 11} ${y}`} {...common} />;
    case 'proud':
      return <Path d={`M${cx - 12} ${y - 2} Q${cx} ${y + 16} ${cx + 12} ${y - 2} Z`} fill={color} />;
    case 'sad':
      return <Path d={`M${cx - 9} ${y + 6} Q${cx} ${y - 4} ${cx + 9} ${y + 6}`} {...common} />;
    case 'craving':
      return <Path d={`M${cx - 12} ${y + 2} q3 -5 6 0 t6 0 t6 0 t6 0`} {...common} />;
    default:
      return <Path d={`M${cx - 7} ${y + 1} Q${cx} ${y + 5} ${cx + 7} ${y + 1}`} {...common} />;
  }
}
