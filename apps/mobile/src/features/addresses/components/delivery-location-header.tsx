import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';

import { styles } from './delivery-location-picker.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface DeliveryLocationHeaderProps {
  title: string;
  error?: string;
  canGoBack: boolean;
  backLabel: string;
  onBack: () => void;
  onClose: () => void;
}

export function DeliveryLocationHeader({
  title,
  error,
  canGoBack,
  backLabel,
  onBack,
  onClose,
}: DeliveryLocationHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={`Back to ${backLabel}`}
          >
            <ChevronLeft size={18} color={Palette.gray600} />
            <ThemedText style={styles.backButtonText}>{backLabel}</ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close location picker"
          style={styles.closeButton}
        >
          <X size={20} color={Palette.gray900} />
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
    </View>
  );
}
