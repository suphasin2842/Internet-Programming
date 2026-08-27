// Native ติดตั้ง localStorage adapter ของ Expo SQLite ให้ CartProvider ใช้ได้
import 'expo-sqlite/localStorage/install';

export const cartStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};
