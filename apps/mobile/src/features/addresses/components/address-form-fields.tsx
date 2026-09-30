import React, { useMemo, useState } from 'react';
import {
  Control,
  Controller,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import {
  Pressable,
  Switch,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

import type { AddressInput } from '@celebs/shared-types';

import { useDeliveryLocations } from '../hooks/use-delivery-locations';

import { styles } from './address-form-sheet.styles';
import { DeliveryLocationPicker } from './delivery-location-picker';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Palette, Spacing } from '@/constants/theme';
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
  /**
   * The owning form's `watch`/`setValue`, threaded in alongside `control` rather
   * than read from `useFormContext`: the sheet does not wrap these fields in a
   * `FormProvider`, so the context would be null and the picker would throw on
   * first use.
   */
  watch: UseFormReturn<AddressFormValues>['watch'];
  setValue: UseFormReturn<AddressFormValues>['setValue'];
}

export function AddressFormFields({ control, errors, watch, setValue }: AddressFormFieldsProps) {
  const { data, isLoading: isLoadingLocations } = useDeliveryLocations();
  const provinces = useMemo(() => data?.provinces ?? [], [data]);

  const [pickerOpen, setPickerOpen] = useState(false);

  const chosenDistrict = watch('district');
  const chosenArea = watch('cityArea');
  const zoneLabel = chosenDistrict ? `${chosenDistrict}, ${chosenArea ?? ''}`.trim() : '';

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

      {/* District and area are chosen from the list of places we actually
          deliver to, rather than typed. Free text is what let an order be placed
          for a district no courier serves, and it also produced near-misses that
          cannot resolve to a delivery zone. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose delivery district and area"
        onPress={() => setPickerOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: watch('logisticsZoneId') ? Palette.gray300 : Palette.danger,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: Spacing.xs,
        }}
      >
        <ThemedText
          style={{
            color: watch('logisticsZoneId') ? Palette.gray900 : Palette.gray500,
            fontSize: FontSize.base,
          }}
        >
          {zoneLabel || 'Choose your district and area'}
        </ThemedText>
      </Pressable>
      {errors.logisticsZoneId && (
        <ThemedText style={styles.errorText}>{errors.logisticsZoneId.message}</ThemedText>
      )}

      <DeliveryLocationPicker
        visible={pickerOpen}
        province={watch('province') ?? ''}
        district={watch('district') ?? ''}
        cityArea={watch('cityArea') ?? ''}
        provinces={provinces}
        isLoading={isLoadingLocations}
        error={errors.logisticsZoneId?.message}
        onClose={() => setPickerOpen(false)}
        onSelect={({ province, district, cityArea, logisticsZoneId }) => {
          setValue('province', province, { shouldValidate: true, shouldDirty: true });
          setValue('district', district, { shouldValidate: true, shouldDirty: true });
          setValue('cityArea', cityArea, { shouldValidate: true, shouldDirty: true });
          setValue('logisticsZoneId', logisticsZoneId, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
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
