import type { RejectionCategoryOption } from './types';

export const REJECTION_CATEGORIES: RejectionCategoryOption[] = [
  {
    id: 'Image Guidelines & Quality',
    label: 'Image Guidelines & Quality',
    subcategories: [
      'Images low resolution or pixelated (under 800x800)',
      'Watermark, promo text, or competitor logo present',
      'Inappropriate background or poor lighting',
      'Missing key product angles (front, back, label)',
    ],
    suggestedFields: ['mainImages', 'colorVariants'],
  },
  {
    id: 'Product Information & Specifications',
    label: 'Product Information & Specifications',
    subcategories: [
      'Title too short or spammy with promotional words',
      'Incomplete or misleading description text',
      'Incorrect category or subcategory selection',
      'Missing required category specifications (material, fit, care)',
    ],
    suggestedFields: ['name', 'description', 'category', 'dynamicData'],
  },
  {
    id: 'Sizing, Fit & Measurement Chart',
    label: 'Sizing, Fit & Measurement Chart',
    subcategories: [
      'Missing size chart or measurement values',
      'Mismatched size names between variants and guide',
      'Unrealistic measurement units',
    ],
    suggestedFields: ['sizes'],
  },
  {
    id: 'Pricing, Discount & Stock Violations',
    label: 'Pricing, Discount & Stock Violations',
    subcategories: [
      'Inflated original price or false discount percentage',
      'Discounted price higher than regular price',
      'Zero stock listed for all variants',
    ],
    suggestedFields: ['price', 'discountedPrice', 'stocks'],
  },
  {
    id: 'Intellectual Property & Policy Compliance',
    label: 'Intellectual Property & Policy Compliance',
    subcategories: [
      'Suspected counterfeit, replica, or unauthorized trademark claim',
      'Prohibited or restricted item under platform terms',
      'Misleading warranty or origin statements',
    ],
    suggestedFields: ['brand', 'description', 'mainImages'],
  },
];

export const FLAGGED_FIELDS_OPTIONS = [
  { id: 'mainImages', label: 'Main Images' },
  { id: 'colorVariants', label: 'Color Variant Photos' },
  { id: 'name', label: 'Product Title' },
  { id: 'brand', label: 'Brand Name' },
  { id: 'description', label: 'Description' },
  { id: 'category', label: 'Category Selection' },
  { id: 'dynamicData', label: 'Category Specifications' },
  { id: 'sizes', label: 'Size Guide & Measurements' },
  { id: 'price', label: 'Pricing & Discount' },
  { id: 'stocks', label: 'Inventory Stock' },
];
