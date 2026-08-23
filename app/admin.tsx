import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreColors, StoreRadii } from '@/constants/store-theme';

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

const emptyProduct: ProductForm = {
  product_name: '',
  description: '',
  price: '',
  image_url: '',
  sku: '',
  category: '',
};

export default function AdminScreen() {
  const router = useRouter();
  const { removeItem } = useCart();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const { authFetch, isLoading: isAuthLoading, logout, role } = useAuth();
  const isAdmin = role === 'admin';
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!isAdmin || !productId) return;

    const controller = new AbortController();
    setIsLoadingProduct(true);
    async function loadProduct() {
      try {
        const response = await authFetch(`/api/products/${productId}`, {
          signal: controller.signal,
        });
        if (response.status === 401) {
          await logout();
          return;
        }
        if (!response.ok) throw new Error('โหลดข้อมูลสินค้าไม่สำเร็จ');
        const product = await response.json();
        setForm({
          product_name: String(product.product_name ?? ''),
          description: String(product.description ?? ''),
          price: String(product.price ?? ''),
          image_url: String(product.image_url ?? ''),
          sku: String(product.sku ?? ''),
          category: String(product.category ?? ''),
        });
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลสินค้าไม่สำเร็จ');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingProduct(false);
      }
    }

    loadProduct();
    return () => controller.abort();
  }, [authFetch, isAdmin, logout, productId]);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setOrdersLoading(true);
    setOrdersError('');

    async function loadOrders() {
      try {
        const response = await authFetch('/api/admin/orders', { signal: controller.signal });
        const data = await response.json().catch(() => []);
        if (response.status === 401) {
          await logout();
          return;
        }
        if (!response.ok) throw new Error(data.error || 'โหลดคำสั่งซื้อไม่สำเร็จ');
        setOrders(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setOrdersError(loadError instanceof Error ? loadError.message : 'โหลดคำสั่งซื้อไม่สำเร็จ');
        }
      } finally {
        if (!controller.signal.aborted) setOrdersLoading(false);
      }
    }

    void loadOrders();
    return () => controller.abort();
  }, [authFetch, isAdmin, logout]);

  async function updateOrderStatus(orderId: string | number, status: string) {
    setUpdatingOrderId(orderId);
    setOrdersError('');
    try {
      const response = await authFetch(`/api/admin/orders/${encodeURIComponent(String(orderId))}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await logout();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ');
      setOrders((current) => current.map((order) => String(order.id) === String(orderId) ? { ...order, status } : order));
    } catch (updateError) {
      setOrdersError(updateError instanceof Error ? updateError.message : 'อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function saveProduct() {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await authFetch(
        productId ? `/api/products/${productId}` : '/api/products',
        {
          method: productId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...form, price: Number(form.price) }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await logout();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'บันทึกสินค้าไม่สำเร็จ');

      setMessage(productId ? 'แก้ไขสินค้าเรียบร้อยแล้ว' : 'เพิ่มสินค้าเรียบร้อยแล้ว');
      if (!productId) setForm(emptyProduct);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกสินค้าไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteProduct() {
    if (!productId) return;
    setIsDeleting(true);
    setError('');
    setMessage('');

    try {
      const response = await authFetch(`/api/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await logout();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'ลบสินค้าไม่สำเร็จ');

      removeItem(productId);
      setShowDeleteConfirmation(false);
      setIsDeleted(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ลบสินค้าไม่สำเร็จ');
    } finally {
      setIsDeleting(false);
    }
  }

  if (isAuthLoading) {
    return <View style={styles.loadingPage}><ActivityIndicator size="large" color={StoreColors.jungle} /></View>;
  }

  if (!isAdmin) {
    return <Redirect href={{ pathname: '/login', params: { mode: 'admin', redirect: '/admin', productId: productId ? String(productId) : undefined } } as never} />;
  }

  if (isDeleted) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <View style={styles.deletedCard}>
          <View style={styles.deletedIcon}>
            <Ionicons name="checkmark" size={42} color={StoreColors.ink} />
          </View>
          <Text style={styles.title}>ลบสินค้าเรียบร้อยแล้ว</Text>
          <Text selectable style={styles.subtitle}>
            {form.product_name || `Product ID ${productId}`} ถูกลบออกจาก Inventory จริงแล้ว
          </Text>
          <AdminButton label="กลับหน้าร้าน" onPress={() => router.replace('/')} loading={false} />
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <View style={styles.formCard}>
          <View style={styles.formHeading}>
            <View>
              <Text style={styles.title}>{productId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</Text>
              <Text style={styles.subtitle}>กรอกข้อมูลให้ครบก่อนบันทึกลง Inventory</Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={20} color={StoreColors.danger} />
              <Text style={styles.logoutText}>ออกจาก Admin</Text>
            </Pressable>
          </View>

          {isLoadingProduct ? (
            <ActivityIndicator size="large" color={StoreColors.jungle} />
          ) : (
            <>
              <AdminInput label="ชื่อสินค้า" value={form.product_name} onChangeText={(value) => setForm({ ...form, product_name: value })} />
              <AdminInput label="รายละเอียด" value={form.description} onChangeText={(value) => setForm({ ...form, description: value })} multiline />
              <View style={styles.twoColumns}>
                <View style={styles.column}>
                  <AdminInput label="ราคา (THB)" value={form.price} onChangeText={(value) => setForm({ ...form, price: value })} keyboardType="decimal-pad" />
                </View>
                <View style={styles.column}>
                  <AdminInput label="SKU" value={form.sku} onChangeText={(value) => setForm({ ...form, sku: value })} autoCapitalize="characters" />
                </View>
              </View>
              <AdminInput label="หมวดหมู่" value={form.category} onChangeText={(value) => setForm({ ...form, category: value })} />
              <AdminInput label="URL รูปภาพ" value={form.image_url} onChangeText={(value) => setForm({ ...form, image_url: value })} autoCapitalize="none" keyboardType="url" />

              {!!error && <Text selectable style={styles.errorText}>{error}</Text>}
              {!!message && <Text selectable style={styles.successText}>{message}</Text>}

              <View style={styles.actionRow}>
                <AdminButton label={productId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'} onPress={saveProduct} loading={isSubmitting} />
                <Pressable onPress={() => router.replace('/')} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>กลับหน้าร้าน</Text>
                </Pressable>
              </View>

              {!!productId && (
                <View style={styles.dangerZone}>
                  <View style={styles.dangerHeading}>
                    <Ionicons name="warning-outline" size={23} color={StoreColors.danger} />
                    <View style={styles.dangerCopy}>
                      <Text style={styles.dangerTitle}>ลบสินค้าออกจาก Database</Text>
                      <Text style={styles.dangerDescription}>การลบนี้ย้อนกลับไม่ได้ และสินค้าจะหายจากหน้าร้านทันที</Text>
                    </View>
                  </View>

                  {showDeleteConfirmation ? (
                    <View style={styles.confirmationBox}>
                      <Text selectable style={styles.confirmationText}>
                        ยืนยันว่าจะลบ “{form.product_name}” ใช่หรือไม่?
                      </Text>
                      <View style={styles.actionRow}>
                        <Pressable
                          disabled={isDeleting}
                          onPress={deleteProduct}
                          style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed, isDeleting && styles.disabled]}>
                          {isDeleting
                            ? <ActivityIndicator color={StoreColors.white} />
                            : <Text style={styles.confirmDeleteText}>ยืนยัน ลบถาวร</Text>}
                        </Pressable>
                        <Pressable
                          disabled={isDeleting}
                          onPress={() => setShowDeleteConfirmation(false)}
                          style={styles.keepProductButton}>
                          <Text style={styles.keepProductText}>ยกเลิก</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setError('');
                        setShowDeleteConfirmation(true);
                      }}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                      <Ionicons name="trash-outline" size={19} color={StoreColors.danger} />
                      <Text style={styles.deleteButtonText}>ลบสินค้านี้</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}
        </View>
        <View style={styles.ordersCard}>
          <View style={styles.ordersHeading}>
            <View>
              <Text style={styles.sectionTitle}>คำสั่งซื้อทั้งหมด</Text>
              <Text style={styles.ordersSubtitle}>ดูคำสั่งซื้อของ User และ Admin แล้วเปลี่ยนสถานะได้จากที่นี่</Text>
            </View>
            <Ionicons name="receipt-outline" size={28} color={StoreColors.jungleDark} />
          </View>

          {ordersLoading ? (
            <ActivityIndicator color={StoreColors.jungle} />
          ) : ordersError ? (
            <Text selectable style={styles.errorText}>{ordersError}</Text>
          ) : orders.length === 0 ? (
            <Text style={styles.emptyOrdersText}>ยังไม่มีคำสั่งซื้อในระบบ</Text>
          ) : (
            <View style={styles.ordersList}>
              {orders.map((order) => (
                <View key={String(order.id)} style={styles.orderRow}>
                  <View style={styles.orderHeading}>
                    <Text style={styles.orderId}>#{order.id}</Text>
                    <Text style={styles.orderStatus}>{order.status}</Text>
                  </View>
                  <Text style={styles.orderMeta}>
                    {order.buyerRole === 'admin' ? 'Admin' : 'User'}: {order.username || order.email || 'ไม่ระบุ'}
                  </Text>
                  <Text style={styles.orderMeta}>ยอดรวม {formatMoney(order.totalAmount)}{order.createdAt ? ` • ${new Date(order.createdAt).toLocaleString('th-TH')}` : ''}</Text>
                  <View style={styles.orderActions}>
                    {(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
                      <Pressable
                        key={status}
                        disabled={updatingOrderId !== null}
                        onPress={() => updateOrderStatus(order.id, status)}
                        style={({ pressed }) => [styles.orderActionButton, order.status === status && styles.orderActionActive, pressed && styles.pressed, updatingOrderId !== null && styles.disabled]}>
                        {updatingOrderId === order.id && order.status !== status ? <ActivityIndicator size="small" color={StoreColors.ink} /> : <Text style={styles.orderActionText}>{orderStatusLabel(status)}</Text>}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AdminInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#6B7C63"
        style={[styles.input, props.multiline && styles.multilineInput]}
      />
    </View>
  );
}

function AdminButton({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color={StoreColors.ink} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

function orderStatusLabel(status: string) {
  return ({ pending: 'รอ', confirmed: 'ยืนยัน', shipped: 'จัดส่ง', delivered: 'สำเร็จ', cancelled: 'ยกเลิก' } as Record<string, string>)[status] || status;
}

function formatMoney(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} THB` : `${value} THB`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: StoreColors.mint },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.mint },
  page: { flexGrow: 1, backgroundColor: StoreColors.mint, padding: 20, alignItems: 'center', justifyContent: 'center' },
  loginCard: { width: '100%', maxWidth: 480, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}`, padding: 24, gap: 16 },
  formCard: { width: '100%', maxWidth: 760, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}`, padding: 24, gap: 18 },
  deletedCard: { width: '100%', maxWidth: 520, alignItems: 'center', backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}`, padding: 28, gap: 16 },
  deletedIcon: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill },
  adminIcon: { width: 78, height: 78, borderRadius: StoreRadii.pill, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink },
  title: { color: StoreColors.ink, fontSize: 28, fontWeight: '900' },
  subtitle: { color: '#3C4B35', fontSize: 15, lineHeight: 22 },
  formHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  field: { gap: 7 },
  label: { color: StoreColors.ink, fontSize: 14, fontWeight: '800' },
  input: { minHeight: 48, color: StoreColors.ink, backgroundColor: StoreColors.mintSoft, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, borderCurve: 'continuous', paddingHorizontal: 13, fontSize: 16 },
  multilineInput: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  column: { flex: 1, minWidth: 210 },
  primaryButton: { minHeight: 48, minWidth: 150, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, borderCurve: 'continuous', boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  primaryButtonText: { color: StoreColors.ink, fontWeight: '900', fontSize: 16 },
  logoutButton: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 10 },
  logoutText: { color: StoreColors.danger, fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  dangerZone: { gap: 13, padding: 16, backgroundColor: '#FFF2EF', borderWidth: 2, borderColor: StoreColors.danger, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  dangerHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dangerCopy: { flex: 1, gap: 3 },
  dangerTitle: { color: StoreColors.danger, fontSize: 16, fontWeight: '900' },
  dangerDescription: { color: '#70423A', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  deleteButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.danger, borderRadius: StoreRadii.small },
  deleteButtonText: { color: StoreColors.danger, fontSize: 14, fontWeight: '900' },
  confirmationBox: { gap: 12, padding: 13, backgroundColor: StoreColors.white, borderWidth: 1.5, borderColor: StoreColors.danger, borderRadius: StoreRadii.small },
  confirmationText: { color: StoreColors.ink, fontSize: 14, lineHeight: 21, fontWeight: '800' },
  confirmDeleteButton: { minHeight: 44, minWidth: 150, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: StoreColors.danger, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  confirmDeleteText: { color: StoreColors.white, fontSize: 14, fontWeight: '900' },
  keepProductButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  keepProductText: { color: StoreColors.ink, fontSize: 14, fontWeight: '800' },
  cancelButton: { padding: 12 },
  cancelText: { color: StoreColors.jungle, fontWeight: '800' },
  errorText: { color: StoreColors.danger, fontWeight: '700', lineHeight: 21 },
  successText: { color: StoreColors.jungle, fontWeight: '800', lineHeight: 21 },
  ordersCard: { width: '100%', maxWidth: 760, backgroundColor: StoreColors.lavender, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}`, padding: 20, gap: 14 },
  ordersHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  sectionTitle: { color: StoreColors.ink, fontSize: 21, fontWeight: '900' },
  ordersSubtitle: { color: '#3C4B35', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  emptyOrdersText: { color: '#52615C', fontSize: 14, fontWeight: '700' },
  ordersList: { gap: 12 },
  orderRow: { gap: 6, padding: 13, backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium },
  orderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  orderId: { color: StoreColors.ink, fontSize: 16, fontWeight: '900' },
  orderStatus: { color: StoreColors.jungleDark, fontSize: 12, fontWeight: '900' },
  orderMeta: { color: '#52615C', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  orderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 4 },
  orderActionButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: StoreColors.mintSoft, borderWidth: 1.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  orderActionActive: { backgroundColor: StoreColors.electric },
  orderActionText: { color: StoreColors.ink, fontSize: 12, fontWeight: '900' },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], opacity: 0.9 },
  disabled: { opacity: 0.6 },
});
