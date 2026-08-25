import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronRight, MapPin, MoreHorizontal, X } from 'lucide-react-native';

import { CartCheckbox } from './cart-checkbox';
import { styles } from './cart-header.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface CartHeaderProps {
  itemCount: number;
  isAllSelected: boolean;
  onToggleAll: () => void;
  variant: 'page' | 'sheet';
  shipTo?: string;
  onClose?: () => void;
  onMore?: () => void;
}

export function CartHeader({
  itemCount,
  isAllSelected,
  onToggleAll,
  variant,
  shipTo = 'Kathmandu',
  onClose,
  onMore,
}: CartHeaderProps) {
  const titleGroup = (
    <View style={styles.titleGroup}>
      <ThemedText style={styles.title}>Cart</ThemedText>
      <ThemedText style={styles.count}>({itemCount})</ThemedText>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        <CartCheckbox
          checked={isAllSelected}
          onPress={onToggleAll}
          accessibilityLabel="Select all items"
        />
        <ThemedText style={styles.allLabel}>All</ThemedText>
      </View>

      {variant === 'page' ? (
        <>
          <View style={styles.verticalDivider} />
          {titleGroup}
          <View style={styles.shipToGroup}>
            <MapPin size={14} color={Palette.gray600} />
            <ThemedText style={styles.shipToText} numberOfLines={1}>
              Ship to {shipTo}
            </ThemedText>
            <ChevronRight size={14} color={Palette.gray400} />
          </View>
          <View style={styles.spacer} />
          {onMore ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onMore}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Cart options"
            >
              <MoreHorizontal size={20} color={Palette.gray900} />
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.sheetTitleAbsolute} pointerEvents="none">
            {titleGroup}
          </View>
          <View style={styles.spacer} />
          {onClose ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close cart"
            >
              <X size={22} color={Palette.gray900} />
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}
