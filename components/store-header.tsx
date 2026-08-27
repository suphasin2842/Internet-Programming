// Header กลางของหน้าร้าน: Logo, Search, ตะกร้า, โปรไฟล์ และทางเข้า Admin
import { Link } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreText } from '@/components/ui/store-text';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreColors, StoreFonts, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';

type ActiveRoute = 'home' | 'categories' | 'cart' | 'profile';

export function StoreHeader({ activeRoute, isDesktop, search = '', onSearchChange, showSearch = true }: {
  activeRoute: ActiveRoute;
  isDesktop: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}) {
  const { role } = useAuth();
  const { itemCount } = useCart();

  // Header นี้ใช้ทั้ง Desktop และ Mobile โดยปรับส่วน Search ตาม Prop
  return (
    <View style={styles.header}>
      <View style={styles.inner}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="ไปหน้าหลัก" style={({ pressed }) => [styles.brandWrap, pressed && styles.pressed]}>
            <View style={styles.logoMark}><StoreIcon name="sparkles" size={17} color={StoreColors.text} /></View>
            <View>
              <StoreText variant="heading" style={styles.brand}>PAN &amp; TOYS</StoreText>
              {isDesktop && <StoreText variant="caption" style={styles.brandCaption}>Play outside the box</StoreText>}
            </View>
          </Pressable>
        </Link>

        {isDesktop && (
          <View style={styles.desktopNav}>
            <HeaderLink href="/" label="หน้าหลัก" active={activeRoute === 'home'} />
            <HeaderLink href="/categories" label="หมวดหมู่" active={activeRoute === 'categories'} />
          </View>
        )}

        {isDesktop && showSearch && <SearchField search={search} onSearchChange={onSearchChange ?? (() => undefined)} />}

        <View style={styles.actions}>
          {role === 'admin' && (
            <Link href="/admin" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="จัดการร้านค้า" style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <StoreIcon name="pencil-outline" size={20} color={StoreColors.primary} />
              </Pressable>
            </Link>
          )}
          {isDesktop && (
            <>
              <Link href="/cart" asChild>
                <Pressable accessibilityRole="link" accessibilityLabel={`ตะกร้าสินค้า ${itemCount} ชิ้น`} style={({ pressed }) => [styles.iconButton, activeRoute === 'cart' && styles.iconButtonActive, pressed && styles.pressed]}>
                  <StoreIcon name="bag-handle-outline" size={21} color={StoreColors.text} />
                  {itemCount > 0 && <View style={styles.cartBadge}><StoreText variant="caption" style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</StoreText></View>}
                </Pressable>
              </Link>
              <Link href="/profile" asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="โปรไฟล์" style={({ pressed }) => [styles.iconButton, activeRoute === 'profile' && styles.iconButtonActive, pressed && styles.pressed]}>
                  <StoreIcon name="person-outline" size={21} color={StoreColors.text} />
                </Pressable>
              </Link>
            </>
          )}
        </View>
      </View>
      {!isDesktop && showSearch && <View style={styles.mobileSearch}><SearchField search={search} onSearchChange={onSearchChange ?? (() => undefined)} /></View>}
    </View>
  );
}

function HeaderLink({ href, label, active }: { href: '/' | '/categories'; label: string; active: boolean }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.navLink, active && styles.navLinkActive, pressed && styles.pressed]}>
        <StoreText variant="label" style={[styles.navLabel, active && styles.navLabelActive]}>{label}</StoreText>
      </Pressable>
    </Link>
  );
}

function SearchField({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
    <View style={styles.searchBox}>
      <StoreIcon name="search" size={19} color={StoreColors.textMuted} />
      <TextInput
        accessibilityLabel="ค้นหาของเล่น"
        value={search}
        onChangeText={onSearchChange}
        placeholder="ค้นหาของเล่น ชื่อ หรือ SKU..."
        placeholderTextColor={StoreColors.textMuted}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {!!search && (
        <Pressable accessibilityRole="button" accessibilityLabel="ล้างคำค้นหา" hitSlop={8} onPress={() => onSearchChange('')}>
          <StoreIcon name="close-circle" size={19} color={StoreColors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: 'rgba(255,255,255,0.97)', borderBottomWidth: 1, borderBottomColor: '#DCE9E1', boxShadow: StoreShadows.card },
  inner: { width: '100%', maxWidth: 1280, minHeight: 70, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.lg, paddingHorizontal: StoreSpacing.md },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm },
  logoMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderRadius: StoreRadii.small, transform: [{ rotate: '-5deg' }] },
  brand: { color: StoreColors.primary, fontSize: 20, lineHeight: 25, letterSpacing: -0.5 },
  brandCaption: { fontSize: 10, lineHeight: 13, letterSpacing: 0.4 },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs },
  navLink: { minHeight: 40, justifyContent: 'center', paddingHorizontal: StoreSpacing.sm, borderRadius: StoreRadii.pill },
  navLinkActive: { backgroundColor: StoreColors.primarySoft },
  navLabel: { color: StoreColors.textMuted },
  navLabelActive: { color: StoreColors.primary },
  actions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#DCE9E1', borderRadius: StoreRadii.pill },
  iconButtonActive: { backgroundColor: StoreColors.primarySoft, borderColor: StoreColors.primary },
  cartBadge: { position: 'absolute', top: -4, right: -3, minWidth: 20, height: 20, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.accent, borderRadius: StoreRadii.pill },
  cartBadgeText: { color: StoreColors.white, fontSize: 9, lineHeight: 12, fontFamily: StoreFonts.bold },
  mobileSearch: { paddingHorizontal: StoreSpacing.md, paddingBottom: StoreSpacing.sm },
  searchBox: { flex: 1, maxWidth: 390, minWidth: 200, height: 44, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingHorizontal: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.pill, borderCurve: 'continuous' },
  searchInput: { flex: 1, color: StoreColors.text, fontFamily: StoreFonts.body, fontSize: 14, paddingVertical: 0 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
});
