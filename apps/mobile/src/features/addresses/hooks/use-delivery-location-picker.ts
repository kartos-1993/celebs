import { useCallback, useMemo, useState } from 'react';

import type { DeliveryArea, DeliveryDistrict, DeliveryProvince } from '@celebs/shared-types';

export type Step = 'province' | 'district' | 'area';

export interface UseDeliveryLocationPickerParams {
  provinces: DeliveryProvince[];
  province: string;
  district: string;
  onSelect: (value: {
    province: string;
    district: string;
    cityArea: string;
    logisticsZoneId: string;
  }) => void;
  onClose: () => void;
}

export function useDeliveryLocationPicker({
  provinces,
  province,
  district,
  onSelect,
  onClose,
}: UseDeliveryLocationPickerParams) {
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

  return {
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
  };
}
