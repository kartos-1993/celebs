import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import { styles } from './app-header.styles';

import { ThemedText } from '@/components/themed-text';

export const SUB_TABS = ['All', 'Women', 'Men', 'Kids', 'Curve', 'Home'] as const;

interface AppHeaderSubTabsProps {
  activeSubTab: string;
  onSelectSubTab: (tab: string) => void;
  textColor: string;
  secondaryTextColor: string;
}

export function AppHeaderSubTabs({
  activeSubTab,
  onSelectSubTab,
  textColor,
  secondaryTextColor,
}: AppHeaderSubTabsProps) {
  return (
    <View style={styles.subHeaderContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subScrollContent}
      >
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.subTabButton, isActive && { borderBottomColor: textColor }]}
              activeOpacity={0.7}
              onPress={() => onSelectSubTab(tab)}
            >
              <ThemedText
                maxFontSizeMultiplier={1.15}
                style={[
                  styles.subTabText,
                  isActive && styles.subTabActiveText,
                  isActive ? { color: textColor } : { color: secondaryTextColor },
                ]}
              >
                {tab}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
