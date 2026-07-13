import React from 'react';
import type { Control } from 'react-hook-form';
import { TextInputField } from './components/TextInputField';
import { NumberInputField } from './components/NumberInputField';
import { SwitchInputField } from './components/SwitchInputField';
import { DropdownInputField } from './components/DropdownInputField';
import { MultiSelectInputField } from './components/MultiSelectInputField';
import { VariantListInputField } from './components/VariantListInputField';
import { MainImageInputField } from './components/MainImageInputField';
import { SkuTableInputField } from './components/SkuTableInputField';
import { ColorMetaInputField } from './components/ColorMetaInputField';
import { ColorInlineInputField } from './components/ColorInlineInputField';
import { SizeMeasurementsInputField } from './components/SizeMeasurementsInputField';

export type UiType =
  | 'input'
  | 'number'
  | 'Switch'
  | 'select'
  | 'multiselect'
  | 'VariantList'
  | 'ColorInline'
  | 'SkuTableV2'
  | 'MainImage'
  | 'ColorMeta'
  | 'SizeMeasurementsTable';

export interface FieldSpec {
  name: string;
  uiType: UiType;
  label: string;
  group: string;
  required?: boolean;
  value?: any;
  dataSource?: any;
  rule?: any;
  visible?: boolean;
}

export type UiProps = { field: FieldSpec; control: Control<any> };

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
