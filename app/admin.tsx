// Admin Dashboard: จัดการ Inventory และ Order โดยทุก Mutation ผ่าน API ที่ requireAdmin
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreBadge } from '@/components/ui/store-badge';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { StoreColors, StoreFonts, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { formatProductPrice, Product } from '@/types/product';

type ProductForm = {
  product_name: string;
  description: string;
  price: string;
  image_url: string;
  sku: string;
  category: string;
};

type AdminOrder = {
  id: string | number;
  status: string;
  buyerRole: 'user' | 'admin' | string;
  totalAmount: string | number;
  createdAt?: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};

const emptyProduct: ProductForm = { product_name: '', description: '', price: '', image_url: '', sku: '', category: '' };
const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

export default function AdminScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { productId: productIdParam } = useLocalSearchParams<{ productId?: string | string[] }>();
  const selectedProductId = Array.isArray(productIdParam) ? productIdParam[0] : productIdParam;
  const { removeItem } = useCart();
  const { authFetch, isLoading: isAuthLoading, logout, role } = useAuth();
  const isAdmin = role === 'admin';
  const isDesktop = width >= 980;

  const [activeSection, setActiveSection] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | number | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // กรองรายการสินค้าฝั่งหน้าจอ เพื่อให้ค้นหาในชื่อ SKU หรือหมวดได้ทันที
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => [product.product_name, product.sku, product.category].some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [productSearch, products]);
  const pendingOrders = orders.filter((order) => order.status === 'pending').length;
  const categoryCount = new Set(products.map((product) => product.category?.trim()).filter(Boolean)).size;
  const imagePreviewUri = selectedImage?.uri || form.image_url.trim();

  // โหลด Inventory สำหรับรายการและตัวเลขสรุปบน Dashboard
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setIsLoadingProducts(true);
    setError('');
    async function loadProducts() {
      try {
        const response = await authFetch('/api/products', { signal: controller.signal });
        const data = await response.json().catch(() => []);
        if (response.status === 401) { await logout(); return; }
        if (!response.ok) throw new Error(data.error || 'โหลดสินค้าไม่สำเร็จ');
        setProducts(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'โหลดสินค้าไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setIsLoadingProducts(false);
      }
    }
    void loadProducts();
    return () => controller.abort();
  }, [authFetch, isAdmin, logout]);

  useEffect(() => {
    if (!isAdmin || !selectedProductId) {
      setForm(emptyProduct);
      setImageFailed(false);
      setSelectedImage(null);
      setShowDeleteConfirmation(false);
      return;
    }
    const controller = new AbortController();
    setIsLoadingProduct(true);
    setError('');
    async function loadProduct() {
      try {
        const response = await authFetch(`/api/products/${encodeURIComponent(String(selectedProductId))}`, { signal: controller.signal });
        const product = await response.json().catch(() => ({}));
        if (response.status === 401) { await logout(); return; }
        if (!response.ok) throw new Error(product.error || 'โหลดข้อมูลสินค้าไม่สำเร็จ');
        setForm(productToForm(product));
        setImageFailed(false);
        setSelectedImage(null);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลสินค้าไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setIsLoadingProduct(false);
      }
    }
    void loadProduct();
    return () => controller.abort();
  }, [authFetch, isAdmin, logout, selectedProductId]);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setOrdersLoading(true);
    setOrdersError('');
    async function loadOrders() {
      try {
        const response = await authFetch('/api/admin/orders', { signal: controller.signal });
        const data = await response.json().catch(() => []);
        if (response.status === 401) { await logout(); return; }
        if (!response.ok) throw new Error(data.error || 'โหลดคำสั่งซื้อไม่สำเร็จ');
        setOrders(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (!controller.signal.aborted) setOrdersError(loadError instanceof Error ? loadError.message : 'โหลดคำสั่งซื้อไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setOrdersLoading(false);
      }
    }
    void loadOrders();
    return () => controller.abort();
  }, [authFetch, isAdmin, logout]);

  function updateForm(key: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
    setError('');
  }

  function startNewProduct() {
    setActiveSection('products');
    setForm(emptyProduct);
    setMessage('');
    setError('');
    setSelectedImage(null);
    setImageFailed(false);
    setShowDeleteConfirmation(false);
    router.replace('/admin');
  }

  function selectProduct(id: string | number) {
    setActiveSection('products');
    setMessage('');
    setError('');
    setSelectedImage(null);
    router.replace({ pathname: '/admin', params: { productId: String(id) } });
  }

  function validateProduct() {
    if (form.product_name.trim().length < 2 || form.product_name.trim().length > 150) return 'ชื่อสินค้าต้องมี 2-150 ตัวอักษร';
    if (form.description.trim().length > 2000) return 'รายละเอียดสินค้ายาวเกิน 2,000 ตัวอักษร';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0 || price > 99999999.99) return 'ราคาสินค้าไม่ถูกต้อง';
    if (!selectedImage && (!/^https?:\/\//i.test(form.image_url.trim()) || form.image_url.trim().length > 2048)) return 'กรุณาเลือกไฟล์รูป หรือใส่ URL ที่ขึ้นต้นด้วย http:// หรือ https://';
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(form.sku.trim())) return 'SKU ใช้ได้เฉพาะ A-Z, 0-9, _ และ -';
    if (form.category.trim().length < 2 || form.category.trim().length > 80) return 'หมวดหมู่ต้องมี 2-80 ตัวอักษร';
    return '';
  }

  // เปิดคลังรูปของเครื่อง แล้วเก็บไฟล์ไว้รออัปโหลดตอนกดบันทึกสินค้า
  async function pickProductImage() {
    setError('');
    setMessage('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('กรุณาอนุญาตให้แอปเข้าถึงรูปภาพก่อน');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.85,
        selectionLimit: 1,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileSize = asset.fileSize ?? asset.file?.size ?? 0;
      if (fileSize > 5 * 1024 * 1024) {
        setError('รูปสินค้าต้องมีขนาดไม่เกิน 5 MB');
        return;
      }
      if (!getImageMimeType(asset)) {
        setError('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP');
        return;
      }

      setSelectedImage(asset);
      setImageFailed(false);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'เปิดคลังรูปภาพไม่สำเร็จ');
    }
  }

  async function uploadProductImage(asset: ImagePicker.ImagePickerAsset) {
    const mimeType = getImageMimeType(asset);
    if (!mimeType) throw new Error('ชนิดไฟล์รูปภาพไม่รองรับ');

    const uploadBody = new FormData();
    if (Platform.OS === 'web' && asset.file) {
      uploadBody.append('image', asset.file, asset.fileName || asset.file.name);
    } else {
      const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      uploadBody.append('image', {
        uri: asset.uri,
        name: asset.fileName || `product-${Date.now()}.${extension}`,
        type: mimeType,
      } as unknown as Blob);
    }

    const response = await authFetch('/api/admin/uploads/product-image', {
      method: 'POST',
      body: uploadBody,
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      await logout();
      throw new Error('Session Admin หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    if (!response.ok) throw new Error(data.error || 'อัปโหลดรูปสินค้าไม่สำเร็จ');
    if (!data.image_url) throw new Error('Server ไม่ได้ส่ง URL รูปภาพกลับมา');
    return String(data.image_url);
  }

  // POST ตอนเพิ่มใหม่, PUT ตอนแก้ไข โดยตรวจข้อมูลซ้ำกับกฎของ Server ก่อน
  async function saveProduct() {
    const validationError = validateProduct();
    if (validationError) { setError(validationError); setMessage(''); return; }
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      const imageUrl = selectedImage ? await uploadProductImage(selectedImage) : form.image_url.trim();
      const body = { ...form, image_url: imageUrl, price: Number(form.price), sku: form.sku.trim().toUpperCase() };
      const response = await authFetch(selectedProductId ? `/api/products/${encodeURIComponent(selectedProductId)}` : '/api/products', {
        method: selectedProductId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { await logout(); return; }
      if (!response.ok) throw new Error(data.error || 'บันทึกสินค้าไม่สำเร็จ');
      const savedProduct = { ...data, price: Number(data.price ?? body.price) } as Product;
      if (selectedProductId) {
        setProducts((current) => current.map((product) => String(product.id) === String(selectedProductId) ? savedProduct : product));
        setForm(productToForm(savedProduct));
        setSelectedImage(null);
        setMessage('บันทึกการแก้ไขสินค้าเรียบร้อยแล้ว');
      } else {
        setProducts((current) => [savedProduct, ...current]);
        setForm(emptyProduct);
        setSelectedImage(null);
        setMessage('เพิ่มสินค้าใหม่ลง Inventory เรียบร้อยแล้ว');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกสินค้าไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  // DELETE จริง ต้องกดยืนยันใน DeleteZone ก่อนถึงจะเรียกฟังก์ชันนี้
  async function deleteProduct() {
    if (!selectedProductId) return;
    setIsDeleting(true);
    setError('');
    setMessage('');
    try {
      const response = await authFetch(`/api/products/${encodeURIComponent(selectedProductId)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { await logout(); return; }
      if (!response.ok) throw new Error(data.error || 'ลบสินค้าไม่สำเร็จ');
      removeItem(selectedProductId);
      setProducts((current) => current.filter((product) => String(product.id) !== String(selectedProductId)));
      setShowDeleteConfirmation(false);
      setMessage('ลบสินค้าออกจาก Inventory จริงเรียบร้อยแล้ว');
      router.replace('/admin');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ลบสินค้าไม่สำเร็จ');
    } finally {
      setIsDeleting(false);
    }
  }

  async function updateOrderStatus(orderId: string | number, status: string) {
    setUpdatingOrderId(orderId);
    setOrdersError('');
    try {
      const response = await authFetch(`/api/admin/orders/${encodeURIComponent(String(orderId))}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { await logout(); return; }
      if (!response.ok) throw new Error(data.error || 'อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ');
      setOrders((current) => current.map((order) => String(order.id) === String(orderId) ? { ...order, status } : order));
    } catch (updateError) {
      setOrdersError(updateError instanceof Error ? updateError.message : 'อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (isAuthLoading) return <View style={styles.loadingPage}><ActivityIndicator size="large" color={StoreColors.primary} /></View>;
  if (!isAdmin) return <Redirect href={{ pathname: '/login', params: { mode: 'admin', redirect: '/admin', productId: selectedProductId } } as never} />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Admin Dashboard', headerBackTitle: 'ร้านค้า' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <View style={styles.content}>
          <View style={styles.topBar}>
            <View style={styles.titleCopy}>
              <View style={styles.eyebrow}><StoreIcon name="shield-checkmark-outline" size={16} color={StoreColors.primary} /><StoreText variant="caption" style={styles.eyebrowText}>PAN &amp; TOYS ADMIN</StoreText></View>
              <StoreText variant="display" style={styles.title}>จัดการร้านค้า</StoreText>
              <StoreText style={styles.subtitle}>ควบคุมสินค้าและคำสั่งซื้อจากพื้นที่เดียว</StoreText>
            </View>
            <View style={styles.topActions}><StoreButton title="กลับหน้าร้าน" icon="storefront-outline" variant="outline" size="sm" onPress={() => router.replace('/')} /><StoreButton title="ออกจากระบบ" icon="log-out-outline" variant="ghost" size="sm" onPress={() => void logout()} /></View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="สินค้าทั้งหมด" value={products.length.toLocaleString('th-TH')} icon="cube-outline" tone="green" />
            <StatCard label="หมวดหมู่" value={categoryCount.toLocaleString('th-TH')} icon="grid-outline" tone="purple" />
            <StatCard label="คำสั่งซื้อ" value={orders.length.toLocaleString('th-TH')} icon="receipt-outline" tone="orange" />
            <StatCard label="รอดำเนินการ" value={pendingOrders.toLocaleString('th-TH')} icon="time-outline" tone="yellow" />
          </View>

          <View style={styles.sectionTabs} accessibilityRole="tablist"><DashboardTab label="สินค้า" count={products.length} icon="cube-outline" active={activeSection === 'products'} onPress={() => setActiveSection('products')} /><DashboardTab label="คำสั่งซื้อ" count={orders.length} icon="receipt-outline" active={activeSection === 'orders'} onPress={() => setActiveSection('orders')} /></View>

          {activeSection === 'products' ? (
            <View style={[styles.workspace, isDesktop && styles.workspaceDesktop]}>
              <View style={[styles.inventoryPanel, isDesktop && styles.inventoryPanelDesktop]}>
                <View style={styles.panelHeading}><View><StoreText variant="heading">Inventory</StoreText><StoreText variant="caption">ค้นหาและเลือกสินค้าที่ต้องการจัดการ</StoreText></View><StoreButton title="เพิ่มสินค้า" icon="add" size="sm" onPress={startNewProduct} /></View>
                <View style={styles.searchShell}><StoreIcon name="search-outline" size={19} color={StoreColors.textMuted} /><TextInput value={productSearch} onChangeText={setProductSearch} placeholder="ค้นหาชื่อสินค้า, SKU หรือหมวดหมู่" placeholderTextColor={StoreColors.textMuted} style={styles.searchInput} accessibilityLabel="ค้นหาสินค้า" />{!!productSearch && <Pressable accessibilityRole="button" accessibilityLabel="ล้างการค้นหาสินค้า" hitSlop={8} onPress={() => setProductSearch('')}><StoreIcon name="close-circle" size={19} color={StoreColors.textMuted} /></Pressable>}</View>
                {isLoadingProducts ? <LoadingState label="กำลังโหลดสินค้า" /> : filteredProducts.length === 0 ? <EmptyState icon="cube-outline" title={productSearch ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้า'} description={productSearch ? 'ลองค้นหาด้วยคำอื่น' : 'กดเพิ่มสินค้าเพื่อเริ่มต้น'} /> : <View style={styles.productList}>{filteredProducts.map((product) => <AdminProductRow key={String(product.id)} product={product} selected={String(selectedProductId) === String(product.id)} onPress={() => selectProduct(product.id)} />)}</View>}
              </View>

              <View style={[styles.editorPanel, isDesktop && styles.editorPanelDesktop]}>
                <View style={styles.panelHeading}><View><StoreText variant="heading">{selectedProductId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</StoreText><StoreText variant="caption">ข้อมูลจะถูกบันทึกลง Inventory จริง</StoreText></View><StoreBadge label={selectedProductId ? 'EDIT MODE' : 'NEW PRODUCT'} tone={selectedProductId ? 'accent' : 'success'} /></View>
                {isLoadingProduct ? <LoadingState label="กำลังโหลดข้อมูลสินค้า" /> : <>
                  <View style={styles.previewRow}><View style={styles.previewImageFrame}>{imagePreviewUri && !imageFailed ? <Image source={{ uri: imagePreviewUri }} style={styles.previewImage} contentFit="cover" cachePolicy="memory-disk" onError={() => setImageFailed(true)} /> : <View style={styles.previewEmpty}><StoreIcon name="image-outline" size={26} color={StoreColors.textMuted} /></View>}</View><View style={styles.previewCopy}><StoreText variant="label">Preview รูปสินค้า</StoreText><StoreText variant="caption">{selectedImage ? `เลือกแล้ว: ${selectedImage.fileName || 'รูปจากเครื่อง'}` : 'ใส่ URL หรือเลือกรูปจากเครื่องได้อย่างใดอย่างหนึ่ง'}</StoreText></View></View>
                  <View style={styles.imageSourceActions}>
                    <StoreButton title={selectedImage ? 'เปลี่ยนรูปจากเครื่อง' : 'เลือกรูปจากเครื่อง'} icon="cloud-upload-outline" variant="outline" size="sm" disabled={isSubmitting} onPress={() => void pickProductImage()} />
                    {selectedImage && <StoreButton title="ยกเลิกไฟล์ที่เลือก" icon="close-circle-outline" variant="ghost" size="sm" disabled={isSubmitting} onPress={() => { setSelectedImage(null); setImageFailed(false); }} />}
                    <StoreText variant="caption" style={styles.imageHint}>รองรับ JPG, PNG และ WebP ขนาดไม่เกิน 5 MB</StoreText>
                  </View>
                  {/* ถ้าเลือกไฟล์จากเครื่อง ไฟล์นั้นจะแทน URL นี้ตอนกดบันทึก */}
                  <AdminInput label="URL รูปภาพ (ไม่ต้องกรอกถ้าเลือกไฟล์)" value={form.image_url} onChangeText={(value) => { setSelectedImage(null); updateForm('image_url', value); setImageFailed(false); }} placeholder="https://example.com/image.jpg" autoCapitalize="none" autoCorrect={false} keyboardType="url" textContentType="URL" />
                  <AdminInput label="ชื่อสินค้า" value={form.product_name} onChangeText={(value) => updateForm('product_name', value)} placeholder="เช่น Robot Explorer" />
                  <AdminInput label="รายละเอียด" value={form.description} onChangeText={(value) => updateForm('description', value)} placeholder="รายละเอียดสินค้า" multiline />
                  <View style={styles.formColumns}><View style={styles.formColumn}><AdminInput label="ราคา (THB)" value={form.price} onChangeText={(value) => updateForm('price', value)} placeholder="0.00" keyboardType="decimal-pad" /></View><View style={styles.formColumn}><AdminInput label="SKU" value={form.sku} onChangeText={(value) => updateForm('sku', value)} placeholder="RO-001" autoCapitalize="characters" /></View></View>
                  <AdminInput label="หมวดหมู่" value={form.category} onChangeText={(value) => updateForm('category', value)} placeholder="Jungle / Space / Robot" />
                  {!!error && <Feedback icon="alert-circle-outline" tone="danger" text={error} />}{!!message && <Feedback icon="checkmark-circle-outline" tone="success" text={message} />}
                  <View style={styles.actionRow}><StoreButton title={selectedProductId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'} icon={selectedProductId ? 'save-outline' : 'add'} size="lg" loading={isSubmitting} onPress={() => void saveProduct()} style={styles.saveButton} />{selectedProductId && <StoreButton title="สร้างสินค้าใหม่" icon="add-circle-outline" variant="outline" size="lg" onPress={startNewProduct} />}</View>
                  {!!selectedProductId && <DeleteZone productName={form.product_name} showConfirmation={showDeleteConfirmation} isDeleting={isDeleting} onShow={() => { setError(''); setShowDeleteConfirmation(true); }} onDelete={() => void deleteProduct()} onCancel={() => setShowDeleteConfirmation(false)} />}
                </>}
              </View>
            </View>
          ) : <OrdersPanel orders={orders} loading={ordersLoading} error={ordersError} updatingOrderId={updatingOrderId} onUpdateStatus={(orderId, status) => void updateOrderStatus(orderId, status)} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: 'cube-outline' | 'grid-outline' | 'receipt-outline' | 'time-outline'; tone: 'green' | 'purple' | 'orange' | 'yellow' }) { return <View style={styles.statCard}><View style={[styles.statIcon, statTone[tone]]}><StoreIcon name={icon} size={21} color={StoreColors.text} /></View><View><StoreText variant="caption">{label}</StoreText><StoreText variant="title" style={styles.statValue}>{value}</StoreText></View></View>; }
function DashboardTab({ label, count, icon, active, onPress }: { label: string; count: number; icon: 'cube-outline' | 'receipt-outline'; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.dashboardTab, active && styles.dashboardTabActive, pressed && styles.pressed]}><StoreIcon name={icon} size={19} color={active ? StoreColors.primary : StoreColors.textMuted} /><StoreText variant="label" style={active && styles.dashboardTabTextActive}>{label}</StoreText><StoreBadge label={String(count)} tone={active ? 'primary' : 'neutral'} /></Pressable>; }
function AdminProductRow({ product, selected, onPress }: { product: Product; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={`แก้ไข ${product.product_name}`} onPress={onPress} style={({ pressed }) => [styles.productRow, selected && styles.productRowSelected, pressed && styles.pressed]}><View style={styles.productThumb}>{product.image_url ? <Image source={{ uri: product.image_url }} style={styles.productThumbImage} contentFit="cover" cachePolicy="memory-disk" /> : <StoreIcon name="image-outline" size={22} color={StoreColors.textMuted} />}</View><View style={styles.productRowCopy}><StoreText variant="label" numberOfLines={1}>{product.product_name}</StoreText><StoreText variant="caption" numberOfLines={1}>{product.sku || 'ไม่มี SKU'} · {product.category || 'ไม่มีหมวดหมู่'}</StoreText><StoreText variant="caption" style={styles.rowPrice}>{formatProductPrice(product.price)}</StoreText></View><View style={[styles.rowEditIcon, selected && styles.rowEditIconSelected]}><StoreIcon name="pencil-outline" size={17} color={selected ? StoreColors.white : StoreColors.primary} /></View></Pressable>; }
function AdminInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><StoreText variant="label">{label}</StoreText><TextInput {...props} placeholderTextColor={StoreColors.textMuted} style={[styles.input, props.multiline && styles.multilineInput]} /></View>; }
function Feedback({ icon, tone, text }: { icon: 'alert-circle-outline' | 'checkmark-circle-outline'; tone: 'danger' | 'success'; text: string }) { return <View style={[styles.feedback, tone === 'danger' ? styles.feedbackDanger : styles.feedbackSuccess]}><StoreIcon name={icon} size={19} color={tone === 'danger' ? StoreColors.danger : StoreColors.success} /><StoreText selectable variant="caption" style={tone === 'danger' ? styles.feedbackDangerText : styles.feedbackSuccessText}>{text}</StoreText></View>; }
function DeleteZone({ productName, showConfirmation, isDeleting, onShow, onDelete, onCancel }: { productName: string; showConfirmation: boolean; isDeleting: boolean; onShow: () => void; onDelete: () => void; onCancel: () => void }) { return <View style={styles.deleteZone}><View style={styles.deleteHeading}><StoreIcon name="warning-outline" size={21} color={StoreColors.danger} /><View style={styles.deleteCopy}><StoreText variant="label" style={styles.deleteTitle}>ลบสินค้าออกจาก Database</StoreText><StoreText variant="caption">การลบถาวรจะนำสินค้าออกจากหน้าร้านและย้อนกลับไม่ได้</StoreText></View></View>{showConfirmation ? <View style={styles.confirmBox}><StoreText selectable variant="label">ยืนยันลบ “{productName || 'สินค้านี้'}” ใช่หรือไม่?</StoreText><View style={styles.actionRow}><StoreButton title="ยืนยัน ลบถาวร" icon="trash-outline" variant="danger" size="sm" loading={isDeleting} onPress={onDelete} /><StoreButton title="ยกเลิก" variant="outline" size="sm" disabled={isDeleting} onPress={onCancel} /></View></View> : <StoreButton title="ลบสินค้านี้" icon="trash-outline" variant="danger" size="sm" onPress={onShow} style={styles.deleteButton} />}</View>; }
function OrdersPanel({ orders, loading, error, updatingOrderId, onUpdateStatus }: { orders: AdminOrder[]; loading: boolean; error: string; updatingOrderId: string | number | null; onUpdateStatus: (orderId: string | number, status: string) => void }) { return <View style={styles.ordersPanel}><View style={styles.panelHeading}><View><StoreText variant="heading">คำสั่งซื้อทั้งหมด</StoreText><StoreText variant="caption">ตรวจสอบคำสั่งซื้อของ User และ Admin แล้วเปลี่ยนสถานะได้ที่นี่</StoreText></View><View style={styles.ordersIcon}><StoreIcon name="receipt-outline" size={23} color={StoreColors.primary} /></View></View>{loading ? <LoadingState label="กำลังโหลดคำสั่งซื้อ" /> : error ? <Feedback icon="alert-circle-outline" tone="danger" text={error} /> : orders.length === 0 ? <EmptyState icon="receipt-outline" title="ยังไม่มีคำสั่งซื้อ" description="เมื่อมีการสั่งซื้อ รายการจะแสดงที่นี่" /> : <View style={styles.ordersList}>{orders.map((order) => <OrderRow key={String(order.id)} order={order} updating={updatingOrderId === order.id || updatingOrderId !== null} onUpdateStatus={onUpdateStatus} />)}</View>}</View>; }
function OrderRow({ order, updating, onUpdateStatus }: { order: AdminOrder; updating: boolean; onUpdateStatus: (orderId: string | number, status: string) => void }) { return <View style={styles.orderRow}><View style={styles.orderTop}><View style={styles.orderIdWrap}><StoreText variant="heading">#{order.id}</StoreText><StoreBadge label={order.buyerRole === 'admin' ? 'ADMIN BUYER' : 'USER BUYER'} tone={order.buyerRole === 'admin' ? 'accent' : 'success'} /></View><StoreBadge label={orderStatusLabel(order.status)} tone={order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'primary'} /></View><StoreText variant="caption">ผู้ซื้อ: {order.username || order.email || 'ไม่ระบุ'}{order.phone ? ` · ${order.phone}` : ''}</StoreText><StoreText variant="caption">ยอดรวม {formatMoney(order.totalAmount)}{order.createdAt ? ` · ${formatDate(order.createdAt)}` : ''}</StoreText><View style={styles.orderActions}>{orderStatuses.map((status) => <Pressable key={status} accessibilityRole="button" accessibilityLabel={`คำสั่งซื้อ ${order.id} ${orderStatusLabel(status)}`} disabled={updating} onPress={() => onUpdateStatus(order.id, status)} style={({ pressed }) => [styles.orderAction, order.status === status && styles.orderActionActive, pressed && styles.pressed, updating && styles.disabled]}>{updating && order.status !== status ? <ActivityIndicator size="small" color={StoreColors.text} /> : <StoreText variant="caption" style={styles.orderActionText}>{orderStatusLabel(status)}</StoreText>}</Pressable>)}</View></View>; }
function LoadingState({ label }: { label: string }) { return <View style={styles.state}><ActivityIndicator color={StoreColors.primary} /><StoreText variant="caption">{label}</StoreText></View>; }
function EmptyState({ icon, title, description }: { icon: 'cube-outline' | 'receipt-outline'; title: string; description: string }) { return <View style={styles.state}><View style={styles.stateIcon}><StoreIcon name={icon} size={26} color={StoreColors.primary} /></View><StoreText variant="label">{title}</StoreText><StoreText variant="caption" style={styles.stateDescription}>{description}</StoreText></View>; }
function productToForm(product: Partial<Product>): ProductForm { return { product_name: String(product.product_name ?? ''), description: String(product.description ?? ''), price: String(product.price ?? ''), image_url: String(product.image_url ?? ''), sku: String(product.sku ?? ''), category: String(product.category ?? '') }; }
function orderStatusLabel(status: string) { return ({ pending: 'รอดำเนินการ', confirmed: 'ยืนยันแล้ว', shipped: 'กำลังจัดส่ง', delivered: 'จัดส่งสำเร็จ', cancelled: 'ยกเลิก' } as Record<string, string>)[status] || status; }
function formatMoney(value: string | number) { const amount = Number(value); return Number.isFinite(amount) ? `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB` : `${value} THB`; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('th-TH'); }
function getImageMimeType(asset: ImagePicker.ImagePickerAsset) {
  const mimeType = String(asset.mimeType || asset.file?.type || '').toLowerCase();
  if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') return mimeType;
  const filename = String(asset.fileName || asset.file?.name || asset.uri).toLowerCase().split('?')[0];
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.webp')) return 'image/webp';
  return '';
}

const statTone = StyleSheet.create({ green: { backgroundColor: StoreColors.primarySoft }, purple: { backgroundColor: StoreColors.lavender }, orange: { backgroundColor: StoreColors.peach }, yellow: { backgroundColor: '#FFF2B8' } });

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: StoreColors.background }, loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.background }, page: { flexGrow: 1, padding: StoreSpacing.md }, content: { width: '100%', maxWidth: 1280, alignSelf: 'center', gap: StoreSpacing.lg, paddingBottom: StoreSpacing.xxl },
  topBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: StoreSpacing.md, paddingVertical: StoreSpacing.sm }, titleCopy: { flex: 1, minWidth: 240, gap: StoreSpacing.xxs }, eyebrow: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs }, eyebrowText: { color: StoreColors.primary, letterSpacing: 1 }, title: { fontSize: 38, lineHeight: 46 }, subtitle: { color: StoreColors.textMuted }, topActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: StoreSpacing.xs },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: StoreSpacing.sm }, statCard: { flex: 1, minWidth: 190, minHeight: 108, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.md, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: StoreShadows.card }, statIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: StoreRadii.pill }, statValue: { fontSize: 25, lineHeight: 32 },
  sectionTabs: { flexDirection: 'row', gap: StoreSpacing.xs, padding: StoreSpacing.xxs, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.pill, alignSelf: 'flex-start' }, dashboardTab: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingHorizontal: StoreSpacing.md, borderRadius: StoreRadii.pill }, dashboardTabActive: { backgroundColor: StoreColors.surface, boxShadow: StoreShadows.card }, dashboardTabTextActive: { color: StoreColors.primary },
  workspace: { gap: StoreSpacing.lg }, workspaceDesktop: { flexDirection: 'row', alignItems: 'flex-start' }, inventoryPanel: { width: '100%', padding: StoreSpacing.md, gap: StoreSpacing.md, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.card }, inventoryPanelDesktop: { flex: 0.9 }, editorPanel: { width: '100%', padding: StoreSpacing.lg, gap: StoreSpacing.md, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.card }, editorPanelDesktop: { flex: 1.1 }, ordersPanel: { padding: StoreSpacing.lg, gap: StoreSpacing.md, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.card }, panelHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: StoreSpacing.md }, searchShell: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingHorizontal: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderWidth: 1, borderColor: '#C9DCD0', borderRadius: StoreRadii.medium, borderCurve: 'continuous' }, searchInput: { flex: 1, minWidth: 0, minHeight: 44, color: StoreColors.text, fontFamily: StoreFonts.body, fontSize: 14 }, productList: { gap: StoreSpacing.xs }, productRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.xs, backgroundColor: StoreColors.surfaceAlt, borderWidth: 1, borderColor: 'transparent', borderRadius: StoreRadii.medium, borderCurve: 'continuous' }, productRowSelected: { backgroundColor: StoreColors.primarySoft, borderColor: StoreColors.primary }, productThumb: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: StoreColors.mintMuted, borderRadius: StoreRadii.small, borderCurve: 'continuous' }, productThumbImage: { width: '100%', height: '100%' }, productRowCopy: { flex: 1, minWidth: 0, gap: 1 }, rowPrice: { color: StoreColors.primary, fontFamily: StoreFonts.semibold }, rowEditIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surface, borderRadius: StoreRadii.pill }, rowEditIconSelected: { backgroundColor: StoreColors.primary },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.medium, borderCurve: 'continuous' }, previewImageFrame: { width: 72, height: 72, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.mintMuted, borderRadius: StoreRadii.small, borderCurve: 'continuous' }, previewImage: { width: '100%', height: '100%' }, previewEmpty: { alignItems: 'center', justifyContent: 'center' }, previewCopy: { flex: 1, gap: StoreSpacing.xxs }, imageSourceActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: StoreSpacing.xs }, imageHint: { flexBasis: '100%', color: StoreColors.textMuted }, formColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: StoreSpacing.sm }, formColumn: { flex: 1, minWidth: 210 }, field: { gap: StoreSpacing.xs }, input: { minHeight: 48, color: StoreColors.text, fontFamily: StoreFonts.body, fontSize: 15, backgroundColor: StoreColors.surfaceAlt, borderWidth: 1, borderColor: '#C9DCD0', borderRadius: StoreRadii.medium, borderCurve: 'continuous', paddingHorizontal: StoreSpacing.sm }, multilineInput: { minHeight: 110, paddingTop: StoreSpacing.sm, textAlignVertical: 'top' }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: StoreSpacing.sm }, saveButton: { flexGrow: 1 }, feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: StoreSpacing.xs, padding: StoreSpacing.sm, borderRadius: StoreRadii.medium, borderCurve: 'continuous' }, feedbackDanger: { backgroundColor: '#FFF0F0' }, feedbackSuccess: { backgroundColor: '#E5F9EC' }, feedbackDangerText: { flex: 1, color: StoreColors.danger }, feedbackSuccessText: { flex: 1, color: StoreColors.success }, deleteZone: { gap: StoreSpacing.sm, padding: StoreSpacing.md, backgroundColor: '#FFF3F0', borderWidth: 1, borderColor: '#F0A39A', borderRadius: StoreRadii.medium, borderCurve: 'continuous' }, deleteHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: StoreSpacing.xs }, deleteCopy: { flex: 1, gap: StoreSpacing.xxs }, deleteTitle: { color: StoreColors.danger }, deleteButton: { alignSelf: 'flex-start' }, confirmBox: { gap: StoreSpacing.sm, padding: StoreSpacing.sm, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: StoreColors.danger, borderRadius: StoreRadii.small, borderCurve: 'continuous' },
  ordersIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill }, ordersList: { gap: StoreSpacing.sm }, orderRow: { gap: StoreSpacing.xs, padding: StoreSpacing.md, backgroundColor: StoreColors.surfaceAlt, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.medium, borderCurve: 'continuous' }, orderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.sm }, orderIdWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: StoreSpacing.xs }, orderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: StoreSpacing.xs, paddingTop: StoreSpacing.xs }, orderAction: { minHeight: 35, minWidth: 68, alignItems: 'center', justifyContent: 'center', paddingHorizontal: StoreSpacing.xs, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#C9DCD0', borderRadius: StoreRadii.small, borderCurve: 'continuous' }, orderActionActive: { backgroundColor: StoreColors.electric, borderColor: StoreColors.primary }, orderActionText: { color: StoreColors.text, fontFamily: StoreFonts.semibold }, state: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.xs, padding: StoreSpacing.lg }, stateIcon: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill }, stateDescription: { textAlign: 'center' }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.55 },
});
