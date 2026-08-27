// Text กลางของร้าน รวม Typography หลายระดับไว้ให้เรียกใช้เป็นชุดเดียว
import { Text, TextProps, TextStyle } from 'react-native';

import { StoreColors, StoreFonts } from '@/constants/store-theme';

const variants = {
  display: { fontFamily: StoreFonts.display, fontSize: 42, lineHeight: 50, color: StoreColors.text },
  title: { fontFamily: StoreFonts.heading, fontSize: 26, lineHeight: 34, color: StoreColors.text },
  heading: { fontFamily: StoreFonts.heading, fontSize: 20, lineHeight: 28, color: StoreColors.text },
  body: { fontFamily: StoreFonts.body, fontSize: 15, lineHeight: 23, color: StoreColors.text },
  label: { fontFamily: StoreFonts.semibold, fontSize: 14, lineHeight: 20, color: StoreColors.text },
  caption: { fontFamily: StoreFonts.medium, fontSize: 12, lineHeight: 18, color: StoreColors.textMuted },
} as const satisfies Record<string, TextStyle>;

export type StoreTextVariant = keyof typeof variants;

export function StoreText({ variant = 'body', style, ...props }: TextProps & { variant?: StoreTextVariant }) {
  return <Text {...props} style={[variants[variant], style]} />;
}
