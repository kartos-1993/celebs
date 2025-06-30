import { Category, Subcategory, ProductAttribute } from './types/product';

// API endpoints - replace with your actual API URLs
const API_BASE_URL = '/api';

export const categoryService = {
  // Fetch all categories with subcategories
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to mock data during development
      return getMockCategories();
    }
  },

  // Fetch subcategory details with dynamic attributes
  async getSubcategoryDetails(subcategoryId: string): Promise<Subcategory> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subcategories/${subcategoryId}`,
      );
      if (!response.ok) throw new Error('Failed to fetch subcategory details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching subcategory details:', error);
      // Fallback to mock data during development
      return getMockSubcategoryDetails(subcategoryId);
    }
  },

  // Fetch category-specific form configuration
  async getCategoryFormConfig(categoryId: string, subcategoryId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/${categoryId}/subcategories/${subcategoryId}/form-config`,
      );
      if (!response.ok) throw new Error('Failed to fetch form config');
      return await response.json();
    } catch (error) {
      console.error('Error fetching form config:', error);
      return getMockFormConfig(subcategoryId);
    }
  },
};

// Mock data for development - replace with actual API calls
function getMockCategories(): Category[] {
  return [
    {
      id: '1',
      name: "Men's Clothing",
      subcategories: [
        {
          id: '1-1',
          name: 'T-Shirts',
          attributes: [],
          sizeChart: [],
          requiredMeasurements: [],
        },
        {
          id: '1-2',
          name: 'Jeans',
          attributes: [],
          sizeChart: [],
          requiredMeasurements: [],
        },
        {
          id: '1-3',
          name: 'Jackets',
          attributes: [],
          sizeChart: [],
          requiredMeasurements: [],
        },
      ],
    },
    {
      id: '2',
      name: "Women's Clothing",
      subcategories: [
        {
          id: '2-1',
          name: 'Dresses',
          attributes: [],
          sizeChart: [],
          requiredMeasurements: [],
        },
        {
          id: '2-2',
          name: 'Tops',
          attributes: [],
          sizeChart: [],
          requiredMeasurements: [],
        },
        {
          id: '2-3',
          name: 'Skirts',
          attributes: [],
          sizeChart: [],
          requiredMeasurements: [],
        },
      ],
    },
  ];
}

function getMockSubcategoryDetails(subcategoryId: string): Subcategory {
  const attributeMap: Record<string, ProductAttribute[]> = {
    '1-1': [
      {
        name: 'Neckline',
        value: '',
        type: 'select',
        required: true,
        options: ['Crew', 'V-Neck', 'Polo'],
      },
      {
        name: 'Sleeve Length',
        value: '',
        type: 'select',
        required: true,
        options: ['Short', 'Long', 'Three-Quarter'],
      },
      { name: 'Material', value: '', type: 'text', required: true },
      { name: 'GSM', value: '', type: 'number', required: false },
    ],
    '2-1': [
      {
        name: 'Dress Length',
        value: '',
        type: 'select',
        required: true,
        options: ['Mini', 'Midi', 'Maxi'],
      },
      {
        name: 'Silhouette',
        value: '',
        type: 'select',
        required: true,
        options: ['A-Line', 'Bodycon', 'Fit & Flare'],
      },
      {
        name: 'Occasion',
        value: [],
        type: 'multiselect',
        required: false,
        options: ['Casual', 'Formal', 'Party'],
      },
    ],
  };

  return {
    id: subcategoryId,
    name: subcategoryId === '1-1' ? 'T-Shirts' : 'Dresses',
    attributes: attributeMap[subcategoryId] || [],
    sizeChart: ['XS', 'S', 'M', 'L', 'XL'],
    requiredMeasurements:
      subcategoryId === '1-1'
        ? ['chest', 'length']
        : ['bust', 'waist', 'length'],
  };
}

function getMockFormConfig(subcategoryId: string) {
  return {
    requiredSections: ['basicInfo', 'attributes', 'variants', 'images'],
    optionalSections: ['sizeChart'],
    validationRules: {
      minImages: 1,
      minVariants: 1,
      requireSizeChart: true,
    },
  };
}
