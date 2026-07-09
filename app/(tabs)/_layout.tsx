import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Alert, TouchableOpacity } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#2E4F4F', elevation: 0 },
        headerTintColor: '#E8F5E9',
        headerTitleAlign: 'center',
        
        headerLeft: () => (
          <TouchableOpacity 
            style={{ marginLeft: 15 }} 
            onPress={() => Alert.alert('เมนู', 'ฟังก์ชันนี้จะเปิดแถบเมนูด้านข้าง')}
          >
            <Ionicons name="menu" size={28} color="#E8F5E9" />
          </TouchableOpacity>
        ),
        
        headerRight: () => (
          <TouchableOpacity 
            style={{ marginRight: 15 }}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="person-circle-outline" size={28} color="#E8F5E9" />
          </TouchableOpacity>
        ),
        
        tabBarStyle: { backgroundColor: '#1C3131', borderTopColor: '#4C9A2A', height: 60, paddingBottom: 5 },
        tabBarActiveTintColor: '#8B5A2B',
        tabBarInactiveTintColor: '#6b8e23',
      }}>
      
      {/* แท็บที่ 1: หน้าหลัก */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก', 
          tabBarLabel: 'ร้านค้า',
          tabBarIcon: ({ color }) => <Ionicons name="leaf" size={24} color={color} />,
        }}
      />
      
      {/* แท็บที่ 2: ตะกร้า (ต้องมีไฟล์ cart.tsx) */}
      <Tabs.Screen
        name="cart"
        options={{
          title: 'ตะกร้าของป่า',
          tabBarLabel: 'ตะกร้า',
          tabBarIcon: ({ color }) => <Ionicons name="cart" size={24} color={color} />,
        }}
      />

      {/* แท็บที่ 3: แจ้งเตือน (ต้องมีไฟล์ notifications.tsx) */}
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'การแจ้งเตือน',
          tabBarLabel: 'แจ้งเตือน',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
        }}
      />

      {/* แท็บที่ 4: โปรไฟล์ (ต้องมีไฟล์ profile.tsx) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'บัญชีของฉัน',
          tabBarLabel: 'โปรไฟล์',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}