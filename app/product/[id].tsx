import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { API_BASE_URL } from '@/constants/api';
import { StoreColors, StoreRadii } from '@/constants/store-theme';
import { useCart } from '@/components/cart-provider';
import { useAuth } from '@/components/auth-provider';

type Product = {
  id: number | string;
  product_name: string;
  description: string | null;
  price: number | string;
  image_url: string;
  sku: string;
  category: string;
};

function formatPrice(price: Product['price']) {
  const value = Number(price);
  return `${Number.isFinite(value) ? value.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : price} THB`;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const productId = Array.isArray(id) ? id[0] : id;
  const { width } = useWindowDimensions();
  const [isHydrated, setIsHydrated] = useState(false);
  const isDesktop = isHydrated && width >= 820;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [wasAdded, setWasAdded] = useState(false);
  const { addItem } = useCart();
  const { role } = useAuth();

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setError('ไม่พบรหัสสินค้า');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}`, {
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลสินค้าไม่สำเร็จ');
      setProduct(data as Product);
    } catch (loadError) {
      const message = loadError instanceof Error && loadError.name === 'AbortError'
        ? 'Cloud Server ใช้เวลาตอบกลับนานเกินไป'
        : loadError instanceof Error
          ? loadError.message
          : 'โหลดข้อมูลสินค้าไม่สำเร็จ';
      setError(message);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setIsHydrated(true);
    loadProduct();
  }, [loadProduct]);

  return (
    <ScrollView
      style={styles.page}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: product?.product_name || 'รายละเอียดสินค้า' }} />

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={StoreColors.jungle} />
          <Text style={styles.stateText}>กำลังโหลดข้อมูลสินค้า...</Text>
        </View>
      ) : error || !product ? (
        <View style={styles.stateCard}>
          <Ionicons name="cloud-offline-outline" size={44} color={StoreColors.danger} />
          <Text selectable style={styles.errorText}>{error || 'ไม่พบสินค้า'}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadProduct}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={19} color={StoreColors.ink} />
            <Text style={styles.retryText}>ลองอีกครั้ง</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.productCard, isDesktop && styles.desktopCard]}>
          <View style={[styles.imagePanel, isDesktop && styles.desktopImagePanel]}>
            <Image
              accessibilityLabel={`รูปสินค้า ${product.product_name}`}
              source={{ uri: product.image_url }}
              style={styles.productImage}
              contentFit="contain"
              transition={220}
            />
          </View>

          <View style={styles.detailsPanel}>
            <View style={styles.headingBlock}>
              <Text selectable style={styles.productName}>{product.product_name}</Text>
              <Text selectable style={styles.price}>{formatPrice(product.price)}</Text>
            </View>

            <View style={styles.badgeRow}>
              {!!product.category && (
                <View style={[styles.badge, styles.categoryBadge]}>
                  <Ionicons name="pricetag-outline" size={15} color={StoreColors.ink} />
                  <Text selectable style={styles.badgeText}>{product.category}</Text>
                </View>
              )}
              {!!product.sku && (
                <View style={[styles.badge, styles.skuBadge]}>
                  <Text selectable style={styles.badgeText}>SKU: {product.sku}</Text>
                </View>
              )}
            </View>

            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>รายละเอียดสินค้า</Text>
              <Text selectable style={styles.description}>
                {product.description?.trim() || 'สินค้านี้ยังไม่มีรายละเอียดเพิ่มเติม'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`เพิ่ม ${product.product_name} ลงตะกร้า`}
              onPress={() => {
                if (!role) {
                  router.push({ pathname: '/login', params: { mode: 'user', redirect: `/product/${product.id}` } } as never);
                  return;
                }
                addItem(product);
                setWasAdded(true);
                setTimeout(() => setWasAdded(false), 1200);
              }}
              style={({ pressed }) => [styles.cartButton, pressed && styles.cartButtonPressed]}>
              <Ionicons name={wasAdded ? 'checkmark' : 'cart-outline'} size={21} color={StoreColors.ink} />
              <Text style={styles.cartButtonText}>{wasAdded ? 'เพิ่มลงตะกร้าแล้ว' : 'เพิ่มลงตะกร้า'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.mint },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 18, justifyContent: 'center' },
  stateCard: { minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', padding: 24, boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  stateText: { color: StoreColors.jungle, fontSize: 16, fontWeight: '800' },
  errorText: { color: StoreColors.danger, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  retryButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, borderCurve: 'continuous', paddingHorizontal: 18, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  retryText: { color: StoreColors.ink, fontSize: 15, fontWeight: '900' },
  productCard: { width: '100%', overflow: 'hidden', backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `6px 6px 0 ${StoreColors.ink}` },
  desktopCard: { flexDirection: 'row', alignItems: 'stretch' },
  imagePanel: { width: '100%', aspectRatio: 1.12, backgroundColor: StoreColors.mintSoft, padding: 18, borderBottomWidth: 2, borderBottomColor: StoreColors.ink },
  desktopImagePanel: { width: '52%', aspectRatio: 1, borderBottomWidth: 0, borderRightWidth: 2, borderRightColor: StoreColors.ink },
  productImage: { width: '100%', height: '100%', backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  detailsPanel: { flex: 1, justifyContent: 'center', padding: 24, gap: 22 },
  headingBlock: { gap: 10 },
  productName: { color: StoreColors.ink, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  price: { alignSelf: 'flex-start', overflow: 'hidden', color: StoreColors.ink, backgroundColor: StoreColors.orange, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill, paddingHorizontal: 14, paddingVertical: 8, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill, paddingHorizontal: 12 },
  categoryBadge: { backgroundColor: StoreColors.electric },
  skuBadge: { backgroundColor: '#FFF3A8' },
  badgeText: { color: StoreColors.ink, fontSize: 13, fontWeight: '800' },
  descriptionSection: { gap: 9 },
  sectionTitle: { color: StoreColors.jungleDark, fontSize: 20, fontWeight: '900' },
  description: { color: '#3C4B35', fontSize: 16, lineHeight: 26 },
  cartButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, borderCurve: 'continuous', boxShadow: `4px 4px 0 ${StoreColors.ink}` },
  cartButtonPressed: { transform: [{ translateX: 4 }, { translateY: 4 }], boxShadow: 'none' },
  cartButtonText: { color: StoreColors.ink, fontSize: 17, fontWeight: '900' },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], opacity: 0.9 },
});
