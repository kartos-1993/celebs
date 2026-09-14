import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { styles } from '../styles/review-modal.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ReviewModalHeaderProps {
  onClose: () => void;
}

export function ReviewModalHeader({ onClose }: ReviewModalHeaderProps) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.sheetTitle}>Review Purchase</ThemedText>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close review dialog"
        >
          <X size={20} color={Palette.gray700} />
        </TouchableOpacity>
      </View>

      <View style={styles.policyBanner}>
        <ThemedText style={styles.policyText}>
          Honest reviews help our community! Share your fit and photos.
        </ThemedText>
      </View>
    </View>
  );
}
