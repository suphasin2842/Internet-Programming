// หน้าหมวดหมู่: เลือกหมวด, โหลดสินค้า และกรองสินค้าตามหมวดที่เลือก
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FeedbackToast } from '@/components/ui/feedback-toast';
import { ProductCard } from '@/components/product-card';
import { ProductSkeleton } from '@/components/ui/product-skeleton';
import { StoreButton } from '@/components/ui/store-button';
import { StoreText } from '@/components/ui/store-text';
import { StoreIcon, StoreIconName } from '@/components/ui/store-icon';
import { StoreHeader } from '@/components/store-header';
import { API_BASE_URL } from '@/constants/api';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { getCategoryMeta, Product } from '@/types/product';
import { matchesProductSearch } from '@/utils/product-search';

const ALL_CATEGORIES = 'ทั้งหมด';

export default function CategoriesScreen() {
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const { width } = useWindowDimensions();
  const [isHydrated, setIsHydrated] = useState(false);
  const isDesktop = isHydrated && width >= 900;
  const columns = isHydrated && width >= 1180 ? 4 : isHydrated && width >= 720 ? 3 : 2;
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(requestedCategory || ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadProducts = useCallback(async (refresh = false) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as Product[];
      setProducts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error && loadError.name === 'AbortError'
        ? 'Cloud Server ตอบกลับช้าเกินไป กรุณาลองอีกครั้ง'
        : 'ยังโหลดหมวดหมู่สินค้าไม่ได้ กรุณาตรวจสอบ Cloud Server');
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // โหลดสินค้าใหม่เมื่อหน้านี้กลับมาแสดงอีกครั้ง
  useEffect(() => {
    setIsHydrated(true);
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (requestedCategory) setSelectedCategory(requestedCategory);
  }, [requestedCategory]);

  const categories = useMemo(() => [
    ALL_CATEGORIES,
    ...Array.from(new Set(products.map((product) => product.category?.trim()).filter((category): category is string => Boolean(category)))),
  ], [products]);

  useEffect(() => {
    if (selectedCategory !== ALL_CATEGORIES && !categories.includes(selectedCategory) && !isLoading) {
      setSelectedCategory(ALL_CATEGORIES);
    }
  }, [categories, isLoading, selectedCategory]);

  // แสดงเฉพาะสินค้าที่ตรงหมวดและคำค้น โดย deferred value ช่วยให้พิมพ์ลื่นขึ้น
  // แสดงเฉพาะสินค้าที่ตรงหมวดและคำค้น โดย deferred value ช่วยให้พิมพ์ลื่นขึ้น
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = selectedCategory === ALL_CATEGORIES || product.category?.trim() === selectedCategory;
    return matchesCategory && matchesProductSearch(product, deferredSearch);
  }), [deferredSearch, products, selectedCategory]);

  return (
    <View style={styles.page}>
      <FeedbackToast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      <ScrollView
        stickyHeaderIndices={[0]}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadProducts(true)} tintColor={StoreColors.primary} />}
        contentContainerStyle={styles.scrollContent}>
        <StoreHeader activeRoute="categories" isDesktop={isDesktop} search={search} onSearchChange={setSearch} />

        <View style={[styles.content, isDesktop && styles.desktopContent]}>
          <View style={[styles.headingCard, isDesktop && styles.desktopHeadingCard]}>
            <View style={styles.headingIcon}><StoreIcon name="grid-outline" size={27} color={StoreColors.primary} /></View>
            <View style={styles.headingCopy}>
              <StoreText variant="title">เลือกหมวดหมู่ของเล่น</StoreText>
              <StoreText variant="body" style={styles.subtitle}>หมวดหมู่ทั้งหมดมาจากข้อมูลจริงในร้าน และค้นหาได้จากชื่อ รายละเอียด หรือ SKU</StoreText>
            </View>
            <View style={styles.countBubble}>
              <StoreText variant="heading" style={styles.countValue}>{visibleProducts.length}</StoreText>
              <StoreText variant="caption">รายการ</StoreText>
            </View>
          </View>

          <View style={styles.filterSection}>
            <View style={styles.filterHeading}>
              <StoreText variant="heading">กรองตามหมวด</StoreText>
              {selectedCategory !== ALL_CATEGORIES && (
                <StoreButton title="ล้างตัวกรอง" variant="ghost" size="sm" icon="close" onPress={() => setSelectedCategory(ALL_CATEGORIES)} />
              )}
            </View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categories.map((category) => {
                const selected = selectedCategory === category;
                const meta = category === ALL_CATEGORIES
                  ? { icon: 'apps' as const, color: StoreColors.surfaceAlt, label: ALL_CATEGORIES }
                  : getCategoryMeta(category);
                const count = category === ALL_CATEGORIES ? products.length : products.filter((product) => product.category?.trim() === category).length;
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityLabel={`เลือกหมวด ${meta.label}`}
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedCategory(category)}
                    style={({ pressed }) => [styles.categoryChip, selected && styles.categoryChipSelected, pressed && styles.pressed]}>
                    <View style={[styles.chipIcon, { backgroundColor: selected ? StoreColors.surface : meta.color }]}><StoreIcon name={meta.icon} size={17} color={StoreColors.text} /></View>
                    <StoreText variant="label" style={selected && styles.selectedChipText}>{meta.label}</StoreText>
                    <View style={[styles.chipCount, selected && styles.chipCountSelected]}><StoreText variant="caption" style={selected && styles.selectedChipText}>{count}</StoreText></View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {isLoading ? (
            <ProductSkeletonGrid columns={columns} />
          ) : error ? (
            <StateCard icon="cloud-offline-outline" title="ยังเปิดชั้นวางของเล่นไม่ได้" description={error} actionLabel="ลองอีกครั้ง" onAction={() => loadProducts()} danger />
          ) : visibleProducts.length === 0 ? (
            <StateCard
              icon="search-outline"
              title="ไม่พบสินค้าในหมวดนี้"
              description={search ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองหมวดหมู่' : 'หมวดนี้ยังไม่มีสินค้า ลองเลือกหมวดอื่นก่อนได้เลย'}
              actionLabel="ดูสินค้าทั้งหมด"
              onAction={() => { setSearch(''); setSelectedCategory(ALL_CATEGORIES); }}
            />
          ) : (
            <View style={styles.productGrid}>
              {visibleProducts.map((product) => (
                <View key={String(product.id)} style={[styles.productSlot, { width: `${100 / columns}%` }]}>
                  <ProductCard
                    product={product}
                    loginRedirect="/categories"
                    onAdded={(addedProduct) => setToastMessage(`เพิ่ม ${addedProduct.product_name} ลงตะกร้าแล้ว`)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
  content: { width: '100%', padding: StoreSpacing.md, gap: StoreSpacing.lg },
  desktopContent: { maxWidth: 1280, alignSelf: 'center', paddingHorizontal: StoreSpacing.xl, paddingVertical: StoreSpacing.lg },
  headingCard: { gap: StoreSpacing.sm, padding: StoreSpacing.lg, backgroundColor: StoreColors.peach, borderWidth: 1, borderColor: '#EFD3C2', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.card },
  desktopHeadingCard: { flexDirection: 'row', alignItems: 'center' },
  headingIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surface, borderRadius: StoreRadii.medium },
  headingCopy: { flex: 1, gap: StoreSpacing.xxs },
  subtitle: { color: StoreColors.textMuted },
  countBubble: { minWidth: 86, alignItems: 'center', justifyContent: 'center', padding: StoreSpacing.sm, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: StoreRadii.medium },
  countValue: { color: StoreColors.primary, fontVariant: ['tabular-nums'] },
  filterSection: { gap: StoreSpacing.sm },
  filterHeading: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.sm },
  categoryRow: { gap: StoreSpacing.xs, paddingHorizontal: 2, paddingVertical: StoreSpacing.xxs, paddingBottom: StoreSpacing.sm },
  categoryChip: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingHorizontal: StoreSpacing.xs, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D7E5DC', borderRadius: StoreRadii.pill, borderCurve: 'continuous', boxShadow: StoreShadows.card },
  categoryChipSelected: { backgroundColor: StoreColors.primary, borderColor: StoreColors.primary },
  selectedChipText: { color: StoreColors.white },
  chipIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: StoreRadii.pill },
  chipCount: { minWidth: 25, height: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.pill },
  chipCountSelected: { backgroundColor: 'rgba(255,255,255,0.18)' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  productSlot: { padding: 6 },
  stateCard: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.lg, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#DCE9E1', borderRadius: StoreRadii.large, borderCurve: 'continuous' },
  stateIcon: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill },
  stateIconDanger: { backgroundColor: '#FFE8E8' },
  stateTitle: { textAlign: 'center' },
  stateDescription: { maxWidth: 520, color: StoreColors.textMuted, textAlign: 'center' },
});
