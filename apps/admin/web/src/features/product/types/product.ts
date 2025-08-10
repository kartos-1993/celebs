export interface SizeMeasurement {
  size: string;
  bust?: number;
  waist?: number;
  length?: number;
  chest?: number;
  shoulder?: number;
  sleeve?: number;
}

export interface ColorVariant {
  id: string;
  name: string;
  hexCode: string;
  swatchImage?: string;
  images: {
    front?: string;
    back?: string;
    side?: string;
    detail?: string;
  };
}

export interface SizeVariant {
  size: string;
  sku: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

export interface FashionVariant {
  id: string;
  color: ColorVariant;
  sizes: SizeVariant[];
}

export interface ProductAttribute {
  name: string;
  value: string | string[] | number;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  attributes: ProductAttribute[];
  sizeChart: string[];
  requiredMeasurements: string[];
}

export interface ProductFormData {
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  price: string;
  discountPrice: string;
  status: string;
  attributes: ProductAttribute[];
  variants: FashionVariant[];
  sizeChart: SizeMeasurement[];
  images: File[];
}

export interface ValidationStatus {
  basicInfo: boolean;
  attributes: boolean;
  sizeChart: boolean;
  variants: boolean;
  images: boolean;
  brand: boolean;
}
