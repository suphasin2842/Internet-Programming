// Hero สลับรูปสินค้าจากข้อมูลจริง เพื่อใช้เป็นภาพนำบนหน้าหลัก
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOut, FadeOutLeft, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { StoreBadge } from '@/components/ui/store-badge';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { formatProductPrice, Product } from '@/types/product';

export function HeroProductShowcase({ products }: { products: Product[] }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const showcaseProducts = useMemo(() => products.filter((product) => product.image_url).slice(0, 5), [products]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [showcaseProducts.length]);

  useEffect(() => {
    if (showcaseProducts.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % showcaseProducts.length);
    }, reduceMotion ? 5200 : 3200);
    return () => clearInterval(interval);
  }, [reduceMotion, showcaseProducts.length]);

  const activeProduct = showcaseProducts[activeIndex];

  if (!activeProduct) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyBubble}><StoreIcon name="gift-outline" size={44} color={StoreColors.primary} /></View>
        <StoreText variant="label">รูปสินค้าจะปรากฏตรงนี้</StoreText>
      </View>
    );
  }

  const entering = reduceMotion
    ? FadeIn.duration(180).reduceMotion(ReduceMotion.System)
    : FadeInRight.duration(360).reduceMotion(ReduceMotion.System);
  const exiting = reduceMotion
    ? FadeOut.duration(150).reduceMotion(ReduceMotion.System)
    : FadeOutLeft.duration(260).reduceMotion(ReduceMotion.System);

  return (
    <View style={styles.showcase}>
      <View style={styles.decorDot} />
      <Animated.View key={String(activeProduct.id)} entering={entering} exiting={exiting} style={styles.activeCard}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`ดูสินค้า ${activeProduct.product_name}`}
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(activeProduct.id) } })}
          style={({ pressed }) => [styles.productPressable, pressed && styles.pressed]}>
          <Image
            source={{ uri: activeProduct.image_url }}
            accessibilityLabel={`รูปสินค้า ${activeProduct.product_name}`}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={220}
          />
          <View style={styles.productInfo}>
            <StoreBadge label={activeProduct.category?.trim() || 'ของเล่น'} tone="accent" />
            <StoreText variant="heading" numberOfLines={1} style={styles.productName}>{activeProduct.product_name}</StoreText>
            <StoreText variant="label" style={styles.price}>{formatProductPrice(activeProduct.price)}</StoreText>
          </View>
        </Pressable>
      </Animated.View>
      <View style={styles.pagination}>
        {showcaseProducts.map((product, index) => (
          <Pressable
            key={String(product.id)}
            accessibilityRole="button"
            accessibilityLabel={`แสดงสินค้า ${product.product_name}`}
            accessibilityState={{ selected: index === activeIndex }}
            hitSlop={6}
            onPress={() => setActiveIndex(index)}
            style={[styles.dot, index === activeIndex && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  showcase: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: StoreSpacing.md },
  activeCard: { width: '100%', maxWidth: 390, zIndex: 2 },
  productPressable: { overflow: 'hidden', backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D7E5DC', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  image: { width: '100%', minHeight: 175, aspectRatio: 1.55, backgroundColor: StoreColors.surfaceAlt },
  productInfo: { gap: 3, padding: StoreSpacing.sm },
  productName: { fontSize: 17, lineHeight: 23 },
  price: { color: StoreColors.primary },
  pagination: { zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: StoreSpacing.sm },
  dot: { width: 8, height: 8, backgroundColor: 'rgba(20,90,53,0.22)', borderRadius: StoreRadii.pill },
  activeDot: { width: 24, backgroundColor: StoreColors.primary },
  decorDot: { position: 'absolute', width: 180, height: 180, right: -30, top: -30, backgroundColor: 'rgba(189,252,77,0.36)', borderRadius: StoreRadii.pill },
  empty: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm },
  emptyBubble: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
