import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';

import { styles } from './cart-checkbox.styles';

import { Palette } from '@/constants/theme';

interface CartCheckboxProps {
  checked: boolean;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function CartCheckbox({
  checked,
  onPress,
  size = 22,
  disabled = false,
  accessibilityLabel = 'Select',
}: CartCheckboxProps) {
  return (
    <TouchableOpacity
      style={[
        styles.box,
        { width: size, height: size },
        checked ? styles.boxChecked : styles.boxUnchecked,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessible={true}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
    >
      {checked && <Check size={Math.round(size * 0.6)} color={Palette.white} strokeWidth={3} />}
    </TouchableOpacity>
  );
}
