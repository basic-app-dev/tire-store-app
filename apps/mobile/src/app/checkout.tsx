import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, ShieldCheck, Check } from 'lucide-react-native';

export default function MobileCheckoutScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Select Bay Slot</Text>
        <Text style={styles.storeName}>Austin Downtown Flagship (Bay 3: 3D Alignment)</Text>

        <View style={styles.slotsGrid}>
          {['09:00 AM', '10:00 AM', '01:00 PM', '02:30 PM'].map((slot, i) => (
            <TouchableOpacity
              key={slot}
              style={[styles.slotItem, i === 1 && styles.slotSelected]}
            >
              <Text style={[styles.slotText, i === 1 && styles.slotTextSelected]}>
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.durationNotice}>
          <Clock size={14} color="#38bdf8" />
          <Text style={styles.durationText}>
            Dynamic Bay Duration: 90 mins (Mount, Road Force Balance & 3D Alignment)
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>4x Michelin CrossClimate 2 (235/45R18)</Text>
          <Text style={styles.summaryValue}>$995.96</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mount, Balance & 3D Laser Alignment</Text>
          <Text style={styles.summaryValue}>$209.99</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax & Disposal</Text>
          <Text style={styles.summaryValue}>$112.48</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>$1,318.43</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={() => router.replace('/(tabs)/appointments')}
      >
        <ShieldCheck size={18} color="#ffffff" />
        <Text style={styles.payBtnText}>Pay & Lock Bay Reservation</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d13' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  storeName: { color: '#8b949e', fontSize: 12 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  slotItem: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  slotSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d30',
  },
  slotText: { color: '#8b949e', fontSize: 13, fontWeight: '600' },
  slotTextSelected: { color: '#ffffff', fontWeight: '700' },
  durationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0369a120',
    padding: 10,
    borderRadius: 8,
  },
  durationText: { color: '#38bdf8', fontSize: 11, flex: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  summaryLabel: { color: '#8b949e', fontSize: 12 },
  summaryValue: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#21262d',
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  totalValue: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  payBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  payBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});

