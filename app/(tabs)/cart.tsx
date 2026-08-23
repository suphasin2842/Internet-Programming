import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { StoreColors, StoreRadii } from '@/constants/store-theme';

function formatPrice(price: number | string) {
  const value = Number(price);
  return `${Number.isFinite(value) ? value.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : price} THB`;
}

export default function CartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { items, itemCount, totalPrice, addItem, decreaseItem, removeItem, clearCart } = useCart();
  const { authFetch, isLoading: isAuthLoading, logout, role } = useAuth();
  const isDesktop = width >= 860;
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [orderError, setOrderError] = useState('');

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
        return;
      }
      if (!response.ok) throw new Error(data.error || 'สร้างคำสั่งซื้อไม่สำเร็จ');
      clearCart();
      setOrderMessage(`สร้างคำสั่งซื้อ #${data.order?.id ?? ''} แล้ว ตรวจสอบสถานะได้ที่โปรไฟล์`);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'สร้างคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, styles.contentWithSidebar]}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>ตะกร้าของฉัน</Text>
          <Text style={styles.subtitle}>{itemCount} ชิ้นในตะกร้า • ระบบจะจำรายการไว้บนอุปกรณ์นี้</Text>
        </View>
        {items.length > 0 && (
          <Pressable onPress={clearCart} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
            <Ionicons name="trash-outline" size={18} color={StoreColors.danger} />
            <Text style={styles.clearText}>ล้างตะกร้า</Text>
          </Pressable>
        )}
      </View>

      {!!orderMessage && (
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={27} color={StoreColors.jungleDark} />
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>สร้างคำสั่งซื้อสำเร็จ</Text>
            <Text selectable style={styles.successText}>{orderMessage}</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>ดูประวัติ</Text>
          </Pressable>
        </View>
      )}

      {isAuthLoading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator size="large" color={StoreColors.jungle} />
          <Text style={styles.emptyText}>กำลังตรวจสอบบัญชี...</Text>
        </View>
      ) : !role ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="lock-closed-outline" size={48} color={StoreColors.ink} /></View>
          <Text style={styles.emptyTitle}>เข้าสู่ระบบก่อนซื้อสินค้า</Text>
          <Text style={styles.emptyText}>คุณดูสินค้าได้ตามปกติ แต่ต้องเข้าสู่ระบบก่อนเพิ่มสินค้าและสร้างคำสั่งซื้อ</Text>
          <Pressable onPress={() => router.push({ pathname: '/login', params: { mode: 'user' } } as never)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Ionicons name="person-outline" size={20} color={StoreColors.ink} />
            <Text style={styles.primaryText}>เข้าสู่ระบบ User</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="cart-outline" size={52} color={StoreColors.ink} /></View>
          <Text style={styles.emptyTitle}>ตะกร้ายังว่างอยู่</Text>
          <Text style={styles.emptyText}>เลือกของเล่นที่ชอบ แล้วกด “เพิ่มลงตะกร้า” ได้เลย</Text>
          <Pressable onPress={() => router.push('/categories')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Ionicons name="grid-outline" size={20} color={StoreColors.ink} />
            <Text style={styles.primaryText}>เลือกซื้อสินค้า</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.cartLayout, isDesktop && styles.desktopLayout]}>
          <View style={styles.itemList}>
            {items.map((item) => (
              <Pressable
                key={String(item.id)}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.id) } })}
                style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}>
                <Image source={{ uri: item.image_url }} style={styles.itemImage} contentFit="cover" />
                <View style={styles.itemInfo}>
                  <Text numberOfLines={2} style={styles.itemName}>{item.product_name}</Text>
                  {!!item.sku && <Text selectable style={styles.sku}>SKU: {item.sku}</Text>}
                  <Text style={styles.itemPrice}>{formatPrice(Number(item.price) * item.quantity)}</Text>
                  <View style={styles.quantityRow}>
                    <Pressable
                      accessibilityLabel={`ลดจำนวน ${item.product_name}`}
                      onPress={(event) => { event.stopPropagation(); decreaseItem(item.id); }}
                      style={styles.quantityButton}>
                      <Ionicons name="remove" size={19} color={StoreColors.ink} />
                    </Pressable>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <Pressable
                      accessibilityLabel={`เพิ่มจำนวน ${item.product_name}`}
                      onPress={(event) => { event.stopPropagation(); addItem(item); }}
                      style={styles.quantityButton}>
                      <Ionicons name="add" size={19} color={StoreColors.ink} />
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel={`นำ ${item.product_name} ออกจากตะกร้า`}
                  onPress={(event) => { event.stopPropagation(); removeItem(item.id); }}
                  style={styles.removeButton}>
                  <Ionicons name="close" size={20} color={StoreColors.danger} />
                </Pressable>
              </Pressable>
            ))}
          </View>

          <View style={[styles.summaryCard, isDesktop && styles.desktopSummary]}>
            <Text style={styles.summaryTitle}>สรุปรายการ</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>จำนวนสินค้า</Text><Text style={styles.summaryValue}>{itemCount} ชิ้น</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>ค่าจัดส่ง</Text><Text style={styles.freeText}>ยังไม่คำนวณ</Text></View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>ยอดรวม</Text><Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text></View>
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={20} color={StoreColors.jungleDark} />
              <Text style={styles.noticeText}>คำสั่งซื้อจะถูกบันทึกใน Database ด้วยสถานะรอดำเนินการ</Text>
            </View>
            {!!orderError && <Text selectable style={styles.errorText}>{orderError}</Text>}
            {!!orderMessage && <Text selectable style={styles.successText}>{orderMessage}</Text>}
            <Pressable disabled={isOrdering} onPress={placeOrder} style={({ pressed }) => [styles.checkoutButton, pressed && styles.pressed, isOrdering && styles.disabledButton]}>
              {isOrdering ? <ActivityIndicator color={StoreColors.ink} /> : <Ionicons name="checkmark-circle-outline" size={19} color={StoreColors.ink} />}
              <Text style={styles.primaryText}>{isOrdering ? 'กำลังสร้างคำสั่งซื้อ...' : 'ยืนยันคำสั่งซื้อ'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: StoreColors.mint },
  content: { width: '100%', maxWidth: 1160, alignSelf: 'center', padding: 16, paddingBottom: 34, gap: 20 },
  contentWithSidebar: { paddingTop: 72 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  title: { color: StoreColors.ink, fontSize: 29, fontWeight: '900' },
  subtitle: { color: '#52615C', fontSize: 13, fontWeight: '600', paddingTop: 3 },
  clearButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: '#FFF2EF', borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  clearText: { color: StoreColors.danger, fontSize: 13, fontWeight: '800' },
  emptyCard: { minHeight: 430, alignItems: 'center', justifyContent: 'center', gap: 13, padding: 24, backgroundColor: StoreColors.white, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  emptyIcon: { width: 100, height: 100, borderRadius: StoreRadii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.orange, borderWidth: 3, borderColor: StoreColors.ink },
  emptyTitle: { color: StoreColors.ink, fontSize: 24, fontWeight: '900' },
  emptyText: { color: '#52615C', fontSize: 15, textAlign: 'center' },
  successCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium },
  successCopy: { flex: 1, gap: 3 },
  successTitle: { color: StoreColors.ink, fontSize: 15, fontWeight: '900' },
  cartLayout: { gap: 18 },
  desktopLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  itemList: { flex: 1, gap: 12 },
  itemCard: { minHeight: 140, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 11, backgroundColor: StoreColors.white, borderWidth: 2.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.medium, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  itemImage: { width: 112, height: 112, backgroundColor: StoreColors.mintMuted, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  itemInfo: { flex: 1, alignItems: 'flex-start', gap: 5 },
  itemName: { color: StoreColors.ink, fontSize: 17, fontWeight: '900' },
  sku: { color: '#64736C', fontSize: 12, fontWeight: '600' },
  itemPrice: { color: StoreColors.jungleDark, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 3 },
  quantityButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill },
  quantity: { minWidth: 20, color: StoreColors.ink, fontSize: 16, fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  removeButton: { alignSelf: 'flex-start', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2EF', borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.pill },
  summaryCard: { padding: 20, gap: 15, backgroundColor: StoreColors.lavender, borderWidth: 3, borderColor: StoreColors.ink, borderRadius: StoreRadii.large, boxShadow: `5px 5px 0 ${StoreColors.ink}` },
  desktopSummary: { width: 360 },
  summaryTitle: { color: StoreColors.ink, fontSize: 22, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summaryLabel: { color: '#52615C', fontSize: 14, fontWeight: '700' },
  summaryValue: { color: StoreColors.ink, fontSize: 15, fontWeight: '800' },
  freeText: { color: StoreColors.jungle, fontSize: 14, fontWeight: '800' },
  divider: { height: 2, backgroundColor: StoreColors.ink, opacity: 0.18 },
  totalLabel: { color: StoreColors.ink, fontSize: 18, fontWeight: '900' },
  totalValue: { color: StoreColors.ink, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 11, backgroundColor: StoreColors.mintSoft, borderWidth: 1.5, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  noticeText: { flex: 1, color: StoreColors.jungleDark, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small, boxShadow: `3px 3px 0 ${StoreColors.ink}` },
  checkoutButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: StoreColors.electric, borderWidth: 2, borderColor: StoreColors.ink, borderRadius: StoreRadii.small },
  disabledButton: { opacity: 0.45 },
  primaryText: { color: StoreColors.ink, fontSize: 15, fontWeight: '900' },
  errorText: { color: StoreColors.danger, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  successText: { color: StoreColors.jungleDark, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  pressed: { opacity: 0.86, transform: [{ translateX: 2 }, { translateY: 2 }] },
});
