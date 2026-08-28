import React from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react-native';

import { addressSchema } from '@celebs/shared-types';

import { AddressFormFields, type AddressFormValues } from './address-form-fields';
import { styles } from './address-form-sheet.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import type { AddressDraft, SavedAddress } from '@/features/addresses/types';

interface AddressFormSheetProps {
  visible: boolean;
  editing: SavedAddress | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (draft: AddressDraft) => void;
  onDelete?: (addressId: string) => void;
}

export function AddressFormSheet({
  visible,
  editing,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: AddressFormSheetProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: editing?.label ?? 'Home',
      fullName: editing?.fullName ?? '',
      phone: editing?.phone ?? '',
      altPhone: editing?.altPhone ?? '',
      province: editing?.province ?? 'Bagmati',
      district: editing?.district ?? '',
      cityArea: editing?.cityArea ?? '',
      streetAddress: editing?.streetAddress ?? '',
      landmark: editing?.landmark ?? '',
      isDefault: editing?.isDefault ?? false,
    },
  });

  const onValid = (data: AddressFormValues) => {
    onSubmit({
      label: data.label || 'Home',
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      ...(data.altPhone?.trim() ? { altPhone: data.altPhone.trim() } : {}),
      province: data.province.trim() || 'Bagmati',
      district: data.district.trim(),
      cityArea: data.cityArea.trim(),
      streetAddress: data.streetAddress.trim(),
      ...(data.landmark?.trim() ? { landmark: data.landmark.trim() } : {}),
      isDefault: !!data.isDefault,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightRatio={0.94}
      accessibilityLabel={editing ? 'Edit address' : 'Add address'}
      header={
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>
            {editing ? 'Edit Address' : 'Add New Address'}
          </ThemedText>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <X size={20} color={Palette.gray900} />
          </TouchableOpacity>
        </View>
      }
      footer={
        <View style={styles.footerRow}>
          {editing && onDelete ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(editing.id)}
              disabled={saving}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Delete this address"
            >
              <ThemedText style={styles.deleteBtnText}>Delete</ThemedText>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSubmit(onValid)}
            disabled={saving}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save address"
          >
            {saving ? (
              <ActivityIndicator color={Palette.white} />
            ) : (
              <ThemedText style={styles.saveBtnText}>
                {editing ? 'Save Changes' : 'Save Address'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AddressFormFields control={control} errors={errors} />
      </ScrollView>
    </BottomSheet>
  );
}
