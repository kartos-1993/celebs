import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import type { DeliveryArea, DeliveryDistrict } from '@celebs/shared-types';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

/**
 * District and area picker for the delivery address.
 *
 * Replaces two free-text boxes. Typing a district is what allowed an order for a
 * place no courier serves, and it also produced the near-misses ("kathmandu",
 * "Kathmandu ", a district that exists in a different taxonomy), none of which
 * can be resolved to a delivery zone. Choosing from the list means every saved
 * address carries a zone we can quote and dispatch against.
 *
 * Two steps because that is what the data is: a district, then the areas the
 * courier serves inside it. A district with a single area still shows both
 * steps, so the shape does not change when a courier syncs real zones in.
 */

interface DeliveryLocationPickerProps {
  visible: boolean;
  province: string;
  district: string;
  cityArea: string;
  provinces: { name: string; districts: DeliveryDistrict[] }[];
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

type Step = 'district' | 'area';

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
  const [step, setStep] = useState<Step>('district');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DeliveryDistrict | null>(null);

  // Start from what the customer already chose, so editing an address does not
  // silently reset it to the first district in the list.
  const startingProvince = selectedProvince ?? (province || (provinces[0]?.name ?? null));
  const startingDistrict =
    selectedDistrict ??
    (startingProvince
      ? (provinces
          .find((entry) => entry.name === startingProvince)
          ?.districts.find((entry) => entry.name === district) ?? null)
      : null);

  const districts = useMemo(
    () => provinces.find((entry) => entry.name === startingProvince)?.districts ?? [],
    [provinces, startingProvince],
  );

  const handleChooseProvince = (name: string) => {
    setSelectedProvince(name);
    setSelectedDistrict(null);
  };

  const handleChooseDistrict = (entry: DeliveryDistrict) => {
    setSelectedDistrict(entry);
    // A district with exactly one area has no decision to make, so take it
    // directly rather than showing a list of one.
    if (entry.areas.length === 1) {
      commit(entry, entry.areas[0]!);
      return;
    }
    setStep('area');
  };

  const commit = (chosenDistrict: DeliveryDistrict, area: DeliveryArea) => {
    onSelect({
      province: startingProvince ?? chosenDistrict.name,
      district: chosenDistrict.name,
      cityArea: area.name,
      logisticsZoneId: area.id,
    });
    onClose();
  };

  const title =
    step === 'district'
      ? startingProvince
        ? `District in ${startingProvince}`
        : 'Choose a district'
      : `Delivery area in ${startingDistrict?.name ?? ''}`;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Choose delivery location">
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
        <ThemedText style={{ fontSize: FontSize.lg, fontWeight: FontWeight.semibold }}>
          {title}
        </ThemedText>
        {error ? (
          <ThemedText
            style={{ color: Palette.danger, fontSize: FontSize.footnote, marginTop: Spacing.xs }}
          >
            {error}
          </ThemedText>
        ) : null}
      </View>

      {step === 'district' && provinces.length > 1 ? (
        <FlatList
          data={provinces}
          keyExtractor={(entry) => entry.name}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
          renderItem={({ item }) => {
            const active = item.name === startingProvince;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => handleChooseProvince(item.name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.sm,
                  borderRadius: Radius.md,
                  backgroundColor: active ? Palette.gray200 : 'transparent',
                }}
              >
                <ThemedText style={{ fontSize: FontSize.small }}>{item.name}</ThemedText>
                <ChevronRight size={16} color={Palette.gray400} />
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          data={step === 'district' ? districts : (startingDistrict?.areas ?? [])}
          keyExtractor={(entry: DeliveryDistrict | DeliveryArea) => entry.id}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
          renderItem={({ item }) => {
            if (step === 'area') {
              const area = item as DeliveryArea;
              const active = area.name === cityArea;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => startingDistrict && commit(startingDistrict, area)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: Spacing.sm,
                    borderRadius: Radius.md,
                    backgroundColor: active ? Palette.gray200 : 'transparent',
                  }}
                >
                  <ThemedText style={{ fontSize: FontSize.small }}>{area.name}</ThemedText>
                  {active ? <Check size={16} color={Palette.success} /> : null}
                </Pressable>
              );
            }

            const entry = item as DeliveryDistrict;
            const active = entry.name === district;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => handleChooseDistrict(entry)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.sm,
                  borderRadius: Radius.md,
                  backgroundColor: active ? Palette.gray200 : 'transparent',
                }}
              >
                <View>
                  <ThemedText style={{ fontSize: FontSize.small }}>{entry.name}</ThemedText>
                  {entry.isValley ? (
                    <ThemedText style={{ fontSize: FontSize.footnote, color: Palette.gray400 }}>
                      Free delivery over NPR {entry.freeDeliveryThreshold.toLocaleString()}
                    </ThemedText>
                  ) : null}
                </View>
                <ChevronRight size={16} color={Palette.gray400} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <ThemedText
              style={{
                fontSize: FontSize.small,
                color: Palette.gray400,
                paddingVertical: Spacing.md,
              }}
            >
              {isLoading ? 'Loading delivery areas…' : 'No delivery areas available.'}
            </ThemedText>
          }
        />
      )}
    </BottomSheet>
  );
}
