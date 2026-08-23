import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreColors, StoreRadii } from '@/constants/store-theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { itemCount, totalPrice } = useCart();
  const { authFetch, isLoading: isAuthLoading, logout, role, user, admin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    if (role !== 'user' && role !== 'admin') {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const response = await authFetch('/api/orders', { signal });
      const data = await response.json().catch(() => []);
      if (response.status === 401) {
        await logout();
        return;
      }
      if (!response.ok) throw new Error(data.error || 'โหลดประวัติคำสั่งซื้อไม่สำเร็จ');
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setOrdersError(error instanceof Error ? error.message : 'โหลดประวัติคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setOrdersLoading(false);
    }
  }, [authFetch, logout, role]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders]));

  if (isAuthLoading) {
    return <View style={styles.loadingPage}><ActivityIndicator size="large" color={StoreColors.jungle} /></View>;
  }

  const isUser = role === 'user';
  const isBuyer = role === 'user' || role === 'admin';

  return (
    <ScrollView style={styles.page} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, styles.contentWithSidebar]}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Ionicons name="person" size={46} color={StoreColors.ink} /></View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{isUser ? user?.name || user?.username : role === 'admin' ? admin?.username : 'ผู้เยี่ยมชม'}</Text>
          <Text style={styles.status}>{isUser ? `${user?.email || ''} • บัญชี User` : role === 'admin' ? 'บัญชี Admin • ใช้ตะกร้าและสั่งซื้อได้' : 'ดูสินค้าได้ แต่ต้องเข้าสู่ระบบก่อนซื้อสินค้า'}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: StoreColors.orange }]}>
          <Ionicons name="cart" size={24} color={StoreColors.ink} />
          <Text style={styles.statValue}>{itemCount}</Text>
          <Text style={styles.statLabel}>สินค้าในตะกร้า</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: StoreColors.electric }]}>
          <Ionicons name="wallet-outline" size={24} color={StoreColors.ink} />
          <Text style={styles.statValue}>{totalPrice.toLocaleString('th-TH')}</Text>
          <Text style={styles.statLabel}>ยอดรวม (THB)</Text>
        </View>
      </View>

      {!isUser && role !== 'admin' && (
        <View style={styles.loginCard}>
          <Ionicons name="lock-closed-outline" size={25} color={StoreColors.ink} />
          <View style={styles.noteCopy}>
            <Text style={styles.noteTitle}>ยังไม่ได้เข้าสู่ระบบ</Text>
            <Text style={styles.noteText}>สมัครสมาชิกหรือเข้าสู่ระบบเพื่อเพิ่มสินค้าลงตะกร้าและสั่งซื้อ</Text>
          </View>
          <MenuButton icon="log-in-outline" label="เข้าสู่ระบบ / สมัครสมาชิก" onPress={() => router.push({ pathname: '/login', params: { mode: 'user' } } as never)} accent />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ทางลัด</Text>
        <MenuButton icon="grid-outline" label="เลือกดูหมวดหมู่สินค้า" onPress={() => router.push('/categories')} />
        <MenuButton icon="cart-outline" label="เปิดตะกร้าสินค้า" onPress={() => router.push('/cart')} />
      </View>

      {isBuyer && (
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>{isUser ? 'ประวัติคำสั่งซื้อ' : 'คำสั่งซื้อของ Admin'}</Text>
            <Text style={styles.orderHint}>ติดตามสถานะได้ที่นี่</Text>
          </View>
          {ordersLoading ? <ActivityIndicator color={StoreColors.jungle} /> : ordersError ? <Text selectable style={styles.errorText}>{ordersError}</Text> : orders.length === 0 ? (
            <View style={styles.infoBox}><Ionicons name="receipt-outline" size={21} color={StoreColors.jungleDark} /><Text style={styles.infoText}>ยังไม่มีคำสั่งซื้อของคุณ</Text></View>
          ) : orders.map((order) => <OrderCard key={String(order.id)} order={order} />)}
        </View>
      )}

      {isBuyer && <MenuButton icon="log-out-outline" label={`ออกจากระบบ ${isUser ? 'User' : 'Admin'}`} onPress={logout} />}

      {role === 'admin' && <View style={styles.section}>
        <Text style={styles.sectionTitle}>จัดการร้านค้า</Text>
        <MenuButton icon="settings-outline" label="จัดการสินค้าและคำสั่งซื้อ" onPress={() => router.push('/admin')} accent />
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={21} color={StoreColors.jungleDark} />
          <Text style={styles.infoText}>คุณกำลังใช้งานในสิทธิ์ Admin จึงเห็นเครื่องมือจัดการร้านค้าได้</Text>
        </View>
      </View>}

      <View style={styles.loginNote}>
        <Ionicons name="information-circle-outline" size={24} color={StoreColors.ink} />
        <View style={styles.noteCopy}>
          <Text style={styles.noteTitle}>สถานะระบบสมาชิก</Text>
          <Text style={styles.noteText}>{isBuyer ? 'บัญชีของคุณพร้อมสร้างคำสั่งซื้อและติดตามสถานะแล้ว' : 'ผู้เยี่ยมชมยังดูสินค้าได้ แต่ไม่สามารถเพิ่มลงตะกร้าหรือสร้างคำสั่งซื้อได้'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

type Order = {
  id: string | number;
  status: string;
  totalAmount: string | number;
  createdAt?: string;
  items?: { productName: string; quantity: number }[];
};

function OrderCard({ order }: { order: Order }) {
  const statusLabels: Record<string, string> = { pending: 'รอดำเนินการ', confirmed: 'ยืนยันแล้ว', shipped: 'กำลังจัดส่ง', delivered: 'จัดส่งแล้ว', cancelled: 'ยกเลิก' };
  const itemSummary = order.items?.map((item) => `${item.productName} x${item.quantity}`).join(', ');
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}><Text style={styles.orderId}>คำสั่งซื้อ #{order.id}</Text><Text style={styles.orderStatus}>{statusLabels[order.status] || order.status}</Text></View>
      {!!order.createdAt && <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleString('th-TH')}</Text>}
      {!!itemSummary && <Text numberOfLines={2} style={styles.orderItems}>{itemSummary}</Text>}
      <Text style={styles.orderTotal}>ยอดรวม {formatPrice(order.totalAmount)}</Text>
    </View>
  );
}

function formatPrice(price: number | string) {
  const value = Number(price);
  return `${Number.isFinite(value) ? value.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : price} THB`;
}

function MenuButton({ icon, label, onPress, accent = false }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuButton, accent && styles.accentButton, pressed && styles.pressed]}>
      <View style={styles.menuIcon}><Ionicons name={icon} size={22} color={StoreColors.ink} /></View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={21} color={StoreColors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.mint },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.mint },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 34, gap: 20 },
  contentWithSidebar: { paddingTop: 72 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, backgroundColor: StoreColors.lavender, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  avatar: { width: 82, height: 82, borderRadius: StoreRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 3, borderColor: StoreColors.ink },
  profileCopy: { flex: 1, gap: 5 },
  name: { color: StoreColors.ink, fontSize: 25, fontWeight: '900' },
  status: { color: '#52615C', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 12, borderWidth: 2.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  statValue: { color: StoreColors.ink, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { color: StoreColors.ink, fontSize: 12, textAlign: 'center', fontWeight: '700' },
  section: { gap: 11 },
  sectionTitle: { color: StoreColors.ink, fontSize: 20, fontWeight: '900' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  orderHint: { color: StoreColors.jungle, fontSize: 12, fontWeight: '800' },
  loginCard: { gap: 10, padding: 15, backgroundColor: StoreColors.peach, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium },
  menuButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  accentButton: { backgroundColor: StoreColors.yellow },
  menuIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.mintMuted, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill },
  menuLabel: { flex: 1, color: StoreColors.ink, fontSize: 15, fontWeight: '800' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, backgroundColor: StoreColors.mintSoft, borderWidth: 1.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  infoText: { flex: 1, color: StoreColors.jungleDark, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  orderCard: { gap: 7, padding: 14, backgroundColor: StoreColors.white, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  orderId: { color: StoreColors.ink, fontSize: 15, fontWeight: '900' },
  orderStatus: { color: StoreColors.jungleDark, fontSize: 12, fontWeight: '900' },
  orderDate: { color: '#64736C', fontSize: 11, fontWeight: '600' },
  orderItems: { color: '#52615C', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  orderTotal: { color: StoreColors.ink, fontSize: 14, fontWeight: '900' },
  errorText: { color: StoreColors.danger, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  loginNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 17, backgroundColor: StoreColors.peach, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium },
  noteCopy: { flex: 1, gap: 4 },
  noteTitle: { color: StoreColors.ink, fontSize: 15, fontWeight: '900' },
  noteText: { color: '#54493F', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  pressed: { opacity: 0.86, transform: [{ translateX: 2 }, { translateY: 2 }] },
});
