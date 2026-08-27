// Badge เล็ก ๆ สำหรับหมวดหมู่, สถานะ และป้าย User/Admin
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { StoreColors, StoreRadii, StoreSpacing } from '@/constants/store-theme';
import { StoreText } from '@/components/ui/store-text';

export function StoreBadge({ label, tone = 'neutral', style }: {
  label: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.base, toneStyles[tone], style]}>
      <StoreText variant="caption" numberOfLines={1} style={styles.label}>{label}</StoreText>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  neutral: { backgroundColor: StoreColors.surfaceAlt },
  primary: { backgroundColor: StoreColors.primarySoft },
  accent: { backgroundColor: StoreColors.peach },
  success: { backgroundColor: '#DDF7E7' },
  danger: { backgroundColor: '#FFE3E3' },
});

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: StoreSpacing.sm,
    borderRadius: StoreRadii.pill,
    borderCurve: 'continuous',
  },
  label: { color: StoreColors.text },
});
