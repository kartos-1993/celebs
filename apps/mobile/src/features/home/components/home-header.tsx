import React from 'react';
import { View } from 'react-native';
import { Bell, Search, ShoppingBag } from 'lucide-react-native';

import { styles } from '../styles/home.styles';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface HomeHeaderProps {
  topOffset: number;
}

export function HomeHeader({ topOffset }: HomeHeaderProps) {
  return (
    <View style={[styles.floatingHeader, { top: topOffset }]}>
      <View style={styles.headerGlassButton}>
        <Search size={18} color="#ffffff" />
      </View>
      <ThemedText style={styles.headerLogo}>CELEBS</ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <View style={styles.headerGlassButton}>
          <Bell size={18} color="#ffffff" />
        </View>
        <View style={styles.headerGlassButton}>
          <ShoppingBag size={18} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}
