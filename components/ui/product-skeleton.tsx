// Skeleton แสดงระหว่างรอ API ส่งรายการสินค้ามา
import { StyleSheet, View } from 'react-native';

import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';

export function ProductSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="กำลังโหลดสินค้า">
      <View style={styles.image} />
      <View style={styles.lineLong} />
      <View style={styles.lineShort} />
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: StoreSpacing.sm,
    gap: StoreSpacing.sm,
    backgroundColor: StoreColors.surface,
    borderWidth: 1,
    borderColor: '#DDE8E1',
    borderRadius: StoreRadii.medium,
    borderCurve: 'continuous',
    boxShadow: StoreShadows.card,
  },
  image: { width: '100%', aspectRatio: 1.12, backgroundColor: StoreColors.mintMuted, borderRadius: StoreRadii.small, opacity: 0.68 },
  lineLong: { width: '86%', height: 14, backgroundColor: StoreColors.mintMuted, borderRadius: StoreRadii.pill, opacity: 0.68 },
  lineShort: { width: '52%', height: 14, backgroundColor: StoreColors.mintMuted, borderRadius: StoreRadii.pill, opacity: 0.68 },
  button: { width: '100%', height: 42, backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill, opacity: 0.68 },
});
