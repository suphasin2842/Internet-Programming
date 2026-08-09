import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { StoreColors } from '@/constants/store-theme';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const [isHydrated, setIsHydrated] = useState(false);
  const isDesktop = isHydrated && width >= 900;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: StoreColors.ink,
              borderTopColor: StoreColors.ink,
              borderTopWidth: 2,
              height: 68,
              paddingTop: 6,
              paddingBottom: 7,
            },
        tabBarActiveTintColor: StoreColors.electric,
        tabBarInactiveTintColor: '#D7EEE7',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'หมวดหมู่',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'ตะกร้า',
          tabBarIcon: ({ color }) => <Ionicons name="cart-outline" size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={23} color={color} />,
        }}
      />
    </Tabs>
  );
}
