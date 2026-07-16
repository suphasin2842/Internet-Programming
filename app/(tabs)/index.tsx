import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ----------------------------------------------------
// 1. นำ URL แบบ Raw จาก GitHub ของคุณมาใส่ตรงนี้
// ----------------------------------------------------
const PRODUCTS_URL = 'https://raw.githubusercontent.com/suphasin2842/Internet-Programming/refs/heads/main/products.json';

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  
  // 2. ตั้งค่า State สำหรับเก็บข้อมูลสินค้า โดยเริ่มจาก Array ว่างๆ []
  const [products, setProducts] = useState<any[]>([]);
  const [showSort, setShowSort] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // ตัวแปรสำหรับเช็กสถานะกำลังโหลด

  // ----------------------------------------------------
  // 3. ใช้ useEffect เพื่อทำการ Fetch ข้อมูลเมื่อเปิดหน้านี้ขึ้นมา
  // ----------------------------------------------------
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(PRODUCTS_URL);
        const data = await response.json();
        setProducts(data); // นำข้อมูล JSON มาเก็บลง State
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false); // ปิดตัวโหลดดิ้งเมื่อดึงข้อมูลเสร็จ
      }
    }
    loadProducts();
  }, []);

  // ฟังก์ชันเรียงราคา
  const sortPrices = (type: 'asc' | 'desc') => {
    const sorted = [...products].sort((a, b) => {
      return type === 'asc' ? a.price - b.price : b.price - a.price;
    });
    setProducts(sorted);
    setShowSort(false); // กดเลือกเสร็จแล้วให้ปิดกล่อง
  };

  // คอมโพเนนต์แสดงการ์ดสินค้า
  const renderProduct = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => router.push({
        pathname: '/product/[id]' as any,
        params: { id: item.id }
      })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productPrice}>฿{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 1. เครื่องมือค้นหา & เพิ่มสินค้า */}
      <View style={styles.toolsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8B5A2B" />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาสิ่งของ..."
            placeholderTextColor="#7b9e7b"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => alert('เปิดหน้าเพิ่มสินค้า')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 2. ฟีเจอร์: ปุ่มกดคัดเรียงราคา */}
      <View style={styles.filterSection}>
        <TouchableOpacity 
          style={styles.sortToggleButton} 
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="filter" size={16} color="#FFF" />
          <Text style={styles.sortToggleText}>จัดเรียงสินค้า</Text>
          <Ionicons name={showSort ? "chevron-up" : "chevron-down"} size={16} color="#FFF" />
        </TouchableOpacity>

        {showSort && (
          <View style={styles.dropdownBox}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => sortPrices('asc')}>
              <Text style={styles.dropdownText}>ราคาน้อย ➔ มาก</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={() => sortPrices('desc')}>
              <Text style={styles.dropdownText}>ราคามาก ➔ น้อย</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. รายการสินค้า */}
      {/* ถ้ากำลังโหลด ให้โชว์ตัวหมุน ถ้าโหลดเสร็จแล้ว ให้โชว์ตารางสินค้า */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4C9A2A" />
          <Text style={styles.loadingText}>กำลังโหลดตุ๊กตาลิง...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  toolsRow: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#C8E6C9', borderRadius: 25, paddingHorizontal: 15, alignItems: 'center', height: 45, marginRight: 10 },
  searchInput: { flex: 1, marginLeft: 10, color: '#2E4F4F', fontSize: 16 },
  addButton: { backgroundColor: '#8B5A2B', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  
  filterSection: { paddingHorizontal: 15, marginBottom: 10, zIndex: 10 },
  sortToggleButton: { flexDirection: 'row', backgroundColor: '#4C9A2A', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, alignSelf: 'flex-start', alignItems: 'center', gap: 5 },
  sortToggleText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  dropdownBox: { backgroundColor: '#FFF', marginTop: 5, borderRadius: 10, padding: 5, width: 150, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  dropdownItem: { padding: 10 },
  dropdownText: { color: '#2E4F4F', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginHorizontal: 5 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#4C9A2A', marginTop: 10, fontSize: 16, fontWeight: 'bold' },

  productList: { paddingHorizontal: 10, paddingBottom: 20 },
  productCard: { flex: 1, backgroundColor: '#FFF', margin: 5, borderRadius: 15, overflow: 'hidden', elevation: 3 },
  productImage: { width: '100%', height: 150 },
  productInfo: { padding: 10, backgroundColor: '#F1F8E9' },
  productName: { fontSize: 16, color: '#2E4F4F', fontWeight: 'bold' },
  productPrice: { fontSize: 14, color: '#8B5A2B', marginTop: 5 },
});