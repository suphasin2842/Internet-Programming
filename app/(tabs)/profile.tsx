import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function CartScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="cart-outline" size={80} color="#4C9A2A" />
      <Text style={styles.text}>หน้าโปรไฟล์ (Mockup)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E9' },
  text: { fontSize: 18, color: '#2E4F4F', marginTop: 10, fontWeight: 'bold' }
});