// Sidebar ของผู้ใช้บน Desktop; Admin จะเห็นเมนูจัดการร้านเฉพาะเมื่อ Login แล้ว
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreBadge } from '@/components/ui/store-badge';
import { StoreText } from '@/components/ui/store-text';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreColors, StoreRadii, StoreSpacing } from '@/constants/store-theme';

const userMenuItems = [
  { href: '/' as const, icon: 'home-outline' as const, label: 'หน้าหลัก' },
  { href: '/categories' as const, icon: 'grid-outline' as const, label: 'หมวดหมู่สินค้า' },
  { href: '/cart' as const, icon: 'bag-handle-outline' as const, label: 'ตะกร้าสินค้า' },
  { href: '/profile' as const, icon: 'person-outline' as const, label: 'โปรไฟล์' },
];

export function UserSidebar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { role, user, admin } = useAuth();
  const { itemCount } = useCart();

  return (
    <View style={[styles.sidebar, { paddingTop: Math.max(insets.top, StoreSpacing.lg), paddingBottom: Math.max(insets.bottom, StoreSpacing.md) }]}>
      <Link href="/" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="ไปหน้าหลัก" style={({ pressed }) => [styles.brand, pressed && styles.pressed]}>
          <View style={styles.logo}><StoreIcon name="sparkles" size={21} color={StoreColors.text} /></View>
          <View style={styles.brandCopy}>
            <StoreText variant="heading" style={styles.brandTitle}>PAN &amp; TOYS</StoreText>
            <StoreText variant="caption">Wacky Toy World</StoreText>
          </View>
        </Pressable>
      </Link>

      <View style={styles.menu}>
        <StoreText variant="caption" style={styles.menuCaption}>เมนูหลัก</StoreText>
        {userMenuItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [styles.menuItem, isActive && styles.activeMenuItem, pressed && styles.pressed]}>
                <View style={[styles.menuIcon, isActive && styles.activeMenuIcon]}>
                  <StoreIcon name={item.icon} size={20} color={isActive ? StoreColors.white : StoreColors.text} />
                </View>
                <StoreText variant="label" style={styles.menuLabel}>{item.label}</StoreText>
                {item.href === '/cart' && itemCount > 0 && <StoreBadge label={String(itemCount)} tone="accent" />}
              </Pressable>
            </Link>
          );
        })}

        {role === 'admin' && (
          <Link href="/admin" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="จัดการร้านค้า" style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <View style={[styles.menuIcon, styles.adminIcon]}><StoreIcon name="pencil-outline" size={20} color={StoreColors.text} /></View>
              <StoreText variant="label" style={styles.menuLabel}>จัดการร้านค้า</StoreText>
            </Pressable>
          </Link>
        )}
      </View>

      <View style={styles.accountCard}>
        <View style={styles.avatar}><StoreIcon name={role === 'admin' ? 'shield-checkmark-outline' : 'person-outline'} size={20} color={StoreColors.primary} /></View>
        <View style={styles.accountCopy}>
          <StoreText variant="label" numberOfLines={1}>{role === 'user' ? user?.name : role === 'admin' ? admin?.username : 'ผู้เยี่ยมชม'}</StoreText>
          <StoreText variant="caption" numberOfLines={1}>{role === 'admin' ? 'Admin' : role === 'user' ? 'สมาชิก' : 'ยังไม่ได้เข้าสู่ระบบ'}</StoreText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 236, height: '100%', paddingHorizontal: StoreSpacing.md, gap: StoreSpacing.xl, backgroundColor: StoreColors.surface, borderRightWidth: 1, borderRightColor: '#DCE9E1' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm },
  logo: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderRadius: StoreRadii.medium, transform: [{ rotate: '-5deg' }] },
  brandCopy: { flex: 1 },
  brandTitle: { color: StoreColors.primary, fontSize: 17, lineHeight: 23 },
  menu: { flex: 1, gap: StoreSpacing.xs },
  menuCaption: { paddingHorizontal: StoreSpacing.sm, paddingBottom: StoreSpacing.xxs },
  menuItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, paddingHorizontal: StoreSpacing.xs, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  activeMenuItem: { backgroundColor: StoreColors.primarySoft },
  menuIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.small },
  activeMenuIcon: { backgroundColor: StoreColors.primary },
  adminIcon: { backgroundColor: StoreColors.yellow },
  menuLabel: { flex: 1 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surface, borderRadius: StoreRadii.pill },
  accountCopy: { flex: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
