// ProductCard คือการ์ดสินค้าที่ใช้ซ้ำในหน้าหลัก, หมวดหมู่ และสินค้าแนะนำ
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreBadge } from '@/components/ui/store-badge';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { formatProductPrice, Product } from '@/types/product';

export function ProductCard({ product, onAdded, loginRedirect = '/', style }: {
  product: Product;
  onAdded?: (product: Product) => void;
  loginRedirect?: '/' | '/categories';
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { role } = useAuth();
  const [wasAdded, setWasAdded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
  }, []);

  // Guest ไป Login; User/Admin เพิ่มเข้าตะกร้าของ Scope ตัวเอง
  const addToCart = () => {
    if (!role) {
      router.push({ pathname: '/login', params: { mode: 'user', redirect: loginRedirect } } as never);
      return;
    }
    addItem({ ...product, sku: product.sku ?? undefined });
    onAdded?.(product);
    setWasAdded(true);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setWasAdded(false), 1200);
  };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`ดูรายละเอียด ${product.product_name}`}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
      <View style={styles.imageFrame}>
        {imageFailed ? (
          <View style={styles.imageFallback}>
            <StoreIcon name="image-outline" size={34} color={StoreColors.textMuted} />
            <StoreText variant="caption">ไม่มีรูปสินค้า</StoreText>
          </View>
        ) : (
          <Image
            source={{ uri: product.image_url }}
            accessibilityLabel={`รูปสินค้า ${product.product_name}`}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={220}
            onError={() => setImageFailed(true)}
          />
        )}
        {/* ปุ่มดินสอแสดงเฉพาะ Admin และเปิดฟอร์มแก้ไขสินค้า */}
        {role === 'admin' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`แก้ไข ${product.product_name}`}
            hitSlop={6}
            onPress={(event) => {
              event.stopPropagation();
              router.push({ pathname: '/admin', params: { productId: String(product.id) } } as never);
            }}
            style={({ pressed }) => [styles.editButton, pressed && styles.iconPressed]}>
            <StoreIcon name="pencil" size={16} color={StoreColors.text} />
          </Pressable>
        )}
      </View>

      <View style={styles.metaRow}>
        <StoreBadge label={product.category?.trim() || 'ของเล่น'} tone="primary" />
        {!!product.sku && <StoreText selectable variant="caption" numberOfLines={1}>SKU {product.sku}</StoreText>}
      </View>
      <StoreText variant="heading" numberOfLines={2} style={styles.name}>{product.product_name}</StoreText>
      <StoreText selectable variant="heading" style={styles.price}>{formatProductPrice(product.price)}</StoreText>
      <StoreButton
        title={wasAdded ? 'เพิ่มแล้ว' : 'เพิ่มลงตะกร้า'}
        icon={wasAdded ? 'checkmark' : 'cart-outline'}
        onPress={addToCart}
        stopPropagation
        style={styles.addButton}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: StoreSpacing.sm,
    gap: StoreSpacing.xs,
    backgroundColor: StoreColors.surface,
    borderWidth: 1,
    borderColor: '#D5E5DB',
    borderRadius: StoreRadii.medium,
    borderCurve: 'continuous',
    boxShadow: StoreShadows.card,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  imageFrame: { width: '100%', aspectRatio: 1.12, overflow: 'hidden', backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.small, borderCurve: 'continuous' },
  image: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.xs },
  editButton: { position: 'absolute', top: StoreSpacing.xs, right: StoreSpacing.xs, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.yellow, borderRadius: StoreRadii.pill, boxShadow: StoreShadows.card },
  iconPressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
  metaRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.xs },
  name: { minHeight: 55, fontSize: 18, lineHeight: 26 },
  price: { color: StoreColors.primary, fontSize: 18, fontVariant: ['tabular-nums'] },
  addButton: { width: '100%', boxShadow: 'none' },
});
