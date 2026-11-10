import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Shield, ArrowRight } from 'lucide-react-native';

const TIRES = [
  {
    id: '1',
    brand: 'Michelin',
    model: 'CrossClimate 2',
    size: '235/45R18',
    price: '$248.99',
    warranty: '60,000 mi',
    badge: 'All-Season',
  },
  {
    id: '2',
    brand: 'Michelin',
    model: 'Defender 2',
    size: '215/50R17',
    price: '$198.99',
    warranty: '80,000 mi',
    badge: 'High Mileage',
  },
  {
    id: '3',
    brand: 'Continental',
    model: 'ExtremeContact DWS06 Plus',
    size: '235/40R19',
    price: '$265.99',
    warranty: '50,000 mi',
    badge: 'Ultra High Perf',
  },
  {
    id: '4',
    brand: 'Bridgestone',
    model: 'Turanza QuietTrack',
    size: '225/45R18',
    price: '$229.99',
    warranty: '80,000 mi',
    badge: 'Touring Quiet',
  },
];

export default function MobileCatalogScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <FlatList
        data={TIRES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
              <Text style={styles.warranty}>{item.warranty}</Text>
            </View>

            <Text style={styles.brand}>{item.brand}</Text>
            <Text style={styles.model}>{item.model}</Text>
            <Text style={styles.specs}>{item.size}</Text>

            <View style={styles.footer}>
              <View>
                <Text style={styles.priceLabel}>Price per tire</Text>
                <Text style={styles.price}>{item.price}</Text>
              </View>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push('/checkout')}
              >
                <Text style={styles.bookButtonText}>Select & Book</Text>
                <ArrowRight size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
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
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: {
    backgroundColor: '#7f1d1d40',
    borderColor: '#ef444450',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { color: '#f87171', fontSize: 10, fontWeight: '700' },
  warranty: { color: '#8b949e', fontSize: 11 },
  brand: { color: '#8b949e', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  model: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  specs: { color: '#cbd5e1', fontSize: 13, marginTop: 4, fontFamily: 'monospace' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  priceLabel: { color: '#8b949e', fontSize: 10 },
  price: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});

