import { TextStyle } from 'react-native';

export const colors = {
  bg: '#0B1026',
  bgElevated: '#10163A',
  card: '#151B36',
  cardAlt: '#1C2447',
  ink: '#F3F5FF',
  inkSoft: '#B8BEDD',
  inkFaint: '#8B93B5',
  accent: '#7EF0C4',
  accentDeep: '#4FD6A4',
  lavender: '#B9A7FF',
  sky: '#8FD3FF',
  gold: '#FFD97A',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  success: '#7EF0C4',
  danger: '#FF8A9B',
  overlay: 'rgba(5,8,22,0.78)',
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 };

export const space = (n: number) => n * 4;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, fontWeight: '400', color: colors.ink, lineHeight: 23 },
  bodySoft: { fontSize: 15, fontWeight: '400', color: colors.inkSoft, lineHeight: 22 },
  label: { fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 1.4, textTransform: 'uppercase' },
  sub: { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  caption: { fontSize: 12, fontWeight: '500', color: colors.inkFaint },
  num: { fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.8, ...tabular },
  numLg: { fontSize: 44, fontWeight: '800', color: colors.ink, letterSpacing: -1.2, ...tabular },
};

export const STAGE_COLORS = ['#8A93A6', '#C9BEF5', '#8FD3FF', '#7EF0C4', '#FFD97A', '#FFF4D6'];
export const STAGE_NAMES = ['Grey Wisp', 'Pale Wisp', 'Sky Wisp', 'Mint Wisp', 'Golden Wisp', 'Radiant Wisp'];
