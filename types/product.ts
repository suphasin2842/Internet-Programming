// รูปแบบข้อมูลสินค้าที่ API และการ์ดสินค้าทั้งระบบใช้ร่วมกัน
export type Product = {
  id: string | number;
  product_name: string;
  description?: string | null;
  price: string | number;
  image_url: string;
  sku?: string | null;
  category?: string | null;
};

export function formatProductPrice(price: Product['price']) {
  const value = Number(price);
  return `${Number.isFinite(value) ? value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : price} THB`;
}

export const CATEGORY_META = {
  Jungle: { icon: 'leaf' as const, color: '#BDFC4D', label: 'Jungle' },
  Space: { icon: 'rocket' as const, color: '#E9E1FF', label: 'Space' },
  Robot: { icon: 'hardware-chip' as const, color: '#FFE3D1', label: 'Robot' },
  Other: { icon: 'sparkles' as const, color: '#FFF2B8', label: 'อื่นๆ' },
} as const;

export function getCategoryMeta(category: string) {
  return CATEGORY_META[category as keyof typeof CATEGORY_META] ?? {
    icon: 'pricetag' as const,
    color: '#ECF7F0',
    label: category,
  };
}
