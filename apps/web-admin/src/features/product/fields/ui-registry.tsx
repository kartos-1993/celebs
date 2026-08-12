import React from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import type { FieldSpec, UiType } from '../types';
import { TextInputField } from './components/text-input-field';
import { NumberInputField } from './components/number-input-field';
import { SwitchInputField } from './components/switch-input-field';
import { DropdownInputField } from './components/dropdown-input-field';
import { MultiSelectInputField } from './components/multi-select-input-field';
import { VariantListInputField } from './components/variant-list-input-field';
import { MainImageInputField } from './components/main-image-input-field';
import { SkuTableInputField } from './components/sku-table-input-field';
import { ColorMetaInputField } from './components/color-meta-input-field';
import { ColorInlineInputField } from './components/color-inline-input-field';
import { SizeMeasurementsInputField } from './components/size-measurements-input-field';

// Canonical definitions live in ../types — re-exported for backwards compat
export type { FieldSpec, UiType } from '../types';

export type UiProps = { field: FieldSpec; control: Control<FieldValues> };

export const uiTypeRegistry: Record<UiType, React.FC<UiProps>> = {
  input: TextInputField,
  number: NumberInputField,
  Switch: SwitchInputField,
  select: DropdownInputField,
  multiselect: MultiSelectInputField,
  VariantList: VariantListInputField,
  MainImage: MainImageInputField,
  SkuTableV2: SkuTableInputField,
  ColorMeta: ColorMetaInputField,
  ColorInline: ColorInlineInputField,
  SizeMeasurementsTable: SizeMeasurementsInputField,
};

export { getLabelMap } from './variant-utils';
