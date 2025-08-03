export const DEFAULT_ATTRIBUTE_GROUPS = [
  { name: 'basic', label: 'Basic Information', order: 1, visible: true },
  { name: 'variant', label: 'Variants', order: 2, visible: true },
  { name: 'measurements', label: 'Measurements', order: 3, visible: true },
  { name: 'details', label: 'Product Details', order: 4, visible: true },
  { name: 'images', label: 'Images', order: 5, visible: true }
] as const;

export const DEFAULT_ATTRIBUTE = {
  name: '',
  label: '',
  type: 'text',
  values: [],
  isRequired: false,
  group: 'basic',
  visible: true,
  important: false,
  rule: {
    minWidth: undefined,
    maxWidth: undefined,
    minHeight: undefined,
    maxHeight: undefined,
    maxSize: undefined,
    minSize: undefined,
    ratios: [],
    accept: [],
    locale: {
      heightNoLessThan: '',
      uploadFromLocal: 'Upload',
      uploadText: 'Add Item',
      error: 'Error',
      warning: 'Warning'
    }
  }
} as const;
