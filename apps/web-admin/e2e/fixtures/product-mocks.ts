import { Page } from '@playwright/test';

export const MOCK_CATEGORY_TREE = [
  {
    id: 'cat_men_apparel',
    name: "Men's Apparel",
    slug: 'mens-apparel',
    level: 0,
    path: ["Men's Apparel"],
    hasChildren: true,
    children: [
      {
        id: 'cat_men_tops',
        name: 'Tops & T-Shirts',
        slug: 'tops-and-tshirts',
        parent: 'cat_men_apparel',
        parentCategory: 'cat_men_apparel',
        level: 1,
        path: ["Men's Apparel", 'Tops & T-Shirts'],
        hasChildren: false,
      },
    ],
  },
  {
    id: 'cat_accessories',
    name: 'Accessories & Bags',
    slug: 'accessories-bags',
    level: 0,
    path: ['Accessories & Bags'],
    hasChildren: false,
  },
];

export const MOCK_APPAREL_SCHEMA = [
  {
    name: 'mainImage',
    uiType: 'MainImage',
    label: 'Main Product Images',
    group: 'base',
    required: true,
    visible: true,
  },
  {
    name: 'Material',
    uiType: 'select',
    label: 'Fabric Material',
    group: 'details',
    required: true,
    visible: true,
    dataSource: [
      { label: '100% Cotton', value: 'Cotton' },
      { label: 'Polyester Blend', value: 'Polyester' },
    ],
  },
  {
    name: 'Color',
    uiType: 'multiselect',
    label: 'Available Colors',
    group: 'variant',
    required: true,
    visible: true,
    dataSource: [
      { label: 'Vintage Black', value: 'Black' },
      { label: 'Washed Olive', value: 'Olive' },
    ],
  },
  {
    name: 'Size',
    uiType: 'multiselect',
    label: 'Available Sizes',
    group: 'variant',
    required: true,
    visible: true,
    dataSource: [
      { label: 'Small', value: 'S' },
      { label: 'Medium', value: 'M' },
      { label: 'Large', value: 'L' },
    ],
  },
  {
    name: 'sizes',
    uiType: 'SizeMeasurementsTable',
    label: 'Size Chart Measurements',
    group: 'sale',
    required: false,
    visible: true,
    dataSource: {
      charts: [
        {
          key: 'product',
          label: 'Product Measurements (Garment Flat)',
          columns: ['Bust', 'Length', 'Shoulder'],
        },
        {
          key: 'body',
          label: 'Body Measurements (Wearer Fit Guide)',
          columns: ['Height', 'Weight'],
        },
      ],
    },
  },
  {
    name: 'price',
    uiType: 'number',
    label: 'Regular Price (NPR)',
    group: 'sale',
    required: true,
    visible: true,
  },
];

export const MOCK_SINGLE_ITEM_SCHEMA = [
  {
    name: 'mainImage',
    uiType: 'MainImage',
    label: 'Product Image',
    group: 'base',
    required: true,
    visible: true,
  },
  {
    name: 'Material',
    uiType: 'select',
    label: 'Material',
    group: 'details',
    required: false,
    visible: true,
    dataSource: [
      { label: 'Genuine Leather', value: 'Leather' },
      { label: 'Canvas', value: 'Canvas' },
    ],
  },
  {
    name: 'price',
    uiType: 'number',
    label: 'Regular Price (NPR)',
    group: 'sale',
    required: true,
    visible: true,
  },
];

/**
 * Sets up standard route mocks for categories, schema, media upload, and product creation.
 */
export async function setupProductMocks(page: Page) {
  // Category tree endpoint
  await page.route('**/api/**/category**', async (route) => {
    const url = route.request().url();
    if (url.includes('tree') || url.includes('tree-with-attributes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: MOCK_CATEGORY_TREE,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: MOCK_CATEGORY_TREE,
      }),
    });
  });

  // Dynamic Product Render schema endpoint
  await page.route('**/api/**/product-render**', async (route) => {
    const url = route.request().url();
    const isSingleItem = url.includes('cat_accessories');
    const fields = isSingleItem ? MOCK_SINGLE_ITEM_SCHEMA : MOCK_APPAREL_SCHEMA;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          data: fields,
        },
      }),
    });
  });

  // Media upload endpoint
  await page.route('**/api/**/media/upload**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
            originalname: 'product-cover.jpg',
          },
        ],
      }),
    });
  });

  // Mock product creation, fetch detail, and update endpoints
  await page.route('**/api/**/products/**', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'prod_existing_101',
            name: 'Original Heavyweight Vintage Tee',
            brand: 'Celebs Luxury Studio',
            description: 'Original crafted vintage tee description.',
            categoryId: 'cat_mens_tops',
            subcategoryId: 'cat_mens_tops',
            price: 1800,
            discountedPrice: 1500,
            status: 'draft',
            category: {
              id: 'cat_mens_tops',
              name: 'Tops & T-Shirts',
              slug: 'tops-t-shirts',
              path: "Men's Apparel > Tops & T-Shirts",
              level: 2,
            },
            subcategory: {
              id: 'cat_mens_tops',
              name: 'Tops & T-Shirts',
              slug: 'tops-t-shirts',
              path: "Men's Apparel > Tops & T-Shirts",
              level: 2,
            },
            mainImages: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518'],
            colorVariants: [
              {
                name: 'Vintage Black',
                swatch: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
                images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518'],
              },
            ],
            sizes: [
              {
                name: 'Small',
                productMeasurements: [
                  { name: 'Bust', value: '100', unit: 'cm' },
                  { name: 'Length', value: '70', unit: 'cm' },
                ],
              },
            ],
            skus: [
              {
                sku: 'MOCK-VINTAGE-BLK-S',
                color: 'Vintage Black',
                size: 'Small',
                price: 1800,
                stock: 30,
                available: true,
              },
            ],
            dynamicData: {
              values: {
                Type: 'Casual Shirts',
                'Fit Type': 'Regular Fit',
                sku: {
                  variants: {
                    Color: {
                      'Vintage Black': {
                        Size: {
                          Small: {
                            price: '1800',
                            stock: '30',
                            sellerSku: 'MOCK-VINTAGE-BLK-S',
                            specialPrice: '1500',
                          },
                        },
                      },
                    },
                  },
                },
              },
              variantFields: [
                { ui: 'multiselect', key: 'Color', kind: 'color', label: 'Color' },
                { ui: 'multiselect', key: 'Size', kind: 'size', label: 'Size' },
              ],
              uploadedAssets: {
                colorMeta: {
                  'Vintage Black': {
                    hot: false,
                    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518'],
                    swatch: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518',
                  },
                },
                mainImages: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518'],
              },
            },
            createdAt: new Date().toISOString(),
          },
        }),
      });
      return;
    }

    if (method === 'PUT') {
      const putData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Product updated successfully',
          data: {
            id: 'prod_existing_101',
            ...putData,
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  // Mock product list / creation endpoint
  await page.route('**/api/**/products', async (route) => {
    if (route.request().method() === 'POST') {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Product created successfully',
          data: {
            id: 'prod_mock_created_01',
            ...postData,
            createdAt: new Date().toISOString(),
          },
        }),
      });
      return;
    }
    await route.continue();
  });
}
