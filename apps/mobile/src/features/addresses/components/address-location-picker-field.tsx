import React, { useMemo, useState } from 'react';
import { type Control, type UseFormReturn,useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';

import type { AddressInput } from '@celebs/shared-types';

import { useDeliveryLocations } from '../hooks/use-delivery-locations';

import { styles } from './address-form-sheet.styles';
import { DeliveryLocationPicker } from './delivery-location-picker';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface AddressLocationPickerFieldProps {
  control: Control<AddressInput>;
  setValue: UseFormReturn<AddressInput>['setValue'];
  error?: string;
}

export function AddressLocationPickerField({
  control,
  setValue,
  error,
}: AddressLocationPickerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data, isLoading: isLoadingLocations } = useDeliveryLocations();
  const provinces = useMemo(() => data?.provinces ?? [], [data]);

  const chosenProvince = useWatch({ control, name: 'province' }) ?? '';
  const chosenDistrict = useWatch({ control, name: 'district' }) ?? '';
  const chosenArea = useWatch({ control, name: 'cityArea' }) ?? '';
  const chosenZoneId = useWatch({ control, name: 'logisticsZoneId' }) ?? '';

  const zoneLabel = chosenDistrict ? `${chosenDistrict}, ${chosenArea}`.trim() : '';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose delivery district and area"
        onPress={() => setPickerOpen(true)}
        style={[styles.locationPickerBtn, Boolean(error) && styles.locationPickerBtnError]}
      >
        <View style={styles.locationPickerLeft}>
          <MapPin size={18} color={chosenZoneId ? Palette.gray900 : Palette.gray400} />
          <ThemedText
            style={[
              styles.locationPickerText,
              !chosenZoneId && styles.locationPickerTextPlaceholder,
            ]}
            numberOfLines={1}
          >
            {zoneLabel || 'Choose your delivery district and area'}
          </ThemedText>
        </View>
        <ChevronRight size={18} color={Palette.gray400} />
      </Pressable>
      {!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

      <DeliveryLocationPicker
        visible={pickerOpen}
        province={chosenProvince}
        district={chosenDistrict}
        cityArea={chosenArea}
        provinces={provinces}
        isLoading={isLoadingLocations}
        error={error}
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
    </>
  );
}
