import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreColors, StoreRadii } from '@/constants/store-theme';

const userMenuItems = [
  { href: '/' as const, icon: 'home-outline' as const, label: 'หน้าหลัก' },
  { href: '/categories' as const, icon: 'grid-outline' as const, label: 'หมวดหมู่สินค้า' },
  { href: '/cart' as const, icon: 'cart-outline' as const, label: 'ตะกร้าสินค้า' },
  { href: '/profile' as const, icon: 'person-circle-outline' as const, label: 'โปรไฟล์' },
];

export function UserSidebar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;

  const openSidebar = () => {
    progress.setValue(1);
    setIsOpen(true);
    requestAnimationFrame(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeSidebar = () => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 210,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsOpen(false);
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="เปิดเมนูหลัก"
        accessibilityState={{ expanded: isOpen }}
        onPress={openSidebar}
        hitSlop={8}
        style={({ pressed }) => [
          styles.menuButton,
          { top: insets.top + 10 },
          pressed && styles.pressed,
        ]}>
        <Ionicons name="menu" size={25} color={StoreColors.white} />
      </Pressable>

      <Modal
        animationType="none"
        transparent
        statusBarTranslucent
        visible={isOpen}
        onRequestClose={closeSidebar}>
        <View style={styles.layer}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ปิดเมนูหลัก"
            onPress={closeSidebar}
            style={styles.dismissArea}
          />
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.drawer,
              {
                paddingTop: insets.top + 28,
                paddingBottom: insets.bottom + 24,
                transform: [{
                  translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -280] }),
                }],
              },
            ]}>
            <View style={styles.heading}>
              <Text style={styles.title}>เมนู</Text>
              <Text style={styles.subtitle}>PAN &amp; TOYS</Text>
            </View>

            {userMenuItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: isActive }}
                    onPress={closeSidebar}
                    style={({ pressed }) => [
                      styles.menuItem,
                      isActive && styles.activeMenuItem,
                      pressed && styles.pressed,
                    ]}>
                    <Ionicons name={item.icon} size={22} color={StoreColors.ink} />
                    <Text numberOfLines={2} style={styles.menuText}>{item.label}</Text>
                  </Pressable>
                </Link>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    position: 'absolute',
    left: 14,
    zIndex: 100,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: StoreColors.jungleDark,
    borderWidth: 2,
    borderColor: StoreColors.ink,
    borderRadius: StoreRadii.small,
    borderCurve: 'continuous',
    boxShadow: `2px 2px 0 ${StoreColors.ink}`,
  },
  layer: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  dismissArea: { ...StyleSheet.absoluteFillObject },
  drawer: {
    width: '30%',
    minWidth: 180,
    maxWidth: 280,
    height: '100%',
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: StoreColors.mintSoft,
    borderRightWidth: 3,
    borderRightColor: StoreColors.ink,
    boxShadow: '5px 0 0 rgba(14, 42, 26, 0.28)',
  },
  heading: { paddingHorizontal: 4, paddingBottom: 14, gap: 2 },
  title: { color: StoreColors.jungleDark, fontSize: 27, fontWeight: '900' },
  subtitle: { color: StoreColors.jungle, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  menuItem: {
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: StoreColors.white,
    borderWidth: 2,
    borderColor: StoreColors.ink,
    borderRadius: StoreRadii.small,
    borderCurve: 'continuous',
  },
  activeMenuItem: { backgroundColor: StoreColors.electric },
  menuText: { flex: 1, color: StoreColors.ink, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  pressed: { opacity: 0.75, transform: [{ translateX: 1 }, { translateY: 1 }] },
});
