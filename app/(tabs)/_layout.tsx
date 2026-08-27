// Layout ของหน้าร้าน: Desktop ใช้ Sidebar ส่วนมือถือใช้ Bottom Tabs
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useCart } from '@/components/cart-provider';
import { UserSidebar } from '@/components/user-sidebar';
import { StoreIcon } from '@/components/ui/store-icon';
import { StoreColors, StoreFonts, StoreShadows } from '@/constants/store-theme';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const { itemCount } = useCart();
  const [isHydrated, setIsHydrated] = useState(false);
  const isDesktop = isHydrated && width >= 900;

  useEffect(() => setIsHydrated(true), []);

  // รอให้ขนาดหน้าจอ Hydrate ก่อน เพื่อกัน HTML ฝั่งเว็บไม่ตรงกับ Client
  return (
    <View style={styles.layout}>
      {isDesktop && <UserSidebar />}
      <View style={styles.tabContent}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: isDesktop
            ? { display: 'none' }
            : {
                backgroundColor: StoreColors.surface,
                borderTopColor: '#DCE9E1',
                borderTopWidth: 1,
                height: 72,
                paddingTop: 7,
                paddingBottom: 8,
                boxShadow: StoreShadows.raised,
              },
          tabBarActiveTintColor: StoreColors.primary,
          tabBarInactiveTintColor: StoreColors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontFamily: StoreFonts.semibold },
          tabBarBadgeStyle: { backgroundColor: StoreColors.accent, color: StoreColors.white, fontFamily: StoreFonts.bold },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'หน้าหลัก',
            tabBarIcon: ({ color }) => <StoreIcon name="home-outline" size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            title: 'หมวดหมู่',
            tabBarIcon: ({ color }) => <StoreIcon name="grid-outline" size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'ตะกร้า',
            tabBarBadge: itemCount > 0 ? itemCount : undefined,
            tabBarIcon: ({ color }) => <StoreIcon name="cart-outline" size={23} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'โปรไฟล์',
            tabBarIcon: ({ color }) => <StoreIcon name="person-outline" size={23} color={color} />,
          }}
        />
      </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row', backgroundColor: StoreColors.background },
  tabContent: { flex: 1 },
});
