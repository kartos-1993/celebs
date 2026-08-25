import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { styles } from './address-form-sheet.styles';

import { BottomSheet } from '@/components/bottom-sheet';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { ADDRESS_LABELS, type AddressDraft, type SavedAddress } from '@/features/addresses/types';

interface AddressFormSheetProps {
  visible: boolean;
  editing: SavedAddress | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (draft: AddressDraft) => void;
  onDelete?: (addressId: string) => void;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  province?: string;
  district?: string;
  cityArea?: string;
  streetAddress?: string;
}

function validate(draft: AddressDraft): FormErrors {
  const errors: FormErrors = {};
  if (!draft.fullName.trim() || draft.fullName.trim().length < 2) {
    errors.fullName = 'Enter recipient full name';
  }
  if (!draft.phone.trim() || draft.phone.trim().length < 7) {
    errors.phone = 'Enter a valid phone number';
  }
  if (!draft.province.trim()) errors.province = 'Province is required';
  if (!draft.district.trim()) errors.district = 'District is required';
  if (!draft.cityArea.trim()) errors.cityArea = 'City / Area is required';
  if (!draft.streetAddress.trim() || draft.streetAddress.trim().length < 3) {
    errors.streetAddress = 'Street address is required';
  }
  return errors;
}

export function AddressFormSheet({
  visible,
  editing,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: AddressFormSheetProps) {
  // State initializes from `editing`; the parent remounts this component via
  // `key` when switching between add/edit, so no reset effect is needed.
  const [label, setLabel] = useState<string>(editing?.label ?? 'Home');
  const [fullName, setFullName] = useState(editing?.fullName ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [altPhone, setAltPhone] = useState(editing?.altPhone ?? '');
  const [province, setProvince] = useState(editing?.province ?? 'Bagmati');
  const [district, setDistrict] = useState(editing?.district ?? '');
  const [cityArea, setCityArea] = useState(editing?.cityArea ?? '');
  const [streetAddress, setStreetAddress] = useState(editing?.streetAddress ?? '');
  const [landmark, setLandmark] = useState(editing?.landmark ?? '');
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = () => {
    const draft: AddressDraft = {
      label: label.trim() || 'Home',
      fullName: fullName.trim(),
      phone: phone.trim(),
      ...(altPhone.trim() ? { altPhone: altPhone.trim() } : {}),
      province: province.trim() || 'Bagmati',
      district: district.trim(),
      cityArea: cityArea.trim(),
      streetAddress: streetAddress.trim(),
      ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
      isDefault,
    };

    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(draft);
  };

  const handleDelete = () => {
    if (editing && onDelete) onDelete(editing.id);
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
              onPress={handleDelete}
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
            onPress={handleSubmit}
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
        {/* Label chips */}
        <ThemedText style={styles.fieldLabel}>Save As</ThemedText>
        <View style={styles.chipSelectorRow}>
          {ADDRESS_LABELS.map((option) => {
            const isActive = label === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.chipOption, isActive && styles.chipOptionActive]}
                onPress={() => setLabel(option)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${option} label`}
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

        <ThemedText style={styles.sectionHint}>CONTACT</ThemedText>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={(text) => setFullName(text)}
          placeholder="Recipient full name"
          placeholderTextColor={Palette.gray400}
          autoComplete="name"
        />
        {!!errors.fullName && <ThemedText style={styles.errorText}>{errors.fullName}</ThemedText>}

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ''))}
          placeholder="Phone number (e.g. 9841234567)"
          placeholderTextColor={Palette.gray400}
          keyboardType="phone-pad"
          maxLength={10}
        />
        {!!errors.phone && <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>}

        <TextInput
          style={styles.input}
          value={altPhone}
          onChangeText={(text) => setAltPhone(text.replace(/[^0-9]/g, ''))}
          placeholder="Alternate phone (optional)"
          placeholderTextColor={Palette.gray400}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <ThemedText style={styles.sectionHint}>DELIVERY ADDRESS</ThemedText>
        <View style={styles.rowGroup}>
          <TextInput
            style={[styles.input, styles.flexInput]}
            value={province}
            onChangeText={(text) => setProvince(text)}
            placeholder="Province"
            placeholderTextColor={Palette.gray400}
          />
          <TextInput
            style={[styles.input, styles.flexInput]}
            value={district}
            onChangeText={(text) => setDistrict(text)}
            placeholder="District"
            placeholderTextColor={Palette.gray400}
          />
        </View>
        {(!!errors.province || !!errors.district) && (
          <ThemedText style={styles.errorText}>{errors.province || errors.district}</ThemedText>
        )}

        <TextInput
          style={styles.input}
          value={cityArea}
          onChangeText={(text) => setCityArea(text)}
          placeholder="City / Area (e.g. New Baneshwor)"
          placeholderTextColor={Palette.gray400}
        />
        {!!errors.cityArea && <ThemedText style={styles.errorText}>{errors.cityArea}</ThemedText>}

        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={streetAddress}
          onChangeText={(text) => setStreetAddress(text)}
          placeholder="Tole / Street address & house number"
          placeholderTextColor={Palette.gray400}
          multiline
        />
        {!!errors.streetAddress && (
          <ThemedText style={styles.errorText}>{errors.streetAddress}</ThemedText>
        )}

        <TextInput
          style={styles.input}
          value={landmark}
          onChangeText={(text) => setLandmark(text)}
          placeholder="Landmark (optional, e.g. Near Civil Hospital)"
          placeholderTextColor={Palette.gray400}
        />

        {/* Default switch */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabels}>
            <ThemedText style={styles.switchTitle}>Set as default address</ThemedText>
            <ThemedText style={styles.switchSub}>Used automatically at checkout</ThemedText>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ false: Palette.gray200, true: Palette.gray900 }}
            thumbColor={Palette.white}
            accessibilityLabel="Set as default address"
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
