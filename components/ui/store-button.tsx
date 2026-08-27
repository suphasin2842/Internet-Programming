// ปุ่มกลางของระบบ: รวมสี, ขนาด, Loading และสถานะกดไว้ที่เดียว
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { StoreColors, StoreFonts, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { StoreIcon, StoreIconName } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: { container: { backgroundColor: StoreColors.electric }, text: { color: StoreColors.text } },
  secondary: { container: { backgroundColor: StoreColors.primary }, text: { color: StoreColors.white } },
  outline: { container: { backgroundColor: StoreColors.surface, borderColor: StoreColors.border }, text: { color: StoreColors.text } },
  ghost: { container: { backgroundColor: 'transparent', borderColor: 'transparent' }, text: { color: StoreColors.primary } },
  danger: { container: { backgroundColor: StoreColors.danger, borderColor: StoreColors.danger }, text: { color: StoreColors.white } },
};

const sizes: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 40, paddingHorizontal: StoreSpacing.sm },
  md: { minHeight: 46, paddingHorizontal: StoreSpacing.md },
  lg: { minHeight: 52, paddingHorizontal: StoreSpacing.lg },
};

export function StoreButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  stopPropagation = false,
  style,
}: {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  icon?: StoreIconName;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  stopPropagation?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const appearance = variants[variant];
  const iconColor = String(appearance.text.color);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={(event) => {
        if (stopPropagation) event.stopPropagation();
        onPress?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        appearance.container,
        sizes[size],
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {icon && <StoreIcon name={icon} size={size === 'sm' ? 17 : 19} color={iconColor} />}
          <StoreText variant="label" style={[styles.text, appearance.text]}>{title}</StoreText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: StoreSpacing.xs,
    borderWidth: 1.5,
    borderColor: StoreColors.border,
    borderRadius: StoreRadii.pill,
    borderCurve: 'continuous',
    boxShadow: StoreShadows.card,
  },
  text: { fontFamily: StoreFonts.semibold },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
