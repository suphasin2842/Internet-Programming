// Toast แจ้งผลสั้น ๆ เช่น เพิ่มสินค้าเข้าตะกร้าสำเร็จ
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, ReduceMotion } from 'react-native-reanimated';

import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';

export function FeedbackToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(onDismiss, 2200);
    return () => clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(180).reduceMotion(ReduceMotion.System)}
      style={styles.toast}>
      <View style={styles.icon}><StoreIcon name="checkmark" size={17} color={StoreColors.white} /></View>
      <StoreText variant="label" numberOfLines={2} style={styles.text}>{message}</StoreText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    zIndex: 30,
    top: StoreSpacing.sm,
    alignSelf: 'center',
    maxWidth: 420,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: StoreSpacing.sm,
    paddingHorizontal: StoreSpacing.md,
    backgroundColor: StoreColors.surface,
    borderWidth: 1,
    borderColor: '#D7E5DC',
    borderRadius: StoreRadii.pill,
    borderCurve: 'continuous',
    boxShadow: StoreShadows.floating,
  },
  icon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.success, borderRadius: StoreRadii.pill },
  text: { flexShrink: 1 },
});
