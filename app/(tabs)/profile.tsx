// หน้าโปรไฟล์: แสดงบัญชี, สถิติ และประวัติ Order ของคนที่ Login อยู่
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreHeader } from '@/components/store-header';
import { StoreBadge } from '@/components/ui/store-badge';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon, StoreIconName } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { formatProductPrice } from '@/types/product';

type OrderItem = { productName: string; quantity: number; unitPrice?: string | number };
type Order = {
  id: string | number;
  status: string;
  totalAmount: string | number;
  createdAt?: string;
  updatedAt?: string;
  items?: OrderItem[];
};

const ORDER_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: 'รอดำเนินการ',
  confirmed: 'ยืนยันแล้ว',
  shipped: 'กำลังจัดส่ง',
  delivered: 'จัดส่งแล้ว',
  cancelled: 'ยกเลิก',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { itemCount, totalPrice } = useCart();
  const { authFetch, isLoading: isAuthLoading, logout, role, user, admin } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const isDesktop = isHydrated && width >= 900;
  const isUser = role === 'user';
  const isBuyer = role === 'user' || role === 'admin';

  useEffect(() => setIsHydrated(true), []);

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

  // โหลดประวัติใหม่ตอนกลับมาหน้านี้ เพื่อให้สถานะ Order ล่าสุด
  // กลับมาหน้านี้เมื่อไร ก็โหลดประวัติใหม่เพื่อให้สถานะล่าสุด
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders]));

  const displayName = isUser ? user?.name || user?.username : role === 'admin' ? admin?.username : 'ผู้เยี่ยมชม';
  const accountDescription = isUser
    ? `${user?.email || ''} · บัญชีลูกค้า`
    : role === 'admin'
      ? 'บัญชี Admin · ซื้อสินค้าและจัดการร้านค้าได้'
      : 'ดูสินค้าได้ แต่ต้องเข้าสู่ระบบก่อนซื้อสินค้า';

  return (
    <View style={styles.page}>
      <ScrollView stickyHeaderIndices={[0]} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent}>
        <StoreHeader activeRoute="profile" isDesktop={isDesktop} showSearch={false} />

        <View style={[styles.content, isDesktop && styles.desktopContent]}>
          {isAuthLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={StoreColors.primary} />
              <StoreText variant="label">กำลังเรียกคืนบัญชี...</StoreText>
            </View>
          ) : (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatar}>
                  <StoreIcon name={role === 'admin' ? 'shield-checkmark-outline' : 'person-outline'} size={40} color={StoreColors.primary} />
                </View>
                <View style={styles.profileCopy}>
                  <View style={styles.nameRow}>
                    <StoreText selectable variant="title">{displayName}</StoreText>
                    <StoreBadge label={role === 'admin' ? 'ADMIN' : role === 'user' ? 'USER' : 'GUEST'} tone={role === 'admin' ? 'accent' : role === 'user' ? 'success' : 'neutral'} />
                  </View>
                  <StoreText selectable style={styles.accountDescription}>{accountDescription}</StoreText>
                  {isUser && user?.phone && <StoreText selectable variant="caption">โทร {user.phone}</StoreText>}
                </View>
                {!isBuyer && <StoreButton title="เข้าสู่ระบบ" icon="log-in-outline" onPress={() => router.push({ pathname: '/login', params: { mode: 'user', redirect: '/profile' } } as never)} />}
              </View>

              <View style={styles.statsRow}>
                <StatCard icon="cart-outline" value={String(itemCount)} label="สินค้าในตะกร้า" color={StoreColors.peach} />
                <StatCard icon="wallet-outline" value={formatProductPrice(totalPrice)} label="ยอดรวมสินค้า" color={StoreColors.primarySoft} />
                <StatCard icon="receipt-outline" value={isBuyer ? String(orders.length) : '—'} label="คำสั่งซื้อทั้งหมด" color={StoreColors.lavender} />
              </View>

              <View style={[styles.mainGrid, isDesktop && styles.desktopGrid]}>
                <View style={styles.primaryColumn}>
                  <View style={styles.sectionHeading}>
                    <View>
                      <StoreText variant="title">ประวัติคำสั่งซื้อ</StoreText>
                      <StoreText variant="caption">ติดตามสถานะคำสั่งซื้อของบัญชีนี้</StoreText>
                    </View>
                    {isBuyer && <StoreButton title="รีเฟรช" icon="refresh" variant="ghost" size="sm" onPress={() => loadOrders()} />}
                  </View>

                  {!isBuyer ? (
                    <InfoCard icon="lock-closed-outline" title="เข้าสู่ระบบเพื่อดูประวัติ" description="ประวัติคำสั่งซื้อแยกตามบัญชีและจะไม่แสดงในโหมดผู้เยี่ยมชม" />
                  ) : ordersLoading ? (
                    <View style={styles.ordersState}><ActivityIndicator color={StoreColors.primary} /><StoreText variant="caption">กำลังโหลดคำสั่งซื้อ...</StoreText></View>
                  ) : ordersError ? (
                    <InfoCard icon="cloud-offline-outline" title="โหลดประวัติไม่สำเร็จ" description={ordersError} danger />
                  ) : orders.length === 0 ? (
                    <InfoCard icon="receipt-outline" title="ยังไม่มีคำสั่งซื้อ" description="เมื่อยืนยันคำสั่งซื้อจากตะกร้า รายการและสถานะจะแสดงที่นี่" />
                  ) : (
                    <View style={styles.orderList}>{orders.map((order) => <OrderCard key={String(order.id)} order={order} />)}</View>
                  )}
                </View>

                <View style={styles.sideColumn}>
                  <View style={styles.sideCard}>
                    <StoreText variant="heading">ทางลัด</StoreText>
                    <MenuButton icon="grid-outline" label="เลือกดูหมวดหมู่" onPress={() => router.push('/categories')} />
                    <MenuButton icon="cart-outline" label="เปิดตะกร้าสินค้า" onPress={() => router.push('/cart')} />
                    {role === 'admin' && <MenuButton icon="pencil-outline" label="จัดการร้านค้า" onPress={() => router.push('/admin')} accent />}
                  </View>

                  <InfoCard
                    icon="information-circle-outline"
                    title="สถานะระบบสมาชิก"
                    description={isBuyer ? 'บัญชีนี้เพิ่มสินค้า สร้างคำสั่งซื้อ และติดตามสถานะได้แล้ว' : 'ผู้เยี่ยมชมดูสินค้าได้ แต่ยังไม่สามารถเพิ่มลงตะกร้าหรือสั่งซื้อ'}
                  />

                  {isBuyer && <StoreButton title={`ออกจากระบบ ${isUser ? 'User' : 'Admin'}`} icon="log-out-outline" variant="outline" onPress={() => void logout()} />}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, value, label, color }: { icon: StoreIconName; value: string; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <StoreIcon name={icon} size={23} color={StoreColors.primary} />
      <StoreText selectable variant="heading" numberOfLines={1} style={styles.statValue}>{value}</StoreText>
      <StoreText variant="caption">{label}</StoreText>
    </View>
  );
}

function OrderCard({ order }: { order: Order }) {
  const currentIndex = ORDER_STEPS.indexOf(order.status as typeof ORDER_STEPS[number]);
  const cancelled = order.status === 'cancelled';
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeadingCopy}>
          <StoreText selectable variant="heading">คำสั่งซื้อ #{order.id}</StoreText>
          {!!order.createdAt && <StoreText selectable variant="caption">{new Date(order.createdAt).toLocaleString('th-TH')}</StoreText>}
        </View>
        <StoreBadge label={STATUS_LABELS[order.status] || order.status} tone={cancelled ? 'danger' : order.status === 'delivered' ? 'success' : 'primary'} />
      </View>

      {!cancelled && (
        <View accessibilityLabel={`สถานะ ${STATUS_LABELS[order.status] || order.status}`} style={styles.progressRow}>
          {ORDER_STEPS.map((step, index) => (
            <View key={step} style={styles.progressItem}>
              <View style={[styles.progressDot, index <= currentIndex && styles.progressDotActive]}>
                {index < currentIndex && <StoreIcon name="checkmark" size={12} color={StoreColors.white} />}
              </View>
              <StoreText variant="caption" numberOfLines={1} style={[styles.progressLabel, index <= currentIndex && styles.progressLabelActive]}>{STATUS_LABELS[step]}</StoreText>
              {index < ORDER_STEPS.length - 1 && <View style={[styles.progressLine, index < currentIndex && styles.progressLineActive]} />}
            </View>
          ))}
        </View>
      )}

      {!!order.items?.length && (
        <View style={styles.orderItems}>
          {order.items.map((item, index) => (
            <View key={`${item.productName}-${index}`} style={styles.orderItemRow}>
              <StoreText variant="body" numberOfLines={1} style={styles.orderItemName}>{item.productName}</StoreText>
              <StoreText selectable variant="label">×{item.quantity}</StoreText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.orderTotalRow}>
        <StoreText variant="label">ยอดรวมสินค้า</StoreText>
        <StoreText selectable variant="heading" style={styles.orderTotal}>{formatProductPrice(order.totalAmount)}</StoreText>
      </View>
    </View>
  );
}

function MenuButton({ icon, label, onPress, accent = false }: { icon: StoreIconName; label: string; onPress: () => void; accent?: boolean }) {
  return (
    <StoreButton title={label} icon={icon} variant={accent ? 'primary' : 'outline'} onPress={onPress} style={styles.menuButton} />
  );
}

function InfoCard({ icon, title, description, danger = false }: { icon: StoreIconName; title: string; description: string; danger?: boolean }) {
  return (
    <View style={[styles.infoCard, danger && styles.dangerInfoCard]}>
      <View style={[styles.infoIcon, danger && styles.dangerInfoIcon]}><StoreIcon name={icon} size={23} color={danger ? StoreColors.danger : StoreColors.primary} /></View>
      <View style={styles.infoCopy}>
        <StoreText variant="label">{title}</StoreText>
        <StoreText selectable variant="caption">{description}</StoreText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.background },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: StoreSpacing.md, paddingBottom: StoreSpacing.xxl, gap: StoreSpacing.lg },
  desktopContent: { paddingHorizontal: StoreSpacing.xl, paddingTop: StoreSpacing.lg },
  loadingCard: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm },
  profileCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: StoreSpacing.md, padding: StoreSpacing.lg, backgroundColor: StoreColors.lavender, borderWidth: 1, borderColor: '#D3C7EF', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  avatar: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surface, borderRadius: StoreRadii.pill },
  profileCopy: { flex: 1, minWidth: 190, gap: StoreSpacing.xxs },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: StoreSpacing.xs },
  accountDescription: { color: StoreColors.textMuted },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: StoreSpacing.sm },
  statCard: { flex: 1, minWidth: 150, minHeight: 118, justifyContent: 'center', gap: StoreSpacing.xxs, padding: StoreSpacing.md, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  statValue: { color: StoreColors.primary, fontVariant: ['tabular-nums'] },
  mainGrid: { gap: StoreSpacing.lg },
  desktopGrid: { flexDirection: 'row', alignItems: 'flex-start' },
  primaryColumn: { flex: 1, minWidth: 0, gap: StoreSpacing.md },
  sideColumn: { gap: StoreSpacing.md },
  sideCard: { gap: StoreSpacing.sm, padding: StoreSpacing.md, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: StoreShadows.card },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.md },
  menuButton: { width: '100%', justifyContent: 'flex-start', boxShadow: 'none' },
  ordersState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm, backgroundColor: StoreColors.surface, borderRadius: StoreRadii.medium },
  orderList: { gap: StoreSpacing.sm },
  orderCard: { gap: StoreSpacing.md, padding: StoreSpacing.md, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: StoreShadows.card },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: StoreSpacing.md },
  orderHeadingCopy: { flex: 1, gap: 2 },
  progressRow: { flexDirection: 'row', paddingVertical: StoreSpacing.xs },
  progressItem: { flex: 1, alignItems: 'center', gap: StoreSpacing.xxs },
  progressDot: { zIndex: 2, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7E5DC', borderRadius: StoreRadii.pill },
  progressDotActive: { backgroundColor: StoreColors.primary },
  progressLabel: { fontSize: 10, textAlign: 'center' },
  progressLabelActive: { color: StoreColors.primary },
  progressLine: { position: 'absolute', top: 10, left: '50%', width: '100%', height: 3, backgroundColor: '#D7E5DC' },
  progressLineActive: { backgroundColor: StoreColors.primary },
  orderItems: { gap: StoreSpacing.xs, padding: StoreSpacing.sm, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.small, borderCurve: 'continuous' },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm },
  orderItemName: { flex: 1 },
  orderTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.md },
  orderTotal: { color: StoreColors.primary, fontVariant: ['tabular-nums'] },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: StoreSpacing.sm, padding: StoreSpacing.md, backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  dangerInfoCard: { backgroundColor: '#FFF0F0' },
  infoIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.surface, borderRadius: StoreRadii.pill },
  dangerInfoIcon: { backgroundColor: '#FFE2E2' },
  infoCopy: { flex: 1, gap: StoreSpacing.xxs },
});
