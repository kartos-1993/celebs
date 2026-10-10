import React from 'react';
import { FlatList } from 'react-native';

import type { DeliveryProvince } from '@celebs/shared-types';

import { DeliveryLocationHeader } from './delivery-location-header';
import { DeliveryLocationItem } from './delivery-location-item';
import { styles } from './delivery-location-picker.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';

interface DeliveryLocationPickerProps {
  visible: boolean;
  province: string;
  district: string;
  cityArea: string;
  provinces: DeliveryProvince[];
  isLoading?: boolean;
  error?: string;
  onClose: () => void;
  onSelect: (value: {
    province: string;
    district: string;
    cityArea: string;
    logisticsZoneId: string;
  }) => void;
}

import { useDeliveryLocationPicker } from '../hooks/use-delivery-location-picker';

export function DeliveryLocationPicker({
  visible,
  province,
  district,
  cityArea,
  provinces,
  isLoading = false,
  error,
  onClose,
  onSelect,
}: DeliveryLocationPickerProps) {
  const {
    step,
    activeProvince,
    selectedDistrict,
    districts,
    title,
    canGoBack,
    backLabel,
    handleChooseProvince,
    handleChooseDistrict,
    handleBack,
    commit,
  } = useDeliveryLocationPicker({
    provinces,
    province,
    district,
    onSelect,
    onClose,
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Choose delivery location">
      <DeliveryLocationHeader
        title={title}
        error={error}
        canGoBack={canGoBack}
        backLabel={backLabel}
        onBack={handleBack}
        onClose={onClose}
      />
      {step === 'province' && (
        <FlatList
          data={provinces}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <DeliveryLocationItem
              name={item.name}
              isSelected={item.name === activeProvince?.name}
              onPress={() => handleChooseProvince(item)}
            />
          )}
        />
      )}
      {step === 'district' && (
        <FlatList
          data={districts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <DeliveryLocationItem
              name={item.name}
              hint={item.isValley ? `Free delivery over NPR ${item.freeDeliveryThreshold}` : null}
              isSelected={item.name === district}
              onPress={() => handleChooseDistrict(item)}
            />
          )}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              {isLoading ? 'Loading delivery areas…' : 'No districts available.'}
            </ThemedText>
          }
        />
      )}
      {step === 'area' && (
        <FlatList
          data={selectedDistrict?.areas ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <DeliveryLocationItem
              name={item.name}
              isSelected={item.name === cityArea}
              showCheck
              onPress={() => selectedDistrict && commit(selectedDistrict, item)}
            />
          )}
        />
      )}
    </BottomSheet>
  );
}
