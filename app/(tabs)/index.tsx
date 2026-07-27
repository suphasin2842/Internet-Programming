import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// ----------------------------------------------------
// 1. เปลี่ยน URL มาดึงข้อมูลจาก Cloud API ของคุณ (ใช้ Port 3045)
// ----------------------------------------------------
const PRODUCTS_URL = 'http://119.59.102.161:3045/api/products';

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  
  const [products, setProducts] = useState<any[]>([]);
  const [showSort, setShowSort] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ----------------------------------------------------
  // 2. ฟังก์ชัน Fetch ข้อมูลจาก Database
  // ----------------------------------------------------
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch(PRODUCTS_URL);
        const data = await response.json();
        setProducts(data); // นำข้อมูล JSON ที่ได้จาก DB มาเก็บลง State
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false); // ปิดตัวโหลดดิ้งเมื่อดึงข้อมูลเสร็จ
      }
    }
    loadProducts();
  }, []);

  // ฟังก์ชันเรียงราคา (แปลงค่า price จาก DB ให้เป็นตัวเลขก่อนนำมาคำนวณ)
  const sortPrices = (type: 'asc' | 'desc') => {
    const sorted = [...products].sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      return type === 'asc' ? priceA - priceB : priceB - priceA;
    });
    setProducts(sorted);
    setShowSort(false);
  };

  // ----------------------------------------------------
  // 3. คอมโพเนนต์แสดงการ์ดสินค้า (เปลี่ยนชื่อตัวแปรให้ตรงกับตารางใหม่)
  // ----------------------------------------------------
  const renderProduct = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => router.push({
        pathname: '/product/[id]' as any,
        params: { id: item.id }
      })}
    >
      {/* ใช้ item.image_url แทน item.image */}
      <Image source={{ uri: item.image_url }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        {/* ใช้ item.product_name แทน item.name */}
        <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
        <Text style={styles.productPrice}>฿{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* เครื่องมือค้นหา & เพิ่มสินค้า */}
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

      {/* ฟีเจอร์: ปุ่มกดคัดเรียงราคา */}
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

      {/* แสดงผลรายการสินค้า */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4C9A2A" />
          <Text style={styles.loadingText}>กำลังโหลดตุ๊กตาลิงจาก Cloud...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
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
  productImage: { width: '100%', height: 150, resizeMode: 'cover' },
  productInfo: { padding: 10, backgroundColor: '#F1F8E9' },
  productName: { fontSize: 16, color: '#2E4F4F', fontWeight: 'bold' },
  productPrice: { fontSize: 14, color: '#8B5A2B', marginTop: 5 },
});