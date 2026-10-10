import React from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { TextInput, type TextInputProps } from 'react-native';

import { styles } from './address-form-sheet.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export interface ControlledInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: FieldPath<T>;
  error?: string;
  multiline?: boolean;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  error,
  style,
  multiline,
  ...rest
}: ControlledInputProps<T>) {
  return (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={[styles.input, multiline && styles.multilineInput, style]}
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholderTextColor={Palette.gray400}
            multiline={multiline}
            {...rest}
          />
        )}
      />
      {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
    </>
  );
}
