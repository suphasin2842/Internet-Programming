import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export default function NotificationsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' }}>
      <Ionicons name="notifications-outline" size={80} color="#4C9A2A" />
      <Text style={{ fontSize: 18, color: '#2E4F4F', marginTop: 10, fontWeight: 'bold' }}>หน้าการแจ้งเตือน</Text>
    </View>
  );
}