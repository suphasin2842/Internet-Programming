import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { useCart } from '@/components/cart-provider';
import { useAuth } from '@/components/auth-provider';
import { API_BASE_URL } from '@/constants/api';
import { StoreColors, StoreRadii } from '@/constants/store-theme';
import { matchesProductSearch } from '@/utils/product-search';

type Product = {
  id: string | number;
  product_name: string;
  description?: string | null;
  price: string | number;
  image_url: string;
  category: string | null;
  sku?: string;
};

const ALL_CATEGORIES = 'ทั้งหมด';

function formatPrice(price: Product['price']) {
  const value = Number(price);
  return `${Number.isFinite(value) ? value.toLocaleString('th-TH') : price} THB`;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const { width } = useWindowDimensions();
  const { addItem } = useCart();
  const { role } = useAuth();
  const columns = width >= 1120 ? 4 : width >= 720 ? 3 : 2;
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(requestedCategory || ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);

  const loadProducts = useCallback(async (refresh = false) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setProducts(await response.json() as Product[]);
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

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    if (requestedCategory) setSelectedCategory(requestedCategory);
  }, [requestedCategory]);

  const categories = useMemo(() => [
    ALL_CATEGORIES,
    ...Array.from(new Set(products.map((product) => product.category?.trim()).filter(Boolean) as string[])),
  ], [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === ALL_CATEGORIES || product.category?.trim() === selectedCategory;
      return matchesCategory && matchesProductSearch(product, search);
    });
  }, [products, search, selectedCategory]);

  const handleAdd = (product: Product) => {
    if (!role) {
      router.push({ pathname: '/login', params: { mode: 'user', redirect: '/categories' } } as never);
      return;
    }
    addItem(product);
    setAddedId(String(product.id));
    setTimeout(() => setAddedId(null), 1200);
  };

  return (
    <ScrollView
      style={styles.page}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadProducts(true)} />}
      contentContainerStyle={[styles.content, styles.contentWithSidebar]}>
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}><Ionicons name="grid" size={24} color={StoreColors.ink} /></View>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>เลือกหมวดหมู่</Text>
            <Text style={styles.subtitle}>หมวดหมู่ด้านล่างสร้างจากข้อมูลจริงในฐานข้อมูล</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={StoreColors.ink} />
          <TextInput
            accessibilityLabel="ค้นหาสินค้าในหมวดหมู่"
            value={search}
            onChangeText={setSearch}
            placeholder="ค้นหาชื่อ รายละเอียด SKU หรือหมวดหมู่..."
            placeholderTextColor="#697871"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {!!search && (
            <Pressable accessibilityLabel="ล้างคำค้นหา" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#697871" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`เลือกหมวด ${category}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedCategory(category)}
              style={({ pressed }) => [styles.categoryButton, isSelected && styles.categoryButtonSelected, pressed && styles.pressed]}>
              <Ionicons name={category === ALL_CATEGORIES ? 'apps' : 'pricetag'} size={17} color={StoreColors.ink} />
              <Text style={styles.categoryText}>{category}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!!search && !isLoading && !error && (
        <Text accessibilityLiveRegion="polite" style={styles.resultCount}>
          พบ {visibleProducts.length} รายการ
        </Text>
      )}

      {isLoading ? (
        <View style={styles.stateBox}><ActivityIndicator size="large" color={StoreColors.jungle} /><Text style={styles.stateText}>กำลังโหลดสินค้า...</Text></View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Ionicons name="cloud-offline-outline" size={42} color={StoreColors.danger} />
          <Text selectable style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadProducts()} style={styles.retryButton}><Text style={styles.buttonText}>ลองอีกครั้ง</Text></Pressable>
        </View>
      ) : visibleProducts.length === 0 ? (
        <View style={styles.stateBox}><Ionicons name="search-outline" size={42} color={StoreColors.jungle} /><Text style={styles.stateText}>ไม่พบสินค้าในหมวดนี้</Text></View>
      ) : (
        <View style={styles.productGrid}>
          {visibleProducts.map((product) => (
            <View key={String(product.id)} style={[styles.productSlot, { width: `${100 / columns}%` }]}>
              <Pressable
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } })}
                style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}>
                <Image source={{ uri: product.image_url }} style={styles.productImage} contentFit="cover" transition={180} />
                <Text numberOfLines={2} style={styles.productName}>{product.product_name}</Text>
                <Text style={styles.price}>{formatPrice(product.price)}</Text>
                <Pressable
                  onPress={(event) => { event.stopPropagation(); handleAdd(product); }}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                  <Ionicons name={addedId === String(product.id) ? 'checkmark' : 'cart-outline'} size={18} color={StoreColors.ink} />
                  <Text style={styles.buttonText}>{addedId === String(product.id) ? 'เพิ่มแล้ว' : 'เพิ่มลงตะกร้า'}</Text>
                </Pressable>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.mint },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', padding: 16, paddingBottom: 32, gap: 18 },
  contentWithSidebar: { paddingTop: 72 },
  heading: { backgroundColor: StoreColors.lavender, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', padding: 18, gap: 16, boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleIcon: { width: 50, height: 50, borderRadius: StoreRadii.pill, borderWidth: 2, borderColor: StoreColors.ink, backgroundColor: StoreColors.electric, alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1, gap: 2 },
  title: { color: StoreColors.ink, fontSize: 27, fontWeight: '900' },
  subtitle: { color: '#52615C', fontSize: 13, fontWeight: '600' },
  searchBox: { height: 46, backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 },
  searchInput: { flex: 1, color: StoreColors.ink, fontSize: 15 },
  resultCount: { color: StoreColors.jungleDark, fontSize: 13, fontWeight: '800' },
  categoryRow: { gap: 10, paddingVertical: 4, paddingRight: 6 },
  categoryButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill, backgroundColor: StoreColors.white, boxShadow: `2px 2px 0 ${StoreColors.ink}` },
  categoryButtonSelected: { backgroundColor: StoreColors.electric },
  categoryText: { color: StoreColors.ink, fontSize: 14, fontWeight: '800' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 },
  productSlot: { padding: 7 },
  productCard: { flex: 1, backgroundColor: StoreColors.white, borderWidth: 2.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, borderCurve: 'continuous', padding: 10, gap: 9, boxShadow: `4px 4px 0 ${StoreColors.ink}` },
  productImage: { width: '100%', aspectRatio: 1.1, backgroundColor: StoreColors.mintMuted, borderWidth: 1.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  productName: { minHeight: 40, color: StoreColors.ink, fontSize: 15, fontWeight: '800' },
  price: { color: StoreColors.jungleDark, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  addButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: StoreColors.orange, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  retryButton: { minHeight: 43, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  buttonText: { color: StoreColors.ink, fontSize: 14, fontWeight: '900' },
  stateBox: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 },
  stateText: { color: StoreColors.jungle, fontSize: 16, fontWeight: '800' },
  errorText: { color: StoreColors.danger, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.86, transform: [{ translateX: 2 }, { translateY: 2 }] },
});
