import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Search, ShieldCheck, ArrowRight } from 'lucide-react-native';

export default function MobileHomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.banner}>
        <Text style={styles.badge}>PRECISION FITMENT</Text>
        <Text style={styles.title}>Find Tires For Your Vehicle</Text>
        <Text style={styles.subtitle}>
          OEM load ratings, rim diameters, and guaranteed bolt pattern fitment.
        </Text>
      </View>

      {/* Quick VIN Scan Action */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/scan-vin')}
      >
        <View style={styles.scanIconWrapper}>
          <Camera size={24} color="#ffffff" />
        </View>
        <View style={styles.scanTextWrapper}>
          <Text style={styles.scanTitle}>Instant VIN / Barcode Scan</Text>
          <Text style={styles.scanDesc}>Auto-detect tire specs from driver door jamb</Text>
        </View>
        <ArrowRight size={20} color="#8b949e" />
      </TouchableOpacity>

      {/* Manual Selection Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual Vehicle Selection</Text>

        <View style={styles.field}>
          <Text style={styles.label}>1. YEAR</Text>
          <View style={styles.pickerFake}>
            <Text style={styles.pickerValue}>2024</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>2. MAKE</Text>
          <View style={styles.pickerFake}>
            <Text style={styles.pickerValue}>Toyota</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>3. MODEL</Text>
          <View style={styles.pickerFake}>
            <Text style={styles.pickerValue}>Camry</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>4. TRIM & TIRE SPECS</Text>
          <View style={styles.pickerFake}>
            <Text style={styles.pickerValue}>LE (205/65R16 95H)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => router.push('/(tabs)/catalog')}
        >
          <Search size={18} color="#ffffff" />
          <Text style={styles.submitText}>Search Matching Tires</Text>
        </TouchableOpacity>
      </View>

      {/* Trust Footer */}
      <View style={styles.trustBox}>
        <ShieldCheck size={20} color="#10b981" />
        <Text style={styles.trustText}>
          NHTSA verified vehicle fitments & 100% money-back fitment guarantee.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d13' },
  content: { padding: 16, gap: 16 },
  banner: {
    backgroundColor: '#161b22',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  badge: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#8b949e', fontSize: 13, marginTop: 4, lineHeight: 18 },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  scanIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextWrapper: { flex: 1 },
  scanTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  scanDesc: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  card: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  field: { gap: 4 },
  label: { color: '#8b949e', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pickerFake: {
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#30363d',
    borderRadius: 8,
    padding: 12,
  },
  pickerValue: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  submitButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 6,
  },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  trustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#064e3b20',
    borderWidth: 1,
    borderColor: '#05966940',
    padding: 12,
    borderRadius: 12,
  },
  trustText: { color: '#34d399', fontSize: 12, flex: 1 },
});

