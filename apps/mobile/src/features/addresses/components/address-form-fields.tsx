import React from 'react';
import {
  Control,
  Controller,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Switch, TextInput, type TextInputProps, TouchableOpacity, View } from 'react-native';

import type { AddressInput } from '@celebs/shared-types';

import { styles } from './address-form-sheet.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { ADDRESS_LABELS } from '@/features/addresses/types';

export type AddressFormValues = AddressInput;

interface ControlledInputProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: FieldPath<T>;
  error?: string;
  multiline?: boolean;
}

function ControlledInput<T extends FieldValues>({
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

interface AddressFormFieldsProps {
  control: Control<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
}

export function AddressFormFields({ control, errors }: AddressFormFieldsProps) {
  return (
    <>
      <ThemedText style={styles.fieldLabel}>Save As</ThemedText>
      <Controller
        control={control}
        name="label"
        render={({ field: { value, onChange } }) => (
          <View style={styles.chipSelectorRow}>
            {ADDRESS_LABELS.map((option) => {
              const isActive = value === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.chipOption, isActive && styles.chipOptionActive]}
                  onPress={() => onChange(option)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <ThemedText
                    style={[styles.chipOptionText, isActive && styles.chipOptionTextActive]}
                  >
                    {option}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      <ThemedText style={styles.sectionHint}>CONTACT</ThemedText>
      <ControlledInput
        control={control}
        name="fullName"
        placeholder="Recipient full name"
        autoComplete="name"
        error={errors.fullName?.message}
      />
      <ControlledInput
        control={control}
        name="phone"
        placeholder="Phone number (e.g. 9841234567)"
        keyboardType="phone-pad"
        maxLength={10}
        error={errors.phone?.message}
      />
      <ControlledInput
        control={control}
        name="altPhone"
        placeholder="Alternate phone (optional)"
        keyboardType="phone-pad"
        maxLength={10}
        error={errors.altPhone?.message}
      />

      <ThemedText style={styles.sectionHint}>DELIVERY ADDRESS</ThemedText>
      <View style={styles.rowGroup}>
        <ControlledInput
          control={control}
          name="province"
          placeholder="Province"
          style={styles.flexInput}
        />
        <ControlledInput
          control={control}
          name="district"
          placeholder="District"
          style={styles.flexInput}
        />
      </View>
      {(!!errors.province || !!errors.district) && (
        <ThemedText style={styles.errorText}>
          {errors.province?.message || errors.district?.message}
        </ThemedText>
      )}

      <ControlledInput
        control={control}
        name="cityArea"
        placeholder="City / Area (e.g. New Baneshwor)"
        error={errors.cityArea?.message}
      />
      <ControlledInput
        control={control}
        name="streetAddress"
        placeholder="Tole / Street address & house number"
        multiline
        error={errors.streetAddress?.message}
      />
      <ControlledInput
        control={control}
        name="landmark"
        placeholder="Landmark (optional, e.g. Near Civil Hospital)"
        error={errors.landmark?.message}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchLabels}>
          <ThemedText style={styles.switchTitle}>Set as default address</ThemedText>
          <ThemedText style={styles.switchSub}>Used automatically at checkout</ThemedText>
        </View>
        <Controller
          control={control}
          name="isDefault"
          render={({ field: { value, onChange } }) => (
            <Switch
              value={!!value}
              onValueChange={onChange}
              trackColor={{ false: Palette.gray200, true: Palette.gray900 }}
              thumbColor={Palette.white}
              accessibilityLabel="Set as default address"
            />
          )}
        />
      </View>
    </>
  );
}
