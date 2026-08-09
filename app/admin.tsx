import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { API_BASE_URL } from '@/constants/api';
import { StoreColors, StoreRadii } from '@/constants/store-theme';

type ProductForm = {
  product_name: string;
  description: string;
  price: string;
  image_url: string;
  sku: string;
  category: string;
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
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [form, setForm] = useState<ProductForm>(emptyProduct);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !productId) return;

    const controller = new AbortController();
    setIsLoadingProduct(true);
    async function loadProduct() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
          signal: controller.signal,
        });
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
  }, [productId, token]);

  async function login() {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      setToken(data.token);
      setPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveProduct() {
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        productId ? `${API_BASE_URL}/api/products/${productId}` : `${API_BASE_URL}/api/products`,
        {
          method: productId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...form, price: Number(form.price) }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) setToken('');
      if (!response.ok) throw new Error(data.error || 'บันทึกสินค้าไม่สำเร็จ');

      setMessage(productId ? 'แก้ไขสินค้าเรียบร้อยแล้ว' : 'เพิ่มสินค้าเรียบร้อยแล้ว');
      if (!productId) setForm(emptyProduct);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'บันทึกสินค้าไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await fetch(`${API_BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
    setToken('');
    setMessage('');
  }

  if (!token) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <View style={styles.loginCard}>
          <View style={styles.adminIcon}>
            <Ionicons name="shield-checkmark" size={42} color={StoreColors.jungleDark} />
          </View>
          <Text style={styles.title}>สำหรับ Admin เท่านั้น</Text>
          <Text style={styles.subtitle}>
            กรุณาเข้าสู่ระบบก่อน{productId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
          </Text>
          <AdminInput label="ชื่อผู้ดูแลระบบ" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <AdminInput label="รหัสผ่าน" value={password} onChangeText={setPassword} secureTextEntry />
          {!!error && <Text selectable style={styles.errorText}>{error}</Text>}
          <AdminButton label="เข้าสู่ระบบ" onPress={login} loading={isSubmitting} />
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
            </>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: StoreColors.mint },
  page: { flexGrow: 1, backgroundColor: StoreColors.mint, padding: 20, alignItems: 'center', justifyContent: 'center' },
  loginCard: { width: '100%', maxWidth: 480, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}`, padding: 24, gap: 16 },
  formCard: { width: '100%', maxWidth: 760, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: `5px 5px 0 ${StoreColors.ink}`, padding: 24, gap: 18 },
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
  cancelButton: { padding: 12 },
  cancelText: { color: StoreColors.jungle, fontWeight: '800' },
  errorText: { color: StoreColors.danger, fontWeight: '700', lineHeight: 21 },
  successText: { color: StoreColors.jungle, fontWeight: '800', lineHeight: 21 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], opacity: 0.9 },
  disabled: { opacity: 0.6 },
});
