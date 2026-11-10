import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Calendar, Clock, Wrench, CheckCircle2 } from 'lucide-react-native';

export default function MobileAppointmentsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>CONFIRMED</Text>
          </View>
          <Text style={styles.orderId}>Order #ORD-2024-891</Text>
        </View>

        <Text style={styles.storeName}>Austin Downtown Flagship</Text>
        <Text style={styles.bayName}>Bay 3 — Hawkeye Elite 3D Alignment</Text>

        <View style={styles.timeBox}>
          <Calendar size={14} color="#f87171" />
          <Text style={styles.timeText}>Today, Nov 9, 2024</Text>
          <Clock size={14} color="#f87171" style={{ marginLeft: 8 }} />
          <Text style={styles.timeText}>10:00 AM – 11:30 AM</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Vehicle:</Text>
          <Text style={styles.detailValue}>2024 Toyota Camry LE</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailValue}>4x Michelin CrossClimate 2 + 3D Alignment</Text>
        </View>

        <View style={styles.checkinBox}>
          <CheckCircle2 size={16} color="#10b981" />
          <Text style={styles.checkinText}>
            Service bay reserved via atomic lock. Present this screen upon drive-in.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d13' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { color: '#34d399', fontSize: 10, fontWeight: '800' },
  orderId: { color: '#8b949e', fontSize: 11, fontFamily: 'monospace' },
  storeName: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginTop: 4 },
  bayName: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  timeText: { color: '#cbd5e1', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  detailBox: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  detailLabel: { color: '#8b949e', fontSize: 12 },
  detailValue: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  checkinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064e3b20',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  checkinText: { color: '#34d399', fontSize: 11, flex: 1 },
});

