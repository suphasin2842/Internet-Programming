// Root Layout: โหลดฟอนต์, ครอบ Provider และประกาศ Stack ของทุกหน้า
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Mali_600SemiBold, Mali_700Bold } from '@expo-google-fonts/mali';
import { NotoSansThai_400Regular, NotoSansThai_500Medium, NotoSansThai_600SemiBold, NotoSansThai_700Bold } from '@expo-google-fonts/noto-sans-thai';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { CartProvider } from '@/components/cart-provider';
import { AuthProvider } from '@/components/auth-provider';
import { StoreColors, StoreFonts } from '@/constants/store-theme';

// ซ่อน Splash หลังฟอนต์พร้อม เพื่อไม่ให้หน้าแรกกระพริบ
void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [StoreFonts.display]: Mali_700Bold,
    [StoreFonts.heading]: Mali_600SemiBold,
    [StoreFonts.body]: NotoSansThai_400Regular,
    [StoreFonts.medium]: NotoSansThai_500Medium,
    [StoreFonts.semibold]: NotoSansThai_600SemiBold,
    [StoreFonts.bold]: NotoSansThai_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  // Web static exports already contain the route HTML. Rendering it immediately
  // keeps the server and first browser render identical while the font files load.
  if (Platform.OS !== 'web' && !fontsLoaded && !fontError) return null;

  const storeNavigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: StoreColors.primary,
      background: StoreColors.background,
      card: StoreColors.surface,
      text: StoreColors.text,
      border: '#DCE9E1',
    },
  };

  // Provider ชั้นนอกสุดทำให้ Auth และ Cart ใช้ร่วมกันได้ทุก Route
  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider value={storeNavigationTheme}>
        <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'เข้าสู่ระบบ', headerBackTitle: 'ร้านค้า' }} />
        <Stack.Screen name="admin" options={{ title: 'จัดการสินค้า', headerBackTitle: 'ร้านค้า' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" />
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
