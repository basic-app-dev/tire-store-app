import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MapPin, Navigation, Phone, Wrench } from 'lucide-react-native';

const STORES = [
  {
    id: 'store-1',
    name: 'Austin Downtown Flagship',
    code: 'ATX-001',
    address: '500 E 7th St, Austin, TX 78701',
    distance: '2.4 mi',
    bays: '4 Bays (3D Alignment Rack)',
    phone: '(512) 555-0142',
  },
  {
    id: 'store-2',
    name: 'Dallas North Park Branch',
    code: 'DAL-002',
    address: '8687 N Central Expy, Dallas, TX 75225',
    distance: '188 mi',
    bays: '3 Bays (Express Mount)',
    phone: '(214) 555-0198',
  },
];

export default function MobileStoresScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={STORES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.distanceBadge}>
                <Navigation size={12} color="#38bdf8" />
                <Text style={styles.distanceText}>{item.distance}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <MapPin size={14} color="#ef4444" />
              <Text style={styles.address}>{item.address}</Text>
            </View>

            <View style={styles.row}>
              <Wrench size={14} color="#f59e0b" />
              <Text style={styles.bays}>{item.bays}</Text>
            </View>

            <View style={styles.row}>
              <Phone size={14} color="#8b949e" />
              <Text style={styles.phone}>{item.phone}</Text>
            </View>

            <TouchableOpacity style={styles.selectBtn}>
              <Text style={styles.selectBtnText}>Reserve Bay at this Store</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d13' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0369a130',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distanceText: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  address: { color: '#cbd5e1', fontSize: 12 },
  bays: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  phone: { color: '#8b949e', fontSize: 12 },
  selectBtn: {
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  selectBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});

