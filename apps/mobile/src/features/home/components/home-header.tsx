import React from 'react';
import { View } from 'react-native';
import { Bell, Search, ShoppingBag } from 'lucide-react-native';

import { styles as homeStyles } from '../styles/home.styles';

import { styles } from './home-header.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface HomeHeaderProps {
  topOffset: number;
}

export function HomeHeader({ topOffset }: HomeHeaderProps) {
  return (
    <View style={[homeStyles.floatingHeader, { top: topOffset }]}>
      <View style={homeStyles.headerGlassButton}>
        <Search size={18} color={Palette.white} />
      </View>
      <ThemedText style={homeStyles.headerLogo}>CELEBS</ThemedText>
      <View style={styles.actionsRow}>
        <View style={homeStyles.headerGlassButton}>
          <Bell size={18} color={Palette.white} />
        </View>
        <View style={homeStyles.headerGlassButton}>
          <ShoppingBag size={18} color={Palette.white} />
        </View>
      </View>
    </View>
  );
}
