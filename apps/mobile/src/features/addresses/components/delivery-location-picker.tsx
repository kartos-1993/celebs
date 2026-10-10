import React, { useCallback, useMemo, useState } from 'react';
import { FlatList } from 'react-native';

import type { DeliveryArea, DeliveryDistrict, DeliveryProvince } from '@celebs/shared-types';

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

type Step = 'province' | 'district' | 'area';

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
  const initialProvince = province || (provinces[0]?.name ?? '');
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>(initialProvince);
  const [selectedDistrict, setSelectedDistrict] = useState<DeliveryDistrict | null>(null);
  const [step, setStep] = useState<Step>(
    district ? 'district' : provinces.length > 1 ? 'province' : 'district',
  );

  const activeProvince = useMemo(
    () => provinces.find((item) => item.name === selectedProvinceName) ?? provinces[0],
    [provinces, selectedProvinceName],
  );

  const districts = useMemo(() => activeProvince?.districts ?? [], [activeProvince]);

  const handleChooseProvince = useCallback((item: DeliveryProvince) => {
    setSelectedProvinceName(item.name);
    setSelectedDistrict(null);
    setStep('district');
  }, []);

  const commit = useCallback(
    (chosenDistrict: DeliveryDistrict, area: DeliveryArea) => {
      onSelect({
        province: activeProvince?.name ?? chosenDistrict.name,
        district: chosenDistrict.name,
        cityArea: area.name,
        logisticsZoneId: area.id,
      });
      onClose();
    },
    [activeProvince?.name, onClose, onSelect],
  );

  const handleChooseDistrict = useCallback(
    (entry: DeliveryDistrict) => {
      setSelectedDistrict(entry);
      if (entry.areas.length === 1 && entry.areas[0]) {
        commit(entry, entry.areas[0]);
        return;
      }
      setStep('area');
    },
    [commit],
  );

  const handleBack = useCallback(() => {
    if (step === 'area') setStep('district');
    else if (step === 'district') setStep('province');
  }, [step]);

  const canGoBack = (step === 'district' && provinces.length > 1) || step === 'area';
  const backLabel = step === 'area' ? 'Districts' : 'Provinces';

  const title =
    step === 'province'
      ? 'Choose Province'
      : step === 'district'
        ? `Districts in ${activeProvince?.name ?? ''}`
        : `Areas in ${selectedDistrict?.name ?? ''}`;

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
