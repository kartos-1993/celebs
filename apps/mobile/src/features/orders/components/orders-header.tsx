import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { styles } from '../styles/orders.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export function OrdersHeader({ paddingTop }: { paddingTop: number }) {
  const router = useRouter();
  return (
    <View style={[styles.headerBar, { paddingTop }]}>
      <TouchableOpacity
        style={styles.headerIconSlot}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={Palette.gray900} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
      <View style={styles.headerIconSlot} />
    </View>
  );
}
