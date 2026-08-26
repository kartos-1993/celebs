import React, { useState } from 'react';
import { TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';

import { styles } from './password-input.styles';

import { Palette } from '@/constants/theme';

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * Shared password field: leading lock icon, secure entry,
 * and a show/hide visibility toggle. Use everywhere passwords are entered.
 */
export function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Password',
  ...textInputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Lock size={18} color={Palette.gray400} style={styles.leadingIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Palette.gray400}
        secureTextEntry={!visible}
        autoCapitalize="none"
        {...textInputProps}
      />
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setVisible((prev) => !prev)}
        activeOpacity={0.6}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <EyeOff size={18} color={Palette.gray500} />
        ) : (
          <Eye size={18} color={Palette.gray500} />
        )}
      </TouchableOpacity>
    </View>
  );
}
