// หน้าตะกร้า: อ่าน Cart จาก CartProvider และสร้าง Order ผ่าน API
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreHeader } from '@/components/store-header';
import { StoreButton } from '@/components/ui/store-button';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreText } from '@/components/ui/store-text';
import { StoreColors, StoreRadii, StoreShadows, StoreSpacing } from '@/constants/store-theme';
import { formatProductPrice } from '@/types/product';

export default function CartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { items, itemCount, totalPrice, addItem, decreaseItem, removeItem, clearCart } = useCart();
  const { authFetch, isLoading: isAuthLoading, logout, role } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [orderError, setOrderError] = useState('');
  const isDesktop = isHydrated && width >= 900;

  useEffect(() => setIsHydrated(true), []);

  // สร้าง Order จริงหลัง User/Admin Login แล้วเท่านั้น
  // สร้าง Order จริงหลัง User/Admin Login แล้วเท่านั้น
  const placeOrder = async () => {
    if (!role || items.length === 0 || isOrdering) return;
    setIsOrdering(true);
    setOrderMessage('');
    setOrderError('');
    try {
      const response = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await logout();
        router.push({ pathname: '/login', params: { mode: role === 'admin' ? 'admin' : 'user', redirect: '/cart' } } as never);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'สร้างคำสั่งซื้อไม่สำเร็จ');
      clearCart();
      setOrderMessage(`คำสั่งซื้อ #${data.order?.id ?? ''} ถูกบันทึกแล้ว`);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'สร้างคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView
        stickyHeaderIndices={[0]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}>
        <StoreHeader activeRoute="cart" isDesktop={isDesktop} showSearch={false} />

        <View style={[styles.content, isDesktop && styles.desktopContent]}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <StoreText variant="title">ตะกร้าของฉัน</StoreText>
              <StoreText variant="body" style={styles.subtitle}>{itemCount} ชิ้นในตะกร้า · รายการจะถูกจำไว้บนอุปกรณ์นี้</StoreText>
            </View>
            {items.length > 0 && <StoreButton title="ล้างตะกร้า" icon="trash-outline" variant="ghost" size="sm" onPress={clearCart} />}
          </View>

          {!!orderMessage && (
            <View style={styles.successCard}>
              <View style={styles.successIcon}><StoreIcon name="checkmark" size={20} color={StoreColors.white} /></View>
              <View style={styles.messageCopy}>
                <StoreText variant="heading">สร้างคำสั่งซื้อสำเร็จ</StoreText>
                <StoreText selectable variant="caption">{orderMessage} ติดตามสถานะต่อได้ในหน้าโปรไฟล์</StoreText>
              </View>
              <StoreButton title="ดูประวัติ" variant="outline" size="sm" onPress={() => router.push('/profile')} />
            </View>
          )}

          {isAuthLoading ? (
            <CartState icon="hourglass-outline" title="กำลังตรวจสอบบัญชี" description="รอสักครู่ ระบบกำลังเรียกคืนสถานะการเข้าสู่ระบบ" />
          ) : !role ? (
            <CartState
              icon="lock-closed-outline"
              title="เข้าสู่ระบบก่อนซื้อสินค้า"
              description="คุณยังดูของเล่นได้ตามปกติ แต่ต้องเข้าสู่ระบบก่อนเพิ่มสินค้าและสร้างคำสั่งซื้อ"
              actionLabel="เข้าสู่ระบบ / สมัครสมาชิก"
              onAction={() => router.push({ pathname: '/login', params: { mode: 'user', redirect: '/cart' } } as never)}
            />
          ) : items.length === 0 ? (
            <CartState
              icon="cart-outline"
              title={orderMessage ? 'ตะกร้าถูกเคลียร์หลังสั่งซื้อแล้ว' : 'ตะกร้ายังว่างอยู่'}
              description={orderMessage ? 'ไปดูประวัติคำสั่งซื้อหรือเลือกของเล่นชิ้นถัดไปได้เลย' : 'เลือกของเล่นที่ชอบ แล้วกด “เพิ่มลงตะกร้า” จากหน้าสินค้า'}
              actionLabel="เลือกซื้อสินค้า"
              onAction={() => router.push('/categories')}
            />
          ) : (
            <View style={[styles.cartLayout, isDesktop && styles.desktopLayout]}>
              <View style={styles.itemList}>
                {items.map((item) => (
                  <View key={String(item.id)} style={styles.itemCard}>
                    <Image
                      source={{ uri: item.image_url }}
                      accessibilityLabel={`รูปสินค้า ${item.product_name}`}
                      style={styles.itemImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={180}
                    />
                    <View style={styles.itemInfo}>
                      <StoreText variant="heading" numberOfLines={2}>{item.product_name}</StoreText>
                      {!!item.sku && <StoreText selectable variant="caption">SKU {item.sku}</StoreText>}
                      <StoreText selectable variant="heading" style={styles.itemPrice}>{formatProductPrice(Number(item.price) * item.quantity)}</StoreText>
                      <View style={styles.quantityRow}>
                        <StoreButton title="" icon="remove" variant="outline" size="sm" onPress={() => decreaseItem(item.id)} style={styles.quantityButton} />
                        <StoreText selectable variant="heading" style={styles.quantity}>{item.quantity}</StoreText>
                        <StoreButton title="" icon="add" variant="outline" size="sm" onPress={() => addItem(item)} style={styles.quantityButton} />
                      </View>
                    </View>
                    <StoreButton title="" icon="close" variant="ghost" size="sm" onPress={() => removeItem(item.id)} style={styles.removeButton} />
                  </View>
                ))}
              </View>

              <View style={[styles.summaryCard, isDesktop && styles.desktopSummary]}>
                <StoreText variant="title">สรุปรายการ</StoreText>
                <SummaryRow label="จำนวนสินค้า" value={`${itemCount} ชิ้น`} />
                <SummaryRow label="ค่าจัดส่ง" value="ยังไม่คำนวณ" muted />
                <View style={styles.divider} />
                <SummaryRow label="ยอดรวมสินค้า" value={formatProductPrice(totalPrice)} total />
                <View style={styles.notice}>
                  <StoreIcon name="information-circle-outline" size={21} color={StoreColors.primary} />
                  <StoreText variant="caption" style={styles.noticeText}>เมื่อยืนยัน ระบบจะบันทึกคำสั่งซื้อใน Database ด้วยสถานะ “รอดำเนินการ”</StoreText>
                </View>
                {!!orderError && <StoreText selectable variant="caption" style={styles.errorText}>{orderError}</StoreText>}
                <StoreButton title="ยืนยันคำสั่งซื้อ" icon="checkmark-circle-outline" size="lg" loading={isOrdering} onPress={placeOrder} style={styles.checkoutButton} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function CartState({ icon, title, description, actionLabel, onAction }: {
  icon: 'hourglass-outline' | 'lock-closed-outline' | 'cart-outline';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}><StoreIcon name={icon} size={44} color={StoreColors.primary} /></View>
      <StoreText variant="title" style={styles.stateTitle}>{title}</StoreText>
      <StoreText style={styles.stateDescription}>{description}</StoreText>
      {!!actionLabel && <StoreButton title={actionLabel} icon="arrow-forward" onPress={onAction} />}
    </View>
  );
}

function SummaryRow({ label, value, muted = false, total = false }: { label: string; value: string; muted?: boolean; total?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <StoreText variant={total ? 'heading' : 'body'} style={muted && styles.mutedValue}>{label}</StoreText>
      <StoreText selectable variant={total ? 'title' : 'label'} style={[styles.summaryValue, muted && styles.mutedValue]}>{value}</StoreText>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.background },
  scrollContent: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: StoreSpacing.md, paddingBottom: StoreSpacing.xxl, gap: StoreSpacing.lg },
  desktopContent: { paddingHorizontal: StoreSpacing.xl, paddingTop: StoreSpacing.lg },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.md },
  headingCopy: { flex: 1, gap: StoreSpacing.xxs },
  subtitle: { color: StoreColors.textMuted },
  successCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.md, backgroundColor: StoreColors.primarySoft, borderWidth: 1, borderColor: '#B7DFC5', borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  successIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.success, borderRadius: StoreRadii.pill },
  messageCopy: { flex: 1, minWidth: 180, gap: 2 },
  stateCard: { minHeight: 430, alignItems: 'center', justifyContent: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.lg, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  stateIcon: { width: 94, height: 94, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.primarySoft, borderRadius: StoreRadii.pill },
  stateTitle: { textAlign: 'center' },
  stateDescription: { maxWidth: 520, color: StoreColors.textMuted, textAlign: 'center' },
  cartLayout: { gap: StoreSpacing.lg },
  desktopLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  itemList: { flex: 1, gap: StoreSpacing.sm },
  itemCard: { minHeight: 142, flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.sm, padding: StoreSpacing.sm, backgroundColor: StoreColors.surface, borderWidth: 1, borderColor: '#D5E5DB', borderRadius: StoreRadii.medium, borderCurve: 'continuous', boxShadow: StoreShadows.card },
  itemImage: { width: 112, height: 112, backgroundColor: StoreColors.surfaceAlt, borderRadius: StoreRadii.small, borderCurve: 'continuous' },
  itemInfo: { flex: 1, alignItems: 'flex-start', gap: StoreSpacing.xxs },
  itemPrice: { color: StoreColors.primary, fontSize: 17, fontVariant: ['tabular-nums'] },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: StoreSpacing.xs, paddingTop: StoreSpacing.xxs },
  quantityButton: { width: 40, minHeight: 40, paddingHorizontal: 0, boxShadow: 'none' },
  quantity: { minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  removeButton: { alignSelf: 'flex-start', width: 40, minHeight: 40, paddingHorizontal: 0, boxShadow: 'none' },
  summaryCard: { gap: StoreSpacing.md, padding: StoreSpacing.lg, backgroundColor: StoreColors.lavender, borderWidth: 1, borderColor: '#D3C7EF', borderRadius: StoreRadii.large, borderCurve: 'continuous', boxShadow: StoreShadows.raised },
  desktopSummary: { width: 380 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: StoreSpacing.md },
  summaryValue: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  mutedValue: { color: StoreColors.textMuted },
  divider: { height: 1, backgroundColor: 'rgba(23,56,45,0.16)' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: StoreSpacing.xs, padding: StoreSpacing.sm, backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: StoreRadii.medium, borderCurve: 'continuous' },
  noticeText: { flex: 1, color: StoreColors.text },
  errorText: { color: StoreColors.danger },
  checkoutButton: { width: '100%' },
});
