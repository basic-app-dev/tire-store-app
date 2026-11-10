import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Scan, X } from 'lucide-react-native';

export default function ScanVinModal() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.reticle}>
          <Scan size={80} color="#ef4444" strokeWidth={1.5} />
        </View>
        <Text style={styles.instructions}>
          Position the 17-digit VIN barcode or tire sidewall spec within the viewfinder.
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.simulateBtn}
          onPress={() => {
            // Simulate reading 2024 Toyota Camry VIN
            router.replace('/(tabs)/catalog');
          }}
        >
          <Camera size={18} color="#ffffff" />
          <Text style={styles.simulateText}>Simulate VIN Scan (2024 Camry)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between', padding: 24 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reticle: {
    width: 260,
    height: 180,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff0a',
  },
  instructions: {
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 260,
    lineHeight: 18,
  },
  controls: { gap: 12 },
  simulateBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  simulateText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  closeBtn: { padding: 12, alignItems: 'center' },
  closeText: { color: '#8b949e', fontSize: 14, fontWeight: '600' },
});

