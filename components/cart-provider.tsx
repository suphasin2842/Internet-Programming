// CartProvider ดูแลตะกร้าและแยกข้อมูลตาม Guest/User/Admin ไม่ให้ตะกร้าปนกัน
import { createContext, PropsWithChildren, use, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { cartStorage } from '@/utils/cart-storage';

export type CartProduct = {
  id: string | number;
  product_name: string;
  price: string | number;
  image_url: string;
  sku?: string;
};

export type CartItem = CartProduct & { quantity: number };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addItem: (product: CartProduct) => void;
  decreaseItem: (productId: CartProduct['id']) => void;
  removeItem: (productId: CartProduct['id']) => void;
  clearCart: () => void;
};

// ใช้ Prefix เดียวกัน แต่ต่อท้ายด้วย Scope ของบัญชี
const CART_STORAGE_PREFIX = 'pan-and-toys-cart-v2';
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const { isLoading: isAuthLoading, role, user, admin } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  // ถ้ายังเช็ก Login ไม่เสร็จให้รอก่อน ไม่งั้นอาจโหลดตะกร้าผิดบัญชี
  const storageScope = isAuthLoading
    ? null
    : role === 'user' && user
      ? `user:${user.id}`
      : role === 'admin' && admin
        ? `admin:${admin.username}`
        : 'guest';

  // โหลดตะกร้าของ Scope ปัจจุบันจาก Storage
  useEffect(() => {
    if (!storageScope) {
      setItems([]);
      setLoadedScope(null);
      return;
    }

    let isMounted = true;
    const storageKey = `${CART_STORAGE_PREFIX}:${storageScope}`;
    setItems([]);
    setLoadedScope(null);
    try {
      const storedCart = cartStorage.getItem(storageKey);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart) as CartItem[];
        if (Array.isArray(parsedCart) && isMounted) setItems(parsedCart);
      }
    } catch {
      cartStorage.removeItem(storageKey);
    } finally {
      if (isMounted) setLoadedScope(storageScope);
    }
    return () => { isMounted = false; };
  }, [storageScope]);

  // บันทึกทุกครั้งที่รายการในตะกร้าเปลี่ยน
  useEffect(() => {
    if (storageScope && loadedScope === storageScope) {
      cartStorage.setItem(`${CART_STORAGE_PREFIX}:${storageScope}`, JSON.stringify(items));
    }
  }, [items, loadedScope, storageScope]);

  // ฟังก์ชันเพิ่ม/ลด/ลบ/ล้างตะกร้าให้ทุกหน้าร้านเรียกใช้ชุดเดียวกัน
  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    addItem: (product) => setItems((currentItems) => {
      const exists = currentItems.some((item) => String(item.id) === String(product.id));
      if (!exists) return [...currentItems, { ...product, quantity: 1 }];
      return currentItems.map((item) => String(item.id) === String(product.id)
        ? { ...item, quantity: item.quantity + 1 }
        : item);
    }),
    decreaseItem: (productId) => setItems((currentItems) => currentItems
      .map((item) => String(item.id) === String(productId)
        ? { ...item, quantity: item.quantity - 1 }
        : item)
      .filter((item) => item.quantity > 0)),
    removeItem: (productId) => setItems((currentItems) =>
      currentItems.filter((item) => String(item.id) !== String(productId))),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const context = use(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
