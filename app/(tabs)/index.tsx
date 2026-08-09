import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { StoreColors, StoreRadii } from '@/constants/store-theme';
import { API_BASE_URL } from '@/constants/api';

const PRODUCTS_URL = `${API_BASE_URL}/api/products`;

type Product = {
  id: string | number;
  product_name: string;
  price: string | number;
  image_url: string;
};

const categories = [
  { name: 'Jungle', icon: 'leaf' as const, color: StoreColors.electric },
  { name: 'Space', icon: 'rocket' as const, color: StoreColors.lavender },
  { name: 'Robot', icon: 'hardware-chip' as const, color: StoreColors.peach },
  { name: 'อื่นๆ', icon: 'star' as const, color: '#FFF3A8' },
];

function formatPrice(price: Product['price']) {
  const value = Number(price);
  return `${Number.isFinite(value) ? value.toLocaleString('th-TH') : price} THB`;
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [isHydrated, setIsHydrated] = useState(false);
  const isDesktop = isHydrated && width >= 900;
  const columns = isHydrated && width >= 1180 ? 4 : isHydrated && width >= 720 ? 3 : 2;
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(PRODUCTS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Product[] = await response.json();
      setProducts(data);
    } catch {
      setError('ยังเชื่อมต่อร้านค้าไม่ได้ กรุณาตรวจสอบ Cloud Server แล้วลองอีกครั้ง');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
    loadProducts();
  }, [loadProducts]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('th');
    if (!query) return products;
    return products.filter((product) =>
      product.product_name.toLocaleLowerCase('th').includes(query),
    );
  }, [products, search]);

  return (
    <View style={styles.page}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadProducts(true)}
            tintColor={StoreColors.jungle}
          />
        }
        contentContainerStyle={styles.scrollContent}>
        <StoreHeader isDesktop={isDesktop} search={search} onSearchChange={setSearch} />

        <View style={[styles.content, isDesktop && styles.desktopContent]}>
          <Hero isDesktop={isDesktop} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>หมวดหมู่</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}>
              {categories.map((category) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`หมวด ${category.name}`}
                  key={category.name}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    { backgroundColor: category.color },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.categoryIcon}>
                    <Ionicons name={category.icon} size={23} color={StoreColors.ink} />
                  </View>
                  <Text style={styles.categoryText}>{category.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionTitle}>สินค้าแนะนำ</Text>
              {!!search && (
                <Text style={styles.resultCount}>{visibleProducts.length} รายการ</Text>
              )}
            </View>

            {isLoading ? (
              <View style={styles.messageBox}>
                <ActivityIndicator size="large" color={StoreColors.jungle} />
                <Text style={styles.messageText}>กำลังเตรียมของเล่น...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Ionicons name="cloud-offline-outline" size={36} color={StoreColors.danger} />
                <Text selectable style={styles.errorText}>{error}</Text>
                <ToyButton label="ลองอีกครั้ง" onPress={() => loadProducts()} compact />
              </View>
            ) : visibleProducts.length === 0 ? (
              <View style={styles.messageBox}>
                <Ionicons name="search-outline" size={38} color={StoreColors.jungle} />
                <Text style={styles.messageText}>ไม่พบของเล่นที่ค้นหา</Text>
              </View>
            ) : (
              <View style={styles.productGrid}>
                {visibleProducts.map((product) => (
                  <ProductCard key={String(product.id)} product={product} columns={columns} />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StoreHeader({
  isDesktop,
  search,
  onSearchChange,
}: {
  isDesktop: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <View style={styles.header}>
      <View style={[styles.headerInner, isDesktop && styles.desktopHeaderInner]}>
        {!isDesktop && <Ionicons name="menu" size={28} color={StoreColors.white} />}
        <Text style={styles.brand}>PAN &amp; TOYS</Text>
        {isDesktop && (
          <View style={styles.desktopNav}>
            <Text style={styles.activeNav}>หน้าหลัก</Text>
            <Text style={styles.navText}>หมวดหมู่</Text>
            <Text style={styles.navText}>สินค้าขายดี</Text>
            <Text style={styles.navText}>สินค้าใหม่</Text>
          </View>
        )}
        {isDesktop && <SearchBox search={search} onSearchChange={onSearchChange} />}
        <View style={styles.headerActions}>
          <Link href={'/admin' as never} asChild>
            <Pressable accessibilityLabel="จัดการสินค้า" style={styles.adminHeaderButton}>
              <Ionicons name="settings-outline" size={22} color={StoreColors.white} />
              {isDesktop && <Text style={styles.adminHeaderText}>จัดการสินค้า</Text>}
            </Pressable>
          </Link>
          <Ionicons name="cart-outline" size={27} color={StoreColors.white} />
          <Ionicons name="person-circle-outline" size={28} color={StoreColors.white} />
        </View>
      </View>
      {!isDesktop && (
        <View style={styles.mobileSearchWrap}>
          <SearchBox search={search} onSearchChange={onSearchChange} />
        </View>
      )}
    </View>
  );
}

function SearchBox({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search" size={21} color={StoreColors.ink} />
      <TextInput
        accessibilityLabel="ค้นหาของเล่น"
        value={search}
        onChangeText={onSearchChange}
        placeholder="ค้นหาของเล่น..."
        placeholderTextColor="#697871"
        style={styles.searchInput}
        returnKeyType="search"
      />
      {!!search && (
        <Pressable accessibilityLabel="ล้างคำค้นหา" onPress={() => onSearchChange('')}>
          <Ionicons name="close-circle" size={20} color="#697871" />
        </Pressable>
      )}
    </View>
  );
}

function Hero({ isDesktop }: { isDesktop: boolean }) {
  return (
    <View style={[styles.hero, isDesktop ? styles.desktopHero : styles.mobileHero]}>
      <View style={styles.heroCopy}>
        <Text style={[styles.heroTitle, !isDesktop && styles.mobileHeroTitle]}>Monkey{`\n`}Jungle</Text>
        <Text style={styles.heroDescription}>ผจญภัยในโลกของเล่นกลางป่า</Text>
        <ToyButton label="ดูสินค้าใหม่" onPress={() => {}} compact />
      </View>
      <View style={styles.artPlaceholder}>
        <View style={styles.artCircle}>
          <Ionicons name="pencil" size={isDesktop ? 42 : 28} color="#9CB69D" />
        </View>
        <Ionicons name="leaf-outline" size={isDesktop ? 72 : 42} color="#B9CFBA" style={styles.heroLeaf} />
      </View>
    </View>
  );
}

function ProductCard({ product, columns }: { product: Product; columns: number }) {
  const width = `${100 / columns}%` as `${number}%`;
  const router = useRouter();
  return (
    <View style={[styles.productSlot, { width }]}>
      <Pressable
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
        style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}>
          <Pressable
            accessibilityLabel={`แก้ไข ${product.product_name}`}
            onPress={(event) => {
              event.stopPropagation();
              router.push({ pathname: '/admin', params: { productId: String(product.id) } } as never);
            }}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Ionicons name="pencil" size={17} color={StoreColors.ink} />
          </Pressable>
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            contentFit="cover"
            transition={180}
          />
          <View style={styles.productMeta}>
            <Text numberOfLines={2} style={styles.productName}>{product.product_name}</Text>
            <Text style={styles.priceTag}>{formatPrice(product.price)}</Text>
          </View>
          <ToyButton label="เพิ่มลงตะกร้า" icon="cart-outline" onPress={() => {}} />
      </Pressable>
    </View>
  );
}

function ToyButton({
  label,
  onPress,
  icon,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.toyButton,
        compact && styles.compactButton,
        pressed && styles.toyButtonPressed,
      ]}>
      {icon && <Ionicons name={icon} size={17} color={StoreColors.ink} />}
      <Text style={styles.toyButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.mint },
  scrollContent: { paddingBottom: 28 },
  content: { width: '100%', padding: 14, gap: 22 },
  desktopContent: { maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 22, gap: 26 },
  header: { backgroundColor: StoreColors.jungleDark, borderBottomWidth: 3, borderBottomColor: StoreColors.ink },
  headerInner: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 18 },
  desktopHeaderInner: { width: '100%', maxWidth: 1240, alignSelf: 'center', minHeight: 82, paddingHorizontal: 28 },
  brand: { color: StoreColors.white, fontSize: 25, fontWeight: '900', letterSpacing: -1 },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: 24, marginLeft: 20 },
  navText: { color: StoreColors.white, fontWeight: '700', fontSize: 15 },
  activeNav: { color: StoreColors.electric, fontWeight: '900', fontSize: 15, borderBottomWidth: 3, borderBottomColor: StoreColors.electric, paddingVertical: 10 },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 15 },
  adminHeaderButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  adminHeaderText: { color: StoreColors.white, fontSize: 13, fontWeight: '800' },
  mobileSearchWrap: { paddingHorizontal: 14, paddingBottom: 12 },
  searchBox: { flex: 1, minWidth: 230, height: 46, backgroundColor: StoreColors.white, borderRadius: StoreRadii.medium, borderCurve: 'continuous', borderWidth: 2, borderColor: StoreColors.ink, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, color: StoreColors.ink, fontSize: 15 },
  hero: { backgroundColor: StoreColors.mintSoft, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', overflow: 'hidden', boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  desktopHero: { minHeight: 320, flexDirection: 'row', alignItems: 'stretch' },
  mobileHero: { minHeight: 205, flexDirection: 'row' },
  heroCopy: { flex: 0.9, padding: 24, justifyContent: 'center', alignItems: 'flex-start', gap: 11, zIndex: 2 },
  heroTitle: { color: StoreColors.jungleDark, fontSize: 50, lineHeight: 52, fontWeight: '900', letterSpacing: -2 },
  mobileHeroTitle: { fontSize: 34, lineHeight: 35 },
  heroDescription: { color: StoreColors.ink, fontSize: 16, fontWeight: '600' },
  artPlaceholder: { flex: 1.4, minWidth: 130, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 2, borderLeftColor: '#C2D8C3', borderStyle: 'dashed' },
  artCircle: { width: 112, height: 112, maxWidth: '55%', aspectRatio: 1, borderRadius: StoreRadii.pill, borderWidth: 3, borderColor: '#B9CFBA', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  heroLeaf: { position: 'absolute', right: 14, bottom: 5, transform: [{ rotate: '-22deg' }] },
  section: { gap: 13 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: StoreColors.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
  resultCount: { color: StoreColors.jungle, fontSize: 14, fontWeight: '700' },
  categoryRow: { gap: 14, paddingRight: 14, paddingBottom: 6 },
  categoryCard: { width: 205, height: 78, borderWidth: 2.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: `4px 4px 0 ${StoreColors.ink}`, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: { width: 43, height: 43, borderRadius: StoreRadii.pill, borderWidth: 2, borderColor: StoreColors.ink, backgroundColor: StoreColors.white, alignItems: 'center', justifyContent: 'center' },
  categoryText: { color: StoreColors.ink, fontSize: 17, fontWeight: '800' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  productSlot: { padding: 7 },
  productCard: { flex: 1, minHeight: 100, backgroundColor: StoreColors.white, borderWidth: 2.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: `4px 4px 0 ${StoreColors.ink}`, padding: 10, gap: 10 },
  editButton: { position: 'absolute', zIndex: 3, top: 16, right: 16, width: 38, height: 38, borderRadius: StoreRadii.pill, borderWidth: 2, borderColor: StoreColors.ink, backgroundColor: StoreColors.yellow, alignItems: 'center', justifyContent: 'center', boxShadow: `2px 2px 0 ${StoreColors.ink}` },
  productImage: { width: '100%', aspectRatio: 1.15, backgroundColor: StoreColors.mintMuted, borderRadius: StoreRadii.small, borderCurve: 'continuous', borderWidth: 1.5, borderColor: StoreColors.ink },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46 },
  productName: { flex: 1, color: StoreColors.ink, fontSize: 16, fontWeight: '800' },
  priceTag: { backgroundColor: StoreColors.orange, color: StoreColors.ink, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  toyButton: { minHeight: 43, backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, borderCurve: 'continuous', boxShadow: `3px 3px 0 ${StoreColors.ink}`, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  compactButton: { alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: 17 },
  toyButtonPressed: { transform: [{ translateX: 3 }, { translateY: 3 }], boxShadow: 'none' },
  toyButtonText: { color: StoreColors.ink, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.88, transform: [{ translateX: 2 }, { translateY: 2 }] },
  messageBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  messageText: { color: StoreColors.jungle, fontSize: 16, fontWeight: '700' },
  errorBox: { minHeight: 220, backgroundColor: '#FFF4F1', borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorText: { color: StoreColors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
