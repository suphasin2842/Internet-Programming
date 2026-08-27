// หน้ารายละเอียดสินค้า: ใช้ ID จาก URL ไปดึงข้อมูลจริง และแนะนำสินค้าในหมวดเดียวกัน
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { ProductCard } from '@/components/product-card';
import { StoreBadge } from '@/components/ui/store-badge';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { API_BASE_URL } from '@/constants/api';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { formatProductPrice, getCategoryMeta, Product } from '@/types/product';

const PRODUCTS_URL = `${API_BASE_URL}/api/products`;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { addItem } = useCart();
  const { role } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wasAdded, setWasAdded] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDesktop = isHydrated && width >= 900;
  const relatedColumns = isHydrated && width >= 1180 ? 4 : isHydrated && width >= 720 ? 3 : 2;

  const loadProduct = useCallback(async () => {
    requestController.current?.abort();
    if (!productId) {
      setError('ไม่พบรหัสสินค้า');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    requestController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 9000);
    setIsLoading(true);
    setError('');

    try {
      const [detailResponse, listResponse] = await Promise.all([
        fetch(`${PRODUCTS_URL}/${encodeURIComponent(productId)}`, { signal: controller.signal }),
        fetch(PRODUCTS_URL, { signal: controller.signal }).catch(() => null),
      ]);
      const detailData = await detailResponse.json().catch(() => ({}));
      if (!detailResponse.ok) throw new Error(detailData.error || 'โหลดข้อมูลสินค้าไม่สำเร็จ');

      const nextProduct = detailData as Product;
      setProduct(nextProduct);
      if (listResponse?.ok) {
        const listData = await listResponse.json().catch(() => []);
        const normalizedCategory = nextProduct.category?.trim().toLocaleLowerCase('en-US');
        setRelatedProducts((Array.isArray(listData) ? listData as Product[] : [])
          .filter((item) => String(item.id) !== String(nextProduct.id)
            && item.category?.trim().toLocaleLowerCase('en-US') === normalizedCategory)
          .slice(0, 4));
      } else {
        setRelatedProducts([]);
      }
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === 'AbortError') {
        setError('Cloud Server ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่อีกครั้ง');
      } else {
        setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลสินค้าไม่สำเร็จ');
      }
      setProduct(null);
      setRelatedProducts([]);
    } finally {
      clearTimeout(timeout);
      if (requestController.current === controller) requestController.current = null;
      setIsLoading(false);
    }
  }, [productId]);

  // โหลดสินค้าหลักกับสินค้าแนะนำแบบขนาน และยกเลิกเมื่อออกจากหน้า
  // โหลดสินค้าหลักกับสินค้าแนะนำแบบขนาน และยกเลิกเมื่อออกจากหน้า
  useEffect(() => {
    setIsHydrated(true);
    void loadProduct();
    return () => {
      requestController.current?.abort();
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    };
  }, [loadProduct]);

  // Guest ดูรายละเอียดได้ แต่ต้อง Login ก่อนเพิ่มสินค้าลงตะกร้า
  const addCurrentProduct = () => {
    if (!product) return;
    if (!role) {
      router.push({ pathname: '/login', params: { mode: 'user', redirect: `/product/${product.id}` } } as never);
      return;
    }
    addItem({ ...product, sku: product.sku ?? undefined });
    setWasAdded(true);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setWasAdded(false), 1400);
  };

  const categoryMeta = getCategoryMeta(product?.category?.trim() || 'ของเล่น');

  return (
    <ScrollView
      style={styles.page}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: product?.product_name || 'รายละเอียดสินค้า', headerBackTitle: 'ร้านค้า' }} />

      {isLoading ? (
        <StateCard icon="cube-outline" title="กำลังหยิบของเล่นจากชั้น" description="รอสักครู่ กำลังโหลดรายละเอียดสินค้า" loading />
      ) : error || !product ? (
        <StateCard icon="cloud-offline-outline" title="ยังเปิดกล่องของเล่นไม่ได้" description={error || 'ไม่พบสินค้า'} danger actionLabel="ลองอีกครั้ง" onAction={loadProduct} />
      ) : (
        <>
          <View style={[styles.productCard, isDesktop && styles.desktopProductCard]}>
            <View style={[styles.imagePanel, isDesktop && styles.desktopImagePanel]}>
              <View style={[styles.categoryGlow, { backgroundColor: categoryMeta.color }]} />
              <Image
                accessibilityLabel={`รูปสินค้า ${product.product_name}`}
                source={{ uri: product.image_url }}
                style={styles.productImage}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={220}
              />
            </View>

            <View style={styles.detailsPanel}>
              <View style={styles.badgeRow}>
                <StoreBadge label={product.category?.trim() || 'ของเล่น'} tone="accent" />
                {!!product.sku && <StoreBadge label={`SKU ${product.sku}`} />}
              </View>
              <StoreText selectable variant="display" style={[styles.productName, !isDesktop && styles.mobileProductName]}>{product.product_name}</StoreText>
              <StoreText selectable variant="title" style={styles.price}>{formatProductPrice(product.price)}</StoreText>

              <View style={styles.descriptionSection}>
                <StoreText variant="heading">รายละเอียดสินค้า</StoreText>
                <StoreText selectable style={styles.description}>{product.description?.trim() || 'สินค้านี้ยังไม่มีรายละเอียดเพิ่มเติม'}</StoreText>
              </View>

              <View style={styles.purchaseNote}>
                <StoreIcon name="car-outline" size={21} color={StoreColors.primary} />
                <View style={styles.noteCopy}>
                  <StoreText variant="label">ค่าจัดส่งคำนวณภายหลัง</StoreText>
                  <StoreText variant="caption">ระบบจะบันทึกคำสั่งซื้อก่อน โดยยังไม่รวมค่าจัดส่ง</StoreText>
                </View>
              </View>

              <StoreButton
                title={wasAdded ? 'เพิ่มลงตะกร้าแล้ว' : role ? 'เพิ่มลงตะกร้า' : 'เข้าสู่ระบบเพื่อเพิ่มลงตะกร้า'}
                icon={wasAdded ? 'checkmark-circle' : role ? 'cart-outline' : 'lock-closed-outline'}
                size="lg"
                onPress={addCurrentProduct}
                style={styles.cartButton}
              />
            </View>
          </View>

          {relatedProducts.length > 0 && (
            <View style={styles.relatedSection}>
              <View style={styles.sectionHeading}>
                <View>
                  <StoreText variant="title">ของเล่นจากโลกเดียวกัน</StoreText>
                  <StoreText variant="caption">สินค้าอื่นในหมวด {product.category}</StoreText>
                </View>
                <StoreButton title="ดูทั้งหมวด" icon="arrow-forward" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/categories', params: { category: product.category || '' } })} />
              </View>
              <View style={styles.relatedGrid}>
                {relatedProducts.map((item) => (
                  <View key={String(item.id)} style={[styles.relatedCell, { width: `${100 / relatedColumns}%` }]}>
                    <ProductCard product={item} loginRedirect="/categories" />
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function StateCard({ icon, title, description, loading = false, danger = false, actionLabel, onAction }: {
  icon: 'cube-outline' | 'cloud-offline-outline';
  title: string;
  description: string;
  loading?: boolean;
  danger?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIcon, danger && styles.dangerStateIcon]}>
        {loading ? <ActivityIndicator size="large" color={StoreColors.primary} /> : <StoreIcon name={icon} size={36} color={danger ? StoreColors.danger : StoreColors.primary} />}
      </View>
      <StoreText variant="title" style={styles.stateTitle}>{title}</StoreText>
      <StoreText selectable style={styles.stateDescription}>{description}</StoreText>
      {!!actionLabel && <StoreButton title={actionLabel} icon="refresh" onPress={onAction} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.background },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 1280, alignSelf: 'center', padding: StoreSpacing.md, paddingBottom: StoreSpacing.xxl, gap: StoreSpacing.xl },
  stateCard: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.lg, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  stateIcon: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill },
  dangerStateIcon: { backgroundColor: '#FFE8E8' },
  stateTitle: { textAlign: 'center' },
  stateDescription: { maxWidth: 480, color: StoreColors.textMuted, textAlign: 'center' },
  productCard: { overflow: 'hidden', backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  desktopProductCard: { minHeight: 620, flexDirection: 'row', alignItems: 'stretch' },
  imagePanel: { minHeight: 380, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: StoreSpacing.lg, backgroundColor: StoreColors.surfaceAlt },
  desktopImagePanel: { width: '54%', minHeight: 620 },
  categoryGlow: { position: 'absolute', width: '74%', aspectRatio: 1, borderRadius: StoreRadii.pill, opacity: 0.42, transform: [{ rotate: '-8deg' }] },
  productImage: { width: '100%', height: '100%', minHeight: 330, backgroundColor: 'transparent' },
  detailsPanel: { flex: 1, justifyContent: 'center', gap: StoreSpacing.lg, padding: StoreSpacing.xl },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: StoreSpacing.xs },
  productName: { fontSize: 38, lineHeight: 47 },
  mobileProductName: { fontSize: 30, lineHeight: 38 },
  price: { color: StoreColors.primary, fontVariant: ['tabular-nums'] },
  descriptionSection: { gap: StoreSpacing.xs },
  description: { color: StoreColors.textMuted, fontSize: 16, lineHeight: 27 },
  purchaseNote: { flexDirection: 'row', alignItems: 'flex-start', gap: StoreSpacing.sm, padding: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  noteCopy: { flex: 1, gap: 2 },
  cartButton: { width: '100%' },
  relatedSection: { gap: StoreSpacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.md },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -StoreSpacing.xs },
  relatedCell: { minWidth: 0, padding: StoreSpacing.xs },
});
