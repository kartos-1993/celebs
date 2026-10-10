import React from 'react';
import { type Control, Controller, type FieldErrors, type UseFormReturn } from 'react-hook-form';
import { Switch, TouchableOpacity, View } from 'react-native';

import type { AddressInput } from '@celebs/shared-types';

import { styles } from './address-form-sheet.styles';
import { AddressLocationPickerField } from './address-location-picker-field';
import { ControlledInput } from './controlled-input';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { ADDRESS_LABELS } from '@/features/addresses/types';

export type AddressFormValues = AddressInput;

interface AddressFormFieldsProps {
  control: Control<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  watch?: UseFormReturn<AddressFormValues>['watch'];
  setValue: UseFormReturn<AddressFormValues>['setValue'];
}

export function AddressFormFields({ control, errors, setValue }: AddressFormFieldsProps) {
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
      <AddressLocationPickerField
        control={control}
        setValue={setValue}
        error={errors.logisticsZoneId?.message}
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
