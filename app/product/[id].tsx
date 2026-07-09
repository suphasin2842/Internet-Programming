import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProductDetailScreen() {
  // รับ ID จาก Router
  const { id } = useLocalSearchParams();

  // จำลองการดึงข้อมูลจาก ID
  const product = {
    id,
    name: 'สินค้าจากพงไพร',
    price: 999,
    image: 'https://picsum.photos/400',
    description: 'รายละเอียดสินค้าชิ้นนี้... สกัดจากธรรมชาติ 100% เหมาะสำหรับการเดินทางในป่าใหญ่ ทนทาน ใช้งานได้ยาวนาน พร้อมรับทุกสภาพอากาศ',
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: product.image }} style={styles.image} />
      
      <View style={styles.detailsContainer}>
        <Text style={styles.name}>{product.name} (รหัส: {id})</Text>
        <Text style={styles.price}>฿{product.price}</Text>
        
        <Text style={styles.sectionTitle}>ข้อมูลเพิ่มเติม</Text>
        <Text style={styles.description}>{product.description}</Text>
      </View>

      {/* ---------------------------------------- */}
      {/* ปุ่มซื้อของ (Buy Button) */}
      {/* ---------------------------------------- */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.buyButton}>
          <Text style={styles.buyText}>ซื้อสินค้าชิ้นนี้</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  image: {
    width: '100%',
    height: 300,
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20, // ดึงเนื้อหาขึ้นมาทับรูปนิดหน่อยให้ดูมีมิติ
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E4F4F',
  },
  price: {
    fontSize: 22,
    color: '#8B5A2B',
    marginVertical: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4C9A2A',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  bottomBar: {
    padding: 20,
    marginTop: 20,
  },
  buyButton: {
    backgroundColor: '#4C9A2A', // สีเขียวใบไม้สด
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buyText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});