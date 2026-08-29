export interface ProductMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface ProductSize {
  name: string;
  productMeasurements?: ProductMeasurement[];
  bodyMeasurements?: ProductMeasurement[];
}

export interface ProductStock {
  size: string;
  quantity: number;
}

export interface ProductColorVariant {
  name: string;
  colorCode?: string;
  swatch?: string;
  images?: string[];
  stocks?: ProductStock[];
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  mainImages: string[];
  sizes?: ProductSize[];
  colorVariants?: ProductColorVariant[];
  status: string;
  featured?: boolean;
}

export interface ProductFilterParams {
  limit?: number;
  category?: string;
  cursor?: string | null;
  status?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  tag?: string;
  brandId?: string;
  sortBy?: 'createdAt' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}
