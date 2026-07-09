import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const initialProducts = [
  { id: '1', name: 'Monkey Doll', price: 2500, image: 'https://i5.walmartimages.com/seo/Realistic-Monkey-Doll-16-inches-Animal-Soft_138da632-b523-45a0-a698-14057660a631.7266d28f600ca50bde545e75d8199e7c.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
  { id: '2', name: 'proboscis monkey doll', price: 1200, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkYe5tIV9v-WecJrXJdFfoC2s5SQeVt5dJdICUj0FczBkXHpNaTo38Fes&s=10' },
  { id: '3', name: 'orangutan doll', price: 1290, image: 'https://www.ikea.com/th/en/images/products/djungelskog-soft-toy-orangutan__0710167_pe727369_s5.jpg?f=s' },
  { id: '4', name: 'gorilla doll', price: 990, image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTpfly6QeBJK8WFqCRPQEwzt8EKil-UnBxXwYbIKnr5tL0GeoMynoUedxc&s=10' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState(initialProducts);
  
  // ✅ สร้าง State สำหรับเปิด/ปิดกล่องจัดเรียง
  const [showSort, setShowSort] = useState(false);

  const sortPrices = (type: 'asc' | 'desc') => {
    const sorted = [...products].sort((a, b) => {
      return type === 'asc' ? a.price - b.price : b.price - a.price;
    });
    setProducts(sorted);
    setShowSort(false); // กดเลือกเสร็จแล้วให้ปิดกล่อง
  };

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
      {/* 1. ค้นหา & เพิ่มสินค้า */}
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

      {/* 2. ฟีเจอร์: ปุ่มกดเพื่อโชว์กล่องคัดเรียงราคา */}
      <View style={styles.filterSection}>
        <TouchableOpacity 
          style={styles.sortToggleButton} 
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="filter" size={16} color="#FFF" />
          <Text style={styles.sortToggleText}>จัดเรียงสินค้า</Text>
          <Ionicons name={showSort ? "chevron-up" : "chevron-down"} size={16} color="#FFF" />
        </TouchableOpacity>

        {/* กล่องจะโชว์ก็ต่อเมื่อ showSort เป็น true */}
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
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  toolsRow: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', backgroundColor: '#C8E6C9', borderRadius: 25, paddingHorizontal: 15, alignItems: 'center', height: 45, marginRight: 10 },
  searchInput: { flex: 1, marginLeft: 10, color: '#2E4F4F', fontSize: 16 },
  addButton: { backgroundColor: '#8B5A2B', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  
  // สไตล์สำหรับปุ่มจัดเรียงและกล่อง Dropdown
  filterSection: { paddingHorizontal: 15, marginBottom: 10, zIndex: 10 },
  sortToggleButton: { flexDirection: 'row', backgroundColor: '#4C9A2A', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, alignSelf: 'flex-start', alignItems: 'center', gap: 5 },
  sortToggleText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  dropdownBox: { backgroundColor: '#FFF', marginTop: 5, borderRadius: 10, padding: 5, width: 150, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  dropdownItem: { padding: 10 },
  dropdownText: { color: '#2E4F4F', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginHorizontal: 5 },

  productList: { paddingHorizontal: 10, paddingBottom: 20 },
  productCard: { flex: 1, backgroundColor: '#FFF', margin: 5, borderRadius: 15, overflow: 'hidden', elevation: 3 },
  productImage: { width: '100%', height: 150 },
  productInfo: { padding: 10, backgroundColor: '#F1F8E9' },
  productName: { fontSize: 16, color: '#2E4F4F', fontWeight: 'bold' },
  productPrice: { fontSize: 14, color: '#8B5A2B', marginTop: 5 },
});