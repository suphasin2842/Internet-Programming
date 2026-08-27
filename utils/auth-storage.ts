// Native เก็บ Token ใน SecureStore เพื่อไม่เก็บข้อมูล Login แบบเปิดเผย
import * as SecureStore from 'expo-secure-store';

export const authStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
