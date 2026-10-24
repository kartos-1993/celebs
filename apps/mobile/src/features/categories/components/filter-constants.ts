import { Palette } from '@/constants/theme';

export const FALLBACK_COLOR_OPTIONS = [
  { name: 'Blue', code: '#2563eb' },
  { name: 'Light Wash', code: '#93c5fd' },
  { name: 'Dark Wash', code: '#1e3a8a' },
  { name: 'Black', code: Palette.gray900 },
  { name: 'Grey', code: '#71717a' },
  { name: 'Beige', code: '#d4b996' },
  { name: 'White', code: Palette.white },
  { name: 'Multicolor', code: 'gradient' },
];

export const FALLBACK_SIZE_OPTIONS = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
];

export const FALLBACK_FIT_OPTIONS = [
  'Loose',
  'Oversized',
  'Regular Fit',
  'Slim Fit',
  'Wide Leg',
  'Straight Leg',
];

export const FALLBACK_PRICE_RANGES = [
  { label: 'Under Rs. 2500', min: 0, max: 2500 },
  { label: 'Rs. 2500 - Rs. 5000', min: 2500, max: 5000 },
  { label: 'Rs. 5000 - Rs. 10000', min: 5000, max: 10000 },
  { label: 'Over Rs. 10000', min: 10000, max: 999999 },
];
