// หน้าหลักร้าน: โหลดสินค้า, แสดง Hero, หมวดหมู่ และสินค้ายอดนิยม
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { HeroProductShowcase } from '@/components/hero-product-showcase';
import { ProductCard } from '@/components/product-card';
import { StoreHeader } from '@/components/store-header';
import { FeedbackToast } from '@/components/ui/feedback-toast';
import { ProductSkeleton } from '@/components/ui/product-skeleton';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon, StoreIconName } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { API_BASE_URL } from '@/constants/api';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { CATEGORY_META, getCategoryMeta, Product } from '@/types/product';
import { matchesProductSearch } from '@/utils/product-search';

const PRODUCTS_URL = `${API_BASE_URL}/api/products`;
const FEATURED_LIMIT = 8;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isHydrated, setIsHydrated] = useState(false);
  const isDesktop = isHydrated && width >= 900;
  const columns = isHydrated && width >= 1180 ? 4 : isHydrated && width >= 720 ? 3 : 2;
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async (refresh = false) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(PRODUCTS_URL, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as Product[];
      setProducts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error && loadError.name === 'AbortError'
        ? 'Cloud Server ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่อีกครั้ง'
        : 'ยังเชื่อมต่อร้านค้าไม่ได้ กรุณาตรวจสอบ Cloud Server แล้วลองอีกครั้ง');
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ดึงข้อมูลสินค้าเมื่อเปิดหน้า และยกเลิก Request ถ้าออกจากหน้าเร็วเกินไป
  useEffect(() => {
    setIsHydrated(true);
    void loadProducts();
  }, [loadProducts]);

  // useMemo ลดการกรองซ้ำทุก Render โดยใช้คำค้นล่าสุดเท่านั้น
  const searchedProducts = useMemo(
    () => products.filter((product) => matchesProductSearch(product, search)),
    [products, search],
  );
  const visibleProducts = search ? searchedProducts : searchedProducts.slice(0, FEATURED_LIMIT);

  const categories = useMemo(() => {
    const baseCategories = Object.keys(CATEGORY_META);
    const extraCategories = products
      .map((product) => product.category?.trim())
      .filter((category): category is string => Boolean(category) && !baseCategories.includes(String(category)));
    return Array.from(new Set([...baseCategories, ...extraCategories])).map((value) => ({
      value,
      count: products.filter((product) => product.category?.trim() === value).length,
      ...getCategoryMeta(value),
    }));
  }, [products]);

  return (
    <View style={styles.page}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      <ScrollView
        stickyHeaderIndices={[0]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadProducts(true)} tintColor={StoreColors.primary} />}
        contentContainerStyle={styles.scrollContent}>
        <StoreHeader activeRoute="home" isDesktop={isDesktop} search={search} onSearchChange={setSearch} />

        <View style={[styles.content, isDesktop && styles.desktopContent]}>
          <Hero products={products} isDesktop={isDesktop} />

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <StoreText variant="title">เลือกโลกที่อยากเล่น</StoreText>
                <StoreText variant="body" style={styles.sectionDescription}>ทุกหมวดมีบรรยากาศของตัวเอง เลือกแล้วออกเดินทางได้เลย</StoreText>
              </View>
            </View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categories.map((category) => <CategoryCard key={category.value} category={category} />)}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionCopy}>
                <StoreText variant="title">{search ? 'ผลการค้นหา' : 'ของเล่นที่น่าหยิบกลับบ้าน'}</StoreText>
                <StoreText accessibilityLiveRegion="polite" variant="body" style={styles.sectionDescription}>
                  {search ? `พบ ${searchedProducts.length} รายการจากคำค้นหา` : 'คัดของเล่นจากร้านมาให้เริ่มเลือกได้ง่ายขึ้น'}
                </StoreText>
              </View>
              {!search && products.length > FEATURED_LIMIT && <StoreButton title="ดูทั้งหมด" variant="ghost" icon="arrow-forward" onPress={() => router.push('/categories')} />}
            </View>

            {isLoading ? (
              <ProductSkeletonGrid columns={columns} />
            ) : error ? (
              <StateCard icon="cloud-offline-outline" title="ร้านค้ายังติดต่อไม่ได้" description={error} actionLabel="ลองอีกครั้ง" onAction={() => loadProducts()} danger />
            ) : visibleProducts.length === 0 ? (
              <StateCard icon="search-outline" title="ยังไม่พบของเล่นที่ค้นหา" description="ลองใช้ชื่อสินค้า หมวดหมู่ หรือ SKU ที่สั้นลง" />
            ) : (
              <View style={styles.productGrid}>
                {visibleProducts.map((product) => (
                  <View key={String(product.id)} style={[styles.productSlot, { width: `${100 / columns}%` }]}>
                    <ProductCard product={product} onAdded={(addedProduct) => setToastMessage(`เพิ่ม ${addedProduct.product_name} ลงตะกร้าแล้ว`)} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Hero({ products, isDesktop }: { products: Product[]; isDesktop: boolean }) {
  const router = useRouter();
  return (
    <View style={[styles.hero, isDesktop && styles.desktopHero]}>
      <View style={styles.heroCopy}>
        <View style={styles.eyebrow}>
          <StoreIcon name="happy-outline" size={17} color={StoreColors.primary} />
          <StoreText variant="label" style={styles.eyebrowText}>TOYS WITH BIG PERSONALITY</StoreText>
        </View>
        <StoreText variant="display" style={[styles.heroTitle, !isDesktop && styles.mobileHeroTitle]}>โลกของเล่นที่{`\n`}ไม่เหมือนใคร</StoreText>
        <StoreText variant="body" style={styles.heroDescription}>สีสด เรื่องราวแปลกใหม่ และเพื่อนตัวโปรดกำลังรออยู่ใน Pan &amp; Toys</StoreText>
        <View style={styles.heroActions}>
          <StoreButton title="เริ่มเลือกของเล่น" icon="sparkles" size="lg" onPress={() => router.push('/categories')} />
          <StoreButton title="เข้าป่า Jungle" variant="outline" size="lg" icon="leaf-outline" onPress={() => router.push({ pathname: '/categories', params: { category: 'Jungle' } })} />
        </View>
      </View>
      <View style={styles.heroShowcase}><HeroProductShowcase products={products} /></View>
      <View pointerEvents="none" style={styles.heroStar}><StoreIcon name="star" size={24} color={StoreColors.yellow} /></View>
    </View>
  );
}

function CategoryCard({ category }: { category: { value: string; count: number; label: string; icon: StoreIconName; color: string } }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`เปิดหมวด ${category.label}`}
      onPress={() => router.push({ pathname: '/categories', params: { category: category.value } })}
      style={({ pressed }) => [styles.categoryCard, { backgroundColor: category.color }, pressed && styles.cardPressed]}>
      <View style={styles.categoryIcon}><StoreIcon name={category.icon} size={23} color={StoreColors.text} /></View>
      <View style={styles.categoryCopy}>
        <StoreText variant="heading" numberOfLines={1}>{category.label}</StoreText>
        <StoreText variant="caption">{category.count > 0 ? `${category.count} รายการ` : 'รอสินค้าใหม่'}</StoreText>
      </View>
      <StoreIcon name="arrow-forward" size={18} color={StoreColors.text} />
    </Pressable>
  );
}

function ProductSkeletonGrid({ columns }: { columns: number }) {
  return (
    <View style={styles.productGrid}>
      {Array.from({ length: columns * 2 }, (_, index) => (
        <View key={index} style={[styles.productSlot, { width: `${100 / columns}%` }]}><ProductSkeleton /></View>
      ))}
    </View>
  );
}

function StateCard({ icon, title, description, actionLabel, onAction, danger = false }: {
  icon: StoreIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  danger?: boolean;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIcon, danger && styles.stateIconDanger]}><StoreIcon name={icon} size={34} color={danger ? StoreColors.danger : StoreColors.primary} /></View>
      <StoreText variant="heading" style={styles.stateTitle}>{title}</StoreText>
      <StoreText selectable variant="body" style={styles.stateDescription}>{description}</StoreText>
      {actionLabel && onAction && <StoreButton title={actionLabel} onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.background },
  scrollContent: { paddingBottom: StoreSpacing.xl },
  content: { width: '100%', padding: StoreSpacing.md, gap: StoreSpacing.xl },
  desktopContent: { maxWidth: 1280, alignSelf: 'center', paddingHorizontal: StoreSpacing.xl, paddingVertical: StoreSpacing.lg, gap: StoreSpacing.xxl },
  hero: { position: 'relative', overflow: 'hidden', padding: StoreSpacing.lg, gap: StoreSpacing.lg, backgroundColor: StoreColors.lavender, borderWidth: 1, borderColor: '#D9CFEE', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  desktopHero: { minHeight: 410, flexDirection: 'row', alignItems: 'center', padding: StoreSpacing.xl },
  heroCopy: { flex: 1, alignItems: 'flex-start', gap: StoreSpacing.md, zIndex: 2 },
  heroShowcase: { flex: 1, minWidth: 0 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingHorizontal: StoreSpacing.sm, paddingVertical: StoreSpacing.xs, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: StoreRadii.pill },
  eyebrowText: { color: StoreColors.primary, fontSize: 11, letterSpacing: 0.6 },
  heroTitle: { color: StoreColors.primary, fontSize: 48, lineHeight: 58, letterSpacing: -1.2 },
  mobileHeroTitle: { fontSize: 36, lineHeight: 45 },
  heroDescription: { maxWidth: 520, color: StoreColors.textMuted, fontSize: 16, lineHeight: 26 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: StoreSpacing.sm },
  heroStar: { position: 'absolute', top: StoreSpacing.md, right: StoreSpacing.md, transform: [{ rotate: '14deg' }] },
  section: { gap: StoreSpacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.md },
  sectionCopy: { flex: 1, gap: StoreSpacing.xxs },
  sectionDescription: { color: StoreColors.textMuted },
  categoryRow: { gap: StoreSpacing.sm, paddingHorizontal: 2, paddingVertical: StoreSpacing.xxs, paddingBottom: StoreSpacing.md },
  categoryCard: { width: 220, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.sm, borderWidth: 1, borderColor: 'rgba(23,56,45,0.16)', borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: StoreShadows.card },
  categoryIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.74)', borderRadius: StoreRadii.pill },
  categoryCopy: { flex: 1 },
  cardPressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  productSlot: { padding: 6 },
  stateCard: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.lg, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#DCE9E1', borderRadius: StoreRadii.large, borderCurve: 'continuous' },
  stateIcon: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill },
  stateIconDanger: { backgroundColor: '#FFE8E8' },
  stateTitle: { textAlign: 'center' },
  stateDescription: { maxWidth: 520, color: StoreColors.textMuted, textAlign: 'center' },
});
