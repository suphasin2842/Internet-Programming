// Design token กลางของร้าน ใช้ให้ทุกหน้าใช้สี/ระยะ/ฟอนต์ไปทางเดียวกัน
export const StoreColors = {
  ink: '#17382D',
  text: '#17382D',
  textMuted: '#607169',
  jungle: '#238A50',
  jungleDark: '#145A35',
  primary: '#145A35',
  primarySoft: '#DDF7E7',
  electric: '#BDFC4D',
  accent: '#FF7A45',
  mint: '#F1FFF7',
  mintSoft: '#FBFFFC',
  mintMuted: '#DDEFE5',
  orange: '#FF8A3D',
  yellow: '#FFD95A',
  lavender: '#E9E1FF',
  peach: '#FFE3D1',
  background: '#F4FFF7',
  surface: '#FFFFFF',
  surfaceAlt: '#ECF7F0',
  border: '#17382D',
  white: '#FFFFFF',
  success: '#168B4B',
  warning: '#D99116',
  danger: '#C43D3D',
  overlay: 'rgba(12, 35, 27, 0.5)',
} as const;

export const StoreRadii = {
  small: 12,
  medium: 18,
  large: 28,
  pill: 999,
} as const;

export const StoreSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const StoreFonts = {
  display: 'Mali_700Bold',
  heading: 'Mali_600SemiBold',
  body: 'NotoSansThai_400Regular',
  medium: 'NotoSansThai_500Medium',
  semibold: 'NotoSansThai_600SemiBold',
  bold: 'NotoSansThai_700Bold',
} as const;

export const StoreShadows = {
  card: '0 2px 8px rgba(23, 56, 45, 0.08)',
  raised: '0 10px 28px rgba(23, 56, 45, 0.13)',
  floating: '0 16px 40px rgba(23, 56, 45, 0.18)',
} as const;

export const StoreMotion = {
  fast: 140,
  base: 220,
  slow: 360,
} as const;
