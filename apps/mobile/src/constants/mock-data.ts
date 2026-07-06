export interface Stock {
  size: string;
  quantity: number;
}

export interface ColorVariant {
  name: string;
  colorCode: string;
  images: string[];
  stocks: Stock[];
}

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

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  parentCategory: string;
  rating: number;
  reviewsCount: number;
  mainImages: string[];
  colorVariants: ColorVariant[];
  sizes: ProductSize[];
  featured: boolean;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  parent?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'tops',
    name: 'Tops',
    slug: 'tops',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400',
  },
  {
    id: 'bottoms',
    name: 'Bottoms',
    slug: 'bottoms',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
  },
  {
    id: 'shoes',
    name: 'Shoes',
    slug: 'shoes',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
  },
  {
    id: 'jackets',
    name: 'Jackets',
    slug: 'jackets',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Premium Cotton Slim Fit Tee',
    brand: 'Celebs Basics',
    description: 'Crafted from 100% long-staple Egyptian cotton, this slim fit t-shirt offers unparalleled comfort and durability. Featuring a classic crew neck design and double-needle stitching, it is the perfect foundation for any stylish casual outfit.',
    price: 29.99,
    discountedPrice: 24.99,
    category: 'T-Shirts',
    parentCategory: 'Tops',
    rating: 4.8,
    reviewsCount: 142,
    mainImages: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800',
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800',
    ],
    colorVariants: [
      {
        name: 'Black',
        colorCode: '#000000',
        images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800'],
        stocks: [
          { size: 'S', quantity: 15 },
          { size: 'M', quantity: 24 },
          { size: 'L', quantity: 10 },
          { size: 'XL', quantity: 5 },
        ],
      },
      {
        name: 'White',
        colorCode: '#FFFFFF',
        images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
        stocks: [
          { size: 'S', quantity: 20 },
          { size: 'M', quantity: 30 },
          { size: 'L', quantity: 18 },
          { size: 'XL', quantity: 12 },
        ],
      },
      {
        name: 'Gray',
        colorCode: '#808080',
        images: ['https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800'],
        stocks: [
          { size: 'S', quantity: 8 },
          { size: 'M', quantity: 15 },
          { size: 'L', quantity: 7 },
        ],
      },
    ],
    sizes: [
      {
        name: 'S',
        productMeasurements: [
          { name: 'Chest', value: '38', unit: 'in' },
          { name: 'Length', value: '27.5', unit: 'in' },
        ],
      },
      {
        name: 'M',
        productMeasurements: [
          { name: 'Chest', value: '40', unit: 'in' },
          { name: 'Length', value: '28.5', unit: 'in' },
        ],
      },
      {
        name: 'L',
        productMeasurements: [
          { name: 'Chest', value: '42', unit: 'in' },
          { name: 'Length', value: '29.5', unit: 'in' },
        ],
      },
      {
        name: 'XL',
        productMeasurements: [
          { name: 'Chest', value: '44', unit: 'in' },
          { name: 'Length', value: '30.5', unit: 'in' },
        ],
      },
    ],
    featured: true,
    tags: ['new', 'basic', 'cotton'],
  },
  {
    id: 'prod-2',
    name: 'Classic Vintage Denim Jacket',
    brand: 'Celebs Denim',
    description: 'A timeless vintage-wash denim jacket designed with robust metal buttons, button-flap chest pockets, and welt hand pockets. Cut from premium heavyweight cotton denim that will break in beautifully over time.',
    price: 89.99,
    category: 'Jackets & Coats',
    parentCategory: 'Jackets',
    rating: 4.7,
    reviewsCount: 88,
    mainImages: [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
      'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=800',
    ],
    colorVariants: [
      {
        name: 'Blue',
        colorCode: '#4682B4',
        images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800'],
        stocks: [
          { size: 'S', quantity: 5 },
          { size: 'M', quantity: 12 },
          { size: 'L', quantity: 8 },
          { size: 'XL', quantity: 2 },
        ],
      },
      {
        name: 'Black',
        colorCode: '#1A1A1A',
        images: ['https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?w=800'],
        stocks: [
          { size: 'S', quantity: 4 },
          { size: 'M', quantity: 9 },
          { size: 'L', quantity: 11 },
          { size: 'XL', quantity: 6 },
        ],
      },
    ],
    sizes: [
      { name: 'S' },
      { name: 'M' },
      { name: 'L' },
      { name: 'XL' },
    ],
    featured: true,
    tags: ['trending', 'denim', 'vintage'],
  },
  {
    id: 'prod-3',
    name: 'Modern Stretch Slim Chino',
    brand: 'Celebs Tailoring',
    description: 'Perfect for transitioning from the office to after-hours, these chinos are cut in a sleek, slim silhouette. Engineered from stretch-infused twill cotton, they offer flex and all-day comfort without losing their tailored shape.',
    price: 49.99,
    discountedPrice: 39.99,
    category: 'Pants',
    parentCategory: 'Bottoms',
    rating: 4.6,
    reviewsCount: 119,
    mainImages: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800',
      'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=800',
    ],
    colorVariants: [
      {
        name: 'Brown',
        colorCode: '#A0522D',
        images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'],
        stocks: [
          { size: '30', quantity: 10 },
          { size: '32', quantity: 20 },
          { size: '34', quantity: 15 },
          { size: '36', quantity: 8 },
        ],
      },
    ],
    sizes: [
      { name: '30' },
      { name: '32' },
      { name: '34' },
      { name: '36' },
    ],
    featured: false,
    tags: ['chinos', 'stretch', 'office'],
  },
  {
    id: 'prod-4',
    name: 'Vintage Heavyweight Streetwear Hoodie',
    brand: 'Celebs Street',
    description: 'This oversized drop-shoulder hoodie is cut from 450GSM heavy cotton fleece. Features a double-lined hood (no drawcords for a clean look), a spacious kangaroo pocket, and ribbed cuffs and hem. Heavily washed for a vintage look.',
    price: 64.99,
    category: 'Hoodies & Sweatshirts',
    parentCategory: 'Tops',
    rating: 4.9,
    reviewsCount: 95,
    mainImages: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800',
    ],
    colorVariants: [
      {
        name: 'Green',
        colorCode: '#2E8B57',
        images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'],
        stocks: [
          { size: 'S', quantity: 8 },
          { size: 'M', quantity: 14 },
          { size: 'L', quantity: 12 },
          { size: 'XL', quantity: 6 },
        ],
      },
      {
        name: 'Black',
        colorCode: '#000000',
        images: ['https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800'],
        stocks: [
          { size: 'S', quantity: 10 },
          { size: 'M', quantity: 18 },
          { size: 'L', quantity: 20 },
          { size: 'XL', quantity: 11 },
        ],
      },
    ],
    sizes: [
      { name: 'S' },
      { name: 'M' },
      { name: 'L' },
      { name: 'XL' },
    ],
    featured: true,
    tags: ['streetwear', 'oversized', 'fleece'],
  },
  {
    id: 'prod-5',
    name: 'Retro Canvas Runner Sneakers',
    brand: 'Celebs Shoes',
    description: 'An update to the iconic track shoe, this retro runner features a canvas upper with suede accents. Equipped with a padded collar, cushioned EVA midsole, and a gripped gum rubber outsole for comfort and grip.',
    price: 75.00,
    discountedPrice: 59.99,
    category: 'Sneakers',
    parentCategory: 'Shoes',
    rating: 4.5,
    reviewsCount: 52,
    mainImages: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    ],
    colorVariants: [
      {
        name: 'Yellow',
        colorCode: '#FFD700',
        images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800'],
        stocks: [
          { size: '8', quantity: 6 },
          { size: '9', quantity: 12 },
          { size: '10', quantity: 10 },
          { size: '11', quantity: 5 },
        ],
      },
    ],
    sizes: [
      { name: '8' },
      { name: '9' },
      { name: '10' },
      { name: '11' },
    ],
    featured: false,
    tags: ['retro', 'sneakers', 'canvas'],
  },
];
