// ============================================================================
// Shein Stealth Product Extractor (Celebs Production Edition v5.0)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Message Listeners (Extension Popup Communication)
// ----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // A. Collect all product links from category / recommendation page
  if (request.action === 'collectLinks') {
    const rawAnchors = Array.from(
      document.querySelectorAll(
        'a[href*="-p-"], .product-card a, .S-product-item__img-container a, .product-list__item a, .c-goodsitem__goods-name a',
      ),
    );

    const validLinks = [];
    const seen = new Set();

    for (const a of rawAnchors) {
      const href = a.href;
      if (!href || !href.includes('-p-')) continue;
      const cleanUrl = href.split('?')[0];
      if (!seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        validLinks.push(cleanUrl);
      }
    }

    sendResponse({ links: validLinks });
    return true;
  }

  // B. Synchronously extract the current active product page (Single Item Mode)
  if (request.action === 'extractCurrentProduct') {
    const usdRate = request.usdRate || 135;
    const markup = request.markup || 1.15;
    const defaultStock = request.defaultStock !== undefined ? request.defaultStock : 30;
    const catalogTarget = request.catalogTarget || '1p';

    runCelebsProductExtractor(usdRate, markup, defaultStock, catalogTarget)
      .then((res) => {
        sendResponse({ success: true, result: res });
      })
      .catch((err) => {
        console.error('❌ Extract error:', err);
        sendResponse({ success: false, error: err.message || String(err) });
      });
    return true; // Keep channel open for async response
  }

  return true;
});

// ----------------------------------------------------------------------------
// 2. Canonical Celebs Category Taxonomy (Aligned with seed-categories-men.ts)
// ----------------------------------------------------------------------------
const CELEBS_CATEGORY_TAXONOMY = [
  // --- 1. Men Denim ---
  {
    keywords: [
      'denim jacket',
      'denim jackets',
      'trucker jacket',
      'jean jacket',
      'denim trucker',
      'denim single-breasted',
    ],
    category: 'Men Denim',
    categorySlug: 'men-denim',
    subcategory: 'Men Denim Jackets',
    subcategoryId: 'men-denim-jackets',
    path: 'men/men-denim/men-denim-jackets',
  },
  {
    keywords: [
      'denim shirt',
      'denim tops',
      'denim top',
      'chambray shirt',
      'chambray top',
      'denim button down',
    ],
    category: 'Men Denim',
    categorySlug: 'men-denim',
    subcategory: 'Men Denim Tops',
    subcategoryId: 'men-denim-tops',
    path: 'men/men-denim/men-denim-tops',
  },
  {
    keywords: ['denim shorts', 'jorts', 'jean shorts', 'denim bermuda'],
    category: 'Men Denim',
    categorySlug: 'men-denim',
    subcategory: 'Men Denim Shorts',
    subcategoryId: 'men-denim-shorts',
    path: 'men/men-denim/men-denim-shorts',
  },
  {
    keywords: [
      'jeans',
      'jean',
      'denim pants',
      'ripped jeans',
      'baggy jeans',
      'straight leg jeans',
      'straight jeans',
      'wide leg jeans',
      'flare jeans',
      'skinny jeans',
      'carpenter jeans',
    ],
    category: 'Men Denim',
    categorySlug: 'men-denim',
    subcategory: 'Men Jeans',
    subcategoryId: 'men-jeans',
    path: 'men/men-denim/men-jeans',
  },

  // --- 2. Men Hoodies & Sweatshirts ---
  {
    keywords: [
      'zip hoodie',
      'zip-up hoodie',
      'zipper hoodie',
      'full zip hoodie',
      'zip up sweatshirt',
      'zip up jacket hoodie',
    ],
    category: 'Men Hoodies & Sweatshirts',
    categorySlug: 'men-hoodies-sweatshirts',
    subcategory: 'Men Zip-up Hoodies',
    subcategoryId: 'men-zip-up-hoodies',
    path: 'men/men-hoodies-sweatshirts/men-zip-up-hoodies',
  },
  {
    keywords: [
      'hoodie',
      'hoodies',
      'pullover hoodie',
      'hooded sweatshirt',
      'fleece hoodie',
      'oversized hoodie',
    ],
    category: 'Men Hoodies & Sweatshirts',
    categorySlug: 'men-hoodies-sweatshirts',
    subcategory: 'Men Hoodies',
    subcategoryId: 'men-hoodies',
    path: 'men/men-hoodies-sweatshirts/men-hoodies',
  },
  {
    keywords: [
      'sweatshirt',
      'sweatshirts',
      'crewneck sweatshirt',
      'crew neck sweatshirt',
      'pullover sweatshirt',
    ],
    category: 'Men Hoodies & Sweatshirts',
    categorySlug: 'men-hoodies-sweatshirts',
    subcategory: 'Men Sweatshirts',
    subcategoryId: 'men-sweatshirts',
    path: 'men/men-hoodies-sweatshirts/men-sweatshirts',
  },

  // --- 3. Men Suits & Separates ---
  {
    keywords: ['blazer', 'blazers', 'suit jacket', 'sport coat', 'tailored jacket'],
    category: 'Men Suits & Separates',
    categorySlug: 'men-suits-separates',
    subcategory: 'Men Blazers',
    subcategoryId: 'men-blazers',
    path: 'men/men-suits-separates/men-blazers',
  },
  {
    keywords: ['suit pants', 'suit pant', 'suit trousers', 'dress trousers'],
    category: 'Men Suits & Separates',
    categorySlug: 'men-suits-separates',
    subcategory: 'Men Suit Pants',
    subcategoryId: 'men-suit-pants',
    path: 'men/men-suits-separates/men-suit-pants',
  },
  {
    keywords: ['suit', 'suits', 'tuxedo', '2 piece suit', '3 piece suit', 'suit set'],
    category: 'Men Suits & Separates',
    categorySlug: 'men-suits-separates',
    subcategory: 'Men Suits',
    subcategoryId: 'men-suits',
    path: 'men/men-suits-separates/men-suits',
  },

  // --- 4. Men Knitwear ---
  {
    keywords: [
      'knit top',
      'knit tops',
      'knitted top',
      'crochet top',
      'hollow out top',
      'open knit top',
    ],
    category: 'Men Knitwear',
    categorySlug: 'men-knitwear',
    subcategory: 'Men Knit Tops',
    subcategoryId: 'men-knit-tops',
    path: 'men/men-knitwear/men-knit-tops',
  },
  {
    keywords: [
      'sweater',
      'sweaters',
      'cardigan',
      'knit cardigan',
      'pullover sweater',
      'cable knit',
      'turtleneck',
      'crewneck sweater',
      'v-neck sweater',
    ],
    category: 'Men Knitwear',
    categorySlug: 'men-knitwear',
    subcategory: 'Men Sweaters',
    subcategoryId: 'men-sweaters',
    path: 'men/men-knitwear/men-sweaters',
  },

  // --- 5. Men Outerwear ---
  {
    keywords: [
      'winter coat',
      'puffer jacket',
      'puffer coat',
      'puffer',
      'down jacket',
      'down coat',
      'parka',
      'trench coat',
      'overcoat',
      'fleece coat',
      'shearling coat',
      'wool coat',
      'quilted jacket',
    ],
    category: 'Men Outerwear',
    categorySlug: 'men-outerwear',
    subcategory: 'Men Winter Coats',
    subcategoryId: 'men-winter-coats',
    path: 'men/men-outerwear/men-winter-coats',
  },
  {
    keywords: ['shacket', 'shackets', 'shirt jacket', 'overshirt', 'plaid shacket'],
    category: 'Men Outerwear',
    categorySlug: 'men-outerwear',
    subcategory: 'Men Shackets',
    subcategoryId: 'men-shackets',
    path: 'men/men-outerwear/men-shackets',
  },
  {
    keywords: [
      'jacket',
      'jackets',
      'bomber',
      'bomber jacket',
      'windbreaker',
      'varsity jacket',
      'coach jacket',
      'biker jacket',
      'motorcycle jacket',
      'harrington jacket',
      'coat',
      'coats',
    ],
    category: 'Men Outerwear',
    categorySlug: 'men-outerwear',
    subcategory: 'Men Jackets and Coats',
    subcategoryId: 'men-jackets-and-coats',
    path: 'men/men-outerwear/men-jackets-and-coats',
  },

  // --- 6. Men Traditional & Cultural Wear ---
  {
    keywords: ['kurta', 'suruwal', 'kurta pajama', 'kurta set', 'daura suruwal'],
    category: 'Men Traditional & Cultural Wear',
    categorySlug: 'men-traditional-cultural-wear',
    subcategory: 'Men Kurta & Suruwal Sets',
    subcategoryId: 'men-kurta-suruwal-sets',
    path: 'men/men-traditional-cultural-wear/men-kurta-suruwal-sets',
  },
  {
    keywords: [
      'nehru jacket',
      'modi jacket',
      'waistcoat',
      'traditional waistcoat',
      'mandarin vest',
    ],
    category: 'Men Traditional & Cultural Wear',
    categorySlug: 'men-traditional-cultural-wear',
    subcategory: 'Men Nehru Jackets & Waistcoats',
    subcategoryId: 'men-nehru-jackets-waistcoats',
    path: 'men/men-traditional-cultural-wear/men-nehru-jackets-waistcoats',
  },
  {
    keywords: [
      'asian wear',
      'chinese collar',
      'mandarin collar',
      'hanfu',
      'tang suit',
      'oriental shirt',
    ],
    category: 'Men Traditional & Cultural Wear',
    categorySlug: 'men-traditional-cultural-wear',
    subcategory: 'Men Asian Wear',
    subcategoryId: 'men-asian-wear',
    path: 'men/men-traditional-cultural-wear/men-asian-wear',
  },

  // --- 7. Men Tops ---
  {
    keywords: ['polo shirt', 'polo shirts', 'polo', 'polos', 'knit polo'],
    category: 'Men Tops',
    categorySlug: 'men-tops',
    subcategory: 'Men Polo Shirts',
    subcategoryId: 'men-polo-shirts',
    path: 'men/men-tops/men-polo-shirts',
  },
  {
    keywords: [
      't-shirt',
      't-shirts',
      'graphic tee',
      'oversized tee',
      'tee',
      'tees',
      'short sleeve tee',
    ],
    category: 'Men Tops',
    categorySlug: 'men-tops',
    subcategory: 'Men T-Shirts',
    subcategoryId: 'men-t-shirts',
    path: 'men/men-tops/men-t-shirts',
  },
  {
    keywords: ['tank top', 'tank tops', 'sleeveless top', 'sleeveless shirt', 'vest top'],
    category: 'Men Tops',
    categorySlug: 'men-tops',
    subcategory: 'Men Tank Tops',
    subcategoryId: 'men-tank-tops',
    path: 'men/men-tops/men-tank-tops',
  },
  {
    keywords: [
      'shirt',
      'shirts',
      'button up',
      'button down',
      'oxford shirt',
      'dress shirt',
      'casual shirt',
      'hawaiian shirt',
      'flannel shirt',
      'linen shirt',
    ],
    category: 'Men Tops',
    categorySlug: 'men-tops',
    subcategory: 'Men Shirts',
    subcategoryId: 'men-shirts',
    path: 'men/men-tops/men-shirts',
  },

  // --- 8. Men Bottoms ---
  {
    keywords: [
      'sweatpant',
      'sweatpants',
      'jogger',
      'joggers',
      'track pants',
      'track pant',
      'fleece pants',
    ],
    category: 'Men Bottoms',
    categorySlug: 'men-bottoms',
    subcategory: 'Men Sweatpants',
    subcategoryId: 'men-sweatpants',
    path: 'men/men-bottoms/men-sweatpants',
  },
  {
    keywords: [
      'shorts',
      'short',
      'cargo shorts',
      'sweat shorts',
      'bermuda',
      'running shorts',
      'athletic shorts',
      'board shorts',
    ],
    category: 'Men Bottoms',
    categorySlug: 'men-bottoms',
    subcategory: 'Men Shorts',
    subcategoryId: 'men-shorts',
    path: 'men/men-bottoms/men-shorts',
  },
  {
    keywords: [
      'pants',
      'pant',
      'chinos',
      'cargo pants',
      'slacks',
      'parachute pants',
      'dress pants',
      'trousers',
      'casual pants',
    ],
    category: 'Men Bottoms',
    categorySlug: 'men-bottoms',
    subcategory: 'Men Pants',
    subcategoryId: 'men-pants',
    path: 'men/men-bottoms/men-pants',
  },

  // --- 9. Men Shoes & Footwear ---
  {
    keywords: [
      'sneaker',
      'sneakers',
      'running shoes',
      'tennis shoes',
      'athletic shoes',
      'trainers',
      'walking shoes',
    ],
    category: 'Men Shoes & Footwear',
    categorySlug: 'men-shoes-footwear',
    subcategory: 'Men Sneakers & Athletic Shoes',
    subcategoryId: 'men-sneakers-athletic-shoes',
    path: 'men/men-shoes-footwear/men-sneakers-athletic-shoes',
  },
  {
    keywords: [
      'loafer',
      'loafers',
      'oxford shoes',
      'derby shoes',
      'monk strap',
      'dress shoes',
      'formal shoes',
      'brogues',
    ],
    category: 'Men Shoes & Footwear',
    categorySlug: 'men-shoes-footwear',
    subcategory: 'Men Loafers & Dress Shoes',
    subcategoryId: 'men-loafers-dress-shoes',
    path: 'men/men-shoes-footwear/men-loafers-dress-shoes',
  },
  {
    keywords: [
      'boot',
      'boots',
      'chelsea boot',
      'chelsea boots',
      'combat boot',
      'combat boots',
      'ankle boot',
      'work boots',
    ],
    category: 'Men Shoes & Footwear',
    categorySlug: 'men-shoes-footwear',
    subcategory: 'Men Boots',
    subcategoryId: 'men-boots',
    path: 'men/men-shoes-footwear/men-boots',
  },
  {
    keywords: ['slide', 'slides', 'sandal', 'sandals', 'flip flop', 'slippers', 'mules'],
    category: 'Men Shoes & Footwear',
    categorySlug: 'men-shoes-footwear',
    subcategory: 'Men Slides & Sandals',
    subcategoryId: 'men-slides-sandals',
    path: 'men/men-shoes-footwear/men-slides-sandals',
  },
];

/**
 * Intelligent Category Matcher: checks breadcrumbs and title against the canonical taxonomy.
 * Guaranteed to match compound and specific items before generic items.
 */
function resolveCelebsCategory(rawBreadcrumbs = [], title = '') {
  const combinedContext = [...rawBreadcrumbs, title].join(' ').toLowerCase();

  for (const item of CELEBS_CATEGORY_TAXONOMY) {
    for (const kw of item.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(combinedContext)) {
        return {
          category: item.category,
          categorySlug: item.categorySlug,
          subcategory: item.subcategory,
          subcategoryId: item.subcategoryId,
          categoryPath: `${item.category} / ${item.subcategory}`,
          path: item.path,
        };
      }
    }
  }

  // Fallback defaults to Men Outerwear / Men Jackets and Coats
  return {
    category: 'Men Outerwear',
    categorySlug: 'men-outerwear',
    subcategory: 'Men Jackets and Coats',
    subcategoryId: 'men-jackets-and-coats',
    categoryPath: 'Men Outerwear / Men Jackets and Coats',
    path: 'men/men-outerwear/men-jackets-and-coats',
  };
}

// ----------------------------------------------------------------------------
// 3. Category Physical Specs for Pathao Parcel & Shipping
// ----------------------------------------------------------------------------
function getCategoryPhysicalSpecs(subcategoryId) {
  const sub = String(subcategoryId || '').toLowerCase();

  if (
    sub.includes('jacket') ||
    sub.includes('coat') ||
    sub.includes('shacket') ||
    sub.includes('blazer') ||
    sub.includes('suit')
  ) {
    return {
      packageWeightKg: 0.85,
      packageLengthCm: 38,
      packageWidthCm: 30,
      packageHeightCm: 8,
      packagingType: 'FLYER_LARGE',
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '6 Months',
      warrantyPolicy: '6 months coverage against stitching and hardware defects.',
    };
  }

  if (sub.includes('jean') || sub.includes('pant') || sub.includes('bottom')) {
    return {
      packageWeightKg: 0.65,
      packageLengthCm: 35,
      packageWidthCm: 28,
      packageHeightCm: 6,
      packagingType: 'FLYER_MEDIUM',
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '3 Months',
      warrantyPolicy: '3 months coverage against fabric tears and zipper defects.',
    };
  }

  if (sub.includes('sweater') || sub.includes('hoodie') || sub.includes('sweatshirt')) {
    return {
      packageWeightKg: 0.6,
      packageLengthCm: 35,
      packageWidthCm: 28,
      packageHeightCm: 6,
      packagingType: 'FLYER_MEDIUM',
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '3 Months',
      warrantyPolicy: '3 months coverage against knit unraveling and seam failure.',
    };
  }

  if (
    sub.includes('shoe') ||
    sub.includes('boot') ||
    sub.includes('sneaker') ||
    sub.includes('loafer')
  ) {
    return {
      packageWeightKg: 1.1,
      packageLengthCm: 34,
      packageWidthCm: 24,
      packageHeightCm: 14,
      packagingType: 'BOX_STANDARD',
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '6 Months',
      warrantyPolicy: '6 months coverage against sole separation and stitching.',
    };
  }

  // Lightweight tops & shorts
  return {
    packageWeightKg: 0.25,
    packageLengthCm: 30,
    packageWidthCm: 22,
    packageHeightCm: 3,
    packagingType: 'FLYER_SMALL',
    warrantyType: 'BRAND_WARRANTY',
    warrantyPeriod: '1 Month',
    warrantyPolicy: '1 month coverage against manufacturing defects.',
  };
}

// ----------------------------------------------------------------------------
// 4. Color Palette & Fuzzy Resolution (Never outputs #4A5568 or "Default")
// ----------------------------------------------------------------------------
const COLOR_HEX_MAP = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  brown: '#8B4513',
  'coffee brown': '#4B2E1A',
  'dark brown': '#3D2314',
  'chocolate brown': '#3D2314',
  'mocha brown': '#5A3D28',
  'rust brown': '#8B3103',
  rust: '#B7410E',
  grey: '#808080',
  gray: '#808080',
  'dark grey': '#4A4A4A',
  'dark gray': '#4A4A4A',
  'light grey': '#D3D3D3',
  'light gray': '#D3D3D3',
  charcoal: '#36454F',
  'slate grey': '#708090',
  'slate gray': '#708090',
  beige: '#D4BE8D',
  cream: '#FFFDD0',
  apricot: '#F5C99B',
  'navy blue': '#1B2A4A',
  navy: '#000080',
  blue: '#1E90FF',
  'dusty blue': '#5A7D9A',
  'baby blue': '#89CFF0',
  'royal blue': '#4169E1',
  'sky blue': '#87CEEB',
  'light blue': '#ADD8E6',
  'denim blue': '#2B547E',
  'washed blue': '#3D5C8A',
  'washed black': '#2B2B2B',
  green: '#2E8B57',
  'army green': '#4B5320',
  'dark green': '#1B4D3E',
  'mint green': '#98FF98',
  'olive green': '#556B2F',
  olive: '#808000',
  'sage green': '#9DC183',
  'forest green': '#228B22',
  emerald: '#50C878',
  khaki: '#C3B091',
  camel: '#C19A6B',
  tan: '#D2B48C',
  sand: '#C2B280',
  taupe: '#483C32',
  terracotta: '#E2725B',
  burgundy: '#800020',
  maroon: '#800000',
  'wine red': '#722F37',
  red: '#C0392B',
  'brick red': '#8F1402',
  pink: '#F4A7C3',
  'baby pink': '#F4C2C2',
  'mauve purple': '#915F6D',
  mauve: '#915F6D',
  purple: '#800080',
  lavender: '#E6E6FA',
  lilac: '#C8A2C8',
  orange: '#E67E22',
  'coral orange': '#FF7F50',
  yellow: '#FFD700',
  'mustard yellow': '#FFDB58',
  mustard: '#FFDB58',
  teal: '#008080',
  turquoise: '#40E0D0',
  cyan: '#00FFFF',
  'off white': '#FAF9F6',
  ivory: '#FFFFF0',
  multicolor: '#4A90E2',
  'black and white': '#2B2B2B',
};

function resolveColorHex(colorName) {
  const raw = String(colorName || '')
    .trim()
    .toLowerCase();
  if (!raw || raw === 'default') return '#1A1A1A';

  if (COLOR_HEX_MAP[raw]) return COLOR_HEX_MAP[raw];

  // Fuzzy multi-word matcher
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (key.includes(' ') && raw.includes(key)) {
      return hex;
    }
  }

  // Single-word keyword matcher
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (!key.includes(' ') && new RegExp(`\\b${key}\\b`, 'i').test(raw)) {
      return hex;
    }
  }

  return '#2B2B2B';
}

function toTitleCase(str) {
  return String(str || '')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ----------------------------------------------------------------------------
// 5. Smart Brand Detector (Excludes "Men's", "Casual", etc.)
// ----------------------------------------------------------------------------
const KNOWN_SHEIN_BRANDS = [
  'Manfinity',
  'DAZY',
  'ROMWE',
  'MOTF',
  'QuarKem',
  'SHEIN',
  'Emery Rose',
  'LUVLETTE',
  'GLOWMODE',
  'EvoluShein',
  'CUCCOO',
  'KOTOMI',
  'JOHNNY',
  'SHEIN BIZwear',
  'SHEIN MOD',
  'SHEIN EZwear',
  'SHEIN ICON',
  'SHEIN BASICS',
  'SHEIN Frenchy',
  'SHEIN Coolane',
  'SHEIN VCAY',
  'SHEIN Belle',
  'SHEIN Slayr',
];

const GENERIC_TITLE_PREFIXES = new Set([
  "men's",
  'mens',
  "women's",
  'womens',
  'boys',
  'girls',
  'unisex',
  'casual',
  'vintage',
  'solid',
  'new',
  'summer',
  'winter',
  'spring',
  'autumn',
  'fall',
  'fashion',
  'oversized',
  'loose',
  'slim',
  'classic',
  'basic',
  'trendy',
  'streetwear',
  'retro',
]);

function detectBrand(title = '', attributes = {}, catalogTarget = '1p') {
  if (catalogTarget === '1p') return 'Celebs Official';

  if (attributes['Brand']) {
    const raw = attributes['Brand'].trim();
    if (!GENERIC_TITLE_PREFIXES.has(raw.toLowerCase())) return raw;
  }

  for (const b of KNOWN_SHEIN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(title)) {
      return b;
    }
  }

  return 'Generic / Unbranded';
}

// ----------------------------------------------------------------------------
// 6. Description & Attribute Parser
// ----------------------------------------------------------------------------
function parseDescriptionAttributes(rawDesc) {
  const attributes = {};
  if (!rawDesc) return { attributes, extractedSku: '', cleanSummary: '' };

  const lines = rawDesc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let extractedSku = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(':')) {
      const idx = line.indexOf(':');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key && val) {
        if (key.toUpperCase() === 'SKU') extractedSku = val;
        else if (key === 'Details') attributes[key] = val.split(',').map((s) => s.trim());
        else attributes[key] = val;
        continue;
      }
    }

    if (line.endsWith(':') && i + 1 < lines.length) {
      const key = line.slice(0, -1).trim();
      const val = lines[i + 1].trim();
      if (key && val && !val.endsWith(':')) {
        if (key.toUpperCase() === 'SKU') extractedSku = val;
        else if (key === 'Details') attributes[key] = val.split(',').map((s) => s.trim());
        else attributes[key] = val;
        i++;
      }
    }
  }

  const style = attributes['Style'] || 'Casual';
  const fit = attributes['Fit Type'] || 'Regular Fit';
  const material = attributes['Material'] || attributes['Composition'] || 'Cotton Blend';
  const care = attributes['Care Instructions'] || 'Machine wash cold or professional dry clean';
  const cleanSummary = `Style: ${style}. Fit: ${fit}. Material: ${material}. Care: ${care}.`;

  return { attributes, extractedSku, cleanSummary };
}

// ----------------------------------------------------------------------------
// 7. Sizing & Measurement Parsers (Product Table & Body Table)
// ----------------------------------------------------------------------------
function parseTableBlock(rawText) {
  if (!rawText) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i].split(/[\t\s]{2,}|\t/).map((t) => t.trim().toLowerCase());
    if (tokens.includes('size')) {
      headerIdx = i;
      headers = tokens;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const rawDataRows = [];
  const sampleValues = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('*') || line.toLowerCase().includes('data was obtained')) break;

    const cells = line.split(/[\t\s]{2,}|\t/).map((c) => c.trim());
    if (cells.length < 2) continue;

    rawDataRows.push(cells);
    for (let c = 1; c < cells.length; c++) {
      const v = parseFloat(cells[c]);
      if (!isNaN(v) && v > 0) sampleValues.push(v);
    }
  }

  let isInch = false;
  if (sampleValues.length > 0) {
    const avg = sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length;
    isInch = avg < 55;
  } else {
    isInch = rawText.includes('Switch to\nType\nCM') || rawText.includes('\tIN\t');
  }

  const factor = isInch ? 2.54 : 1.0;
  const resultChart = [];

  for (const cells of rawDataRows) {
    const row = { size: cells[0].toUpperCase() };
    for (let c = 1; c < cells.length && c < headers.length; c++) {
      const h = headers[c];
      if (!h || h === 'size') continue;

      const camelKey = h
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .map((w, idx) =>
          idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        )
        .join('');

      const val = parseFloat(cells[c]);
      if (camelKey && !isNaN(val)) {
        let cmVal = val * factor;
        if (cmVal > 220 && !camelKey.toLowerCase().includes('height')) {
          cmVal = cmVal / 2.54;
        }
        row[camelKey] = Math.round(cmVal * 10) / 10;
      }
    }
    resultChart.push(row);
  }

  return resultChart;
}

// ----------------------------------------------------------------------------
// 8. Real Price & NPR Currency Conversion
// ----------------------------------------------------------------------------
function extractSheinRealPrice() {
  // 1. JSON-LD
  try {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const script of scripts) {
      const data = JSON.parse(script.textContent || '{}');
      const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
      const productObj = items.find(
        (i) => i['@type'] === 'Product' || i['@type'] === 'ProductGroup',
      );

      if (productObj) {
        if (productObj.offers) {
          const offer = Array.isArray(productObj.offers) ? productObj.offers[0] : productObj.offers;
          if (offer && offer.price) {
            const parsed = parseFloat(offer.price);
            if (!isNaN(parsed) && parsed > 0) return parsed;
          }
        }
        if (Array.isArray(productObj.hasVariant) && productObj.hasVariant[0]?.offers?.price) {
          const parsed = parseFloat(productObj.hasVariant[0].offers.price);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
    }
  } catch (_e) {}

  // 2. DOM Elements
  const priceElements = Array.from(
    document.querySelectorAll(
      '.product-intro__head-price, .original.from, [class*="discount-price"], .from, [class*="head-price"], [class*="product-price"]',
    ),
  );

  for (const el of priceElements) {
    const text = el.textContent || '';
    const match = text.match(/[$£€]?\s*([0-9]+(\.[0-9]{1,2})?)/);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0 && parsed < 600) {
        return parsed;
      }
    }
  }

  return 24.99; // Baseline USD fallback
}

function calculateNprPrices(usdPrice, usdToNprRate = 135, markupMultiplier = 1.15) {
  const saleNpr = Math.round((usdPrice * usdToNprRate * markupMultiplier) / 10) * 10;
  const retailNpr = Math.round((saleNpr * 1.18) / 10) * 10;
  return {
    price: retailNpr,
    discountedPrice: saleNpr,
  };
}

// ----------------------------------------------------------------------------
// 9. Simulation & Anti-Bot Bypass Helpers
// ----------------------------------------------------------------------------
const humanDelay = (min, max) =>
  new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function humanScroll(targetY, duration = 600) {
  const currentY = window.scrollY;
  const delta = targetY - currentY;
  const steps = Math.floor(8 + Math.random() * 6);
  const stepDist = delta / steps;

  for (let i = 0; i < steps; i++) {
    const jitter = (Math.random() - 0.48) * 12;
    window.scrollBy({ top: stepDist + jitter, behavior: 'smooth' });
    await humanDelay((duration / steps) * 0.7, (duration / steps) * 1.3);
  }
}

async function humanClick(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width * (0.3 + Math.random() * 0.4);
  const y = rect.top + rect.height * (0.3 + Math.random() * 0.4);
  const eventOpts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

  el.dispatchEvent(new PointerEvent('pointerover', eventOpts));
  el.dispatchEvent(new MouseEvent('mouseover', eventOpts));
  await humanDelay(30, 80);

  el.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
  el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
  await humanDelay(40, 100);

  el.dispatchEvent(new PointerEvent('pointerup', eventOpts));
  el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
  await humanDelay(20, 60);

  el.click();
}

function checkAntiBotChallenge() {
  const href = window.location.href.toLowerCase();
  if (href.includes('risk/challenge') || href.includes('captcha')) return true;

  const hasSlider = document.querySelector(
    '.geetest_holder, .geetest_popup_wrap, [class*="geetest"], [class*="captcha"], #captcha-container',
  );
  if (hasSlider) return true;

  const bodyText = document.body ? document.body.innerText : '';
  return (
    bodyText.includes('Please slide to complete the puzzle') ||
    bodyText.includes('Verify you are human') ||
    bodyText.includes('Access Denied')
  );
}

async function ensureNoAntiBotChallenge() {
  if (!checkAntiBotChallenge()) return;

  console.warn('⚠️ Anti-bot verification detected. Pausing extractor for human resolution...');

  let hud = document.getElementById('shein-extractor-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'shein-extractor-hud';
    hud.style.cssText =
      'position:fixed;top:15px;left:50%;transform:translateX(-50%);z-index:999999;background:#fff3cd;color:#856404;border:2px solid #ffeeba;padding:16px 24px;border-radius:8px;font-size:15px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.18);font-family:sans-serif;text-align:center;';
    hud.innerHTML =
      '⚠️ Shein Verification Required<br><span style="font-size:12px;font-weight:normal;">Please solve the puzzle or verification challenge above. The extractor will automatically resume once verified.</span>';
    document.body.appendChild(hud);
  }

  while (checkAntiBotChallenge()) {
    await humanDelay(2000, 3000);
  }

  if (hud) hud.remove();
  console.log('✅ Challenge cleared! Resuming extractor in 3 seconds...');
  await humanDelay(3000, 4500);
}

// ----------------------------------------------------------------------------
// 10. High-Resolution Image Sanitizer
// ----------------------------------------------------------------------------
function cleanProductImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();

  if (url.startsWith('//')) url = 'https:' + url;
  if (url.includes('.html') || url.includes('.php') || url.includes('-p-')) return null;
  if (/\.(png|gif|svg|ico)(\?|$)/i.test(url)) return null;
  if (
    /(banner|coupon|badge|promo|icon|logo|avatar|delivery|return|guarantee|rank|bg-grey|arrow|goods_tag|images3_pi\/2023\/11\/29\/d5)/i.test(
      url,
    )
  ) {
    return null;
  }

  if (!url.includes('img.ltwebstatic.com') && !url.includes('shein.com')) return null;

  url = url
    .replace(/_thumbnail_[a-zA-Z0-9x_]+/gi, '')
    .replace(/_\d+x\d+(?=\.(webp|jpe?g))/gi, '')
    .replace(/\?.*$/, '')
    .replace(/x\.(webp|jpe?g)$/i, '.$1');

  if (!/\.(webp|jpe?g)$/i.test(url)) return null;
  return url;
}

function extractSwatchUrl(element) {
  if (!element) return null;

  const img = element.querySelector('img');
  if (img) {
    const url =
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-origin-src') ||
      img.currentSrc ||
      img.src;
    const cleaned = cleanProductImageUrl(url);
    if (cleaned) return cleaned;
  }

  const bg = window.getComputedStyle(element).backgroundImage || '';
  const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
  if (match && match[1]) {
    const cleaned = cleanProductImageUrl(match[1]);
    if (cleaned) return cleaned;
  }

  return null;
}

// ----------------------------------------------------------------------------
// 11. Main Product Extractor Routine
// ----------------------------------------------------------------------------
async function runCelebsProductExtractor(
  usdRate = 135,
  markup = 1.15,
  defaultStock = 30,
  catalogTarget = '1p',
) {
  await ensureNoAntiBotChallenge();

  // 1. Smooth landing simulation
  await humanScroll(240 + Math.random() * 100, 500);
  await humanDelay(1500, 2500);
  await ensureNoAntiBotChallenge();

  // 2. Expand Description Accordion
  const descToggle = document.querySelector('.common-entry__top');
  if (descToggle) {
    await humanClick(descToggle);
    await humanDelay(800, 1400);
  }

  // 3. Expand Size & Fit Accordion & Switch Tabs
  let rawProductMeasurements = '';
  let rawBodyMeasurements = '';

  const sizeFitEntry = Array.from(document.querySelectorAll('.common-entry__container')).find(
    (el) => el.innerText.includes('Size & Fit'),
  );

  if (sizeFitEntry) {
    const toggle = sizeFitEntry.querySelector('.common-entry__top');
    if (toggle) {
      await humanClick(toggle);
      await humanDelay(900, 1600);
    }

    // Switch to CM if unit toggle exists
    const cmSwitch = Array.from(sizeFitEntry.querySelectorAll('button, span, div')).find(
      (el) => el.textContent.trim() === 'CM',
    );
    if (cmSwitch) {
      await humanClick(cmSwitch);
      await humanDelay(500, 900);
    }

    // Check for "Product Measurements" vs "Body Measurements" sub-tabs
    const tabElements = Array.from(
      sizeFitEntry.querySelectorAll(
        '.goods-size-intro__tab, .tab-item, [class*="size-tab"], [class*="tab-btn"], button, span',
      ),
    );

    const productTab = tabElements.find((el) =>
      /product\s*(measurements|chart|size)/i.test(el.textContent.trim()),
    );
    const bodyTab = tabElements.find((el) =>
      /body\s*(measurements|chart|size)/i.test(el.textContent.trim()),
    );

    if (productTab) {
      await humanClick(productTab);
      await humanDelay(600, 1000);
      rawProductMeasurements = sizeFitEntry.innerText.trim();
    } else {
      rawProductMeasurements = sizeFitEntry.innerText.trim();
    }

    if (bodyTab) {
      await humanClick(bodyTab);
      await humanDelay(600, 1000);
      rawBodyMeasurements = sizeFitEntry.innerText.trim();
    }
  }

  await humanScroll(100, 300);
  await humanDelay(600, 1000);

  // 4. Extract Title, Description, and Details
  const title =
    document
      .querySelector('h1.fsp-element, h1.product-intro__head-name, h1[class*="head-name"]')
      ?.textContent.trim() || 'Contemporary Fashion Apparel';

  const rawDesc = document.querySelector('.common-entry__content')?.innerText.trim() || '';
  const { attributes, extractedSku, cleanSummary } = parseDescriptionAttributes(rawDesc);

  // Determine fallback color if single-color or swatches unlabelled
  let deducedPrimaryColor = attributes['Color'] || attributes['Wash / Color'] || '';
  if (!deducedPrimaryColor) {
    for (const colorWord of Object.keys(COLOR_HEX_MAP)) {
      if (new RegExp(`\\b${colorWord}\\b`, 'i').test(title)) {
        deducedPrimaryColor = toTitleCase(colorWord);
        break;
      }
    }
  }
  if (!deducedPrimaryColor) deducedPrimaryColor = 'Classic Black';

  // 5. Color Swatches & High-Res Galleries
  const swatches = Array.from(
    document.querySelectorAll(
      '.main-sales-attr__color .radio-container, .product-intro__color-radio, [class*="color-radio"], .goods-color__radio, [class*="goods-color"] .radio-item',
    ),
  );

  const cleanVariations = [];
  const targets = swatches.length > 0 ? swatches : [null];

  for (const s of targets) {
    if (s) {
      await humanClick(s);
      await humanDelay(1600, 2800);
      await ensureNoAntiBotChallenge();
    }

    const rawImages = Array.from(
      document.querySelectorAll(
        '.product-intro__thumbs img, .goods-thumbs img, .goods-thumbs-item img, .product-intro__gallery img, .product-intro__main-img img, .main-picture img, [class*="gallery"] img, [class*="goods-thumb"] img, [class*="slider"] img, [class*="main-img"] img, .swiper-slide img',
      ),
    );

    const swatchImgEl = s ? s.querySelector('img') : null;
    let colorName =
      swatchImgEl?.alt?.trim() ||
      s?.getAttribute('aria-label')?.trim() ||
      s?.title?.trim() ||
      s?.textContent?.trim() ||
      '';

    if (!colorName || colorName.toLowerCase() === 'default') {
      colorName = deducedPrimaryColor;
    }

    const swatchThumbUrl = s ? extractSwatchUrl(s) : null;
    const seenUrls = new Set();
    const cleanImageList = [];

    for (const img of rawImages) {
      if (
        img.closest('.belt-wrapper') ||
        img.closest('.detailpromotionbelt__wrapper') ||
        img.closest('.operational-banner') ||
        img.closest('[class*="banner"]') ||
        img.closest('[class*="coupon"]') ||
        img.closest('[class*="badge"]')
      ) {
        continue;
      }

      const candidateUrl =
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy-src') ||
        img.getAttribute('data-origin-src') ||
        img.currentSrc ||
        img.src;

      const cleaned = cleanProductImageUrl(candidateUrl);
      if (cleaned && !seenUrls.has(cleaned)) {
        seenUrls.add(cleaned);
        cleanImageList.push(cleaned);
      }
    }

    if (cleanImageList.length > 0) {
      cleanVariations.push({
        color: toTitleCase(colorName),
        swatchImage: swatchThumbUrl || cleanImageList[0] || null,
        swatch: swatchThumbUrl || cleanImageList[0] || null,
        images: cleanImageList,
      });
    }
  }

  // Fallback if no images collected via swatches
  if (cleanVariations.length === 0) {
    const allImgs = Array.from(document.querySelectorAll('img'))
      .map((img) => cleanProductImageUrl(img.getAttribute('data-src') || img.src))
      .filter(Boolean);
    const uniqueFallback = Array.from(new Set(allImgs)).slice(0, 8);

    cleanVariations.push({
      color: toTitleCase(deducedPrimaryColor),
      swatchImage: uniqueFallback[0] || null,
      swatch: uniqueFallback[0] || null,
      images: uniqueFallback,
    });
  }

  // 6. Measurements Extraction
  const sizeChart = parseTableBlock(rawProductMeasurements);
  const explicitBodyChart = parseTableBlock(rawBodyMeasurements);

  // Detect out-of-stock sizes on Shein
  const disabledSizeElements = Array.from(
    document.querySelectorAll(
      '.product-intro__size-radio.disabled, .product-intro__size-radio--disabled, [class*="size-item"][class*="disabled"], [class*="size-item"][aria-disabled="true"], button[disabled][class*="size"]',
    ),
  );
  const soldOutSizes = new Set(
    disabledSizeElements.map((el) => el.textContent.trim().toUpperCase()),
  );

  // 7. Category & Brand Resolution
  const rawBreadcrumbs = Array.from(
    document.querySelectorAll(
      '.bread-crumb a, .bread-crumbs a, .bread-crumbs__item, .crumbs-nav a, [class*="breadcrumb"] a',
    ),
  ).map((el) => el.textContent.trim());

  const matchedCategory = resolveCelebsCategory(rawBreadcrumbs, title);
  const brand = detectBrand(title, attributes, catalogTarget);

  // 8. Physical Logistics Specs & Pricing
  const physicalSpecs = getCategoryPhysicalSpecs(matchedCategory.subcategoryId);
  const rawUsdPrice = extractSheinRealPrice();
  const { price: nprRetailPrice, discountedPrice: nprSalePrice } = calculateNprPrices(
    rawUsdPrice,
    usdRate,
    markup,
  );

  // 9. Consolidate Color Variants
  const mergedColorVariantsMap = new Map();
  for (const cv of cleanVariations) {
    const cName = cv.color || toTitleCase(deducedPrimaryColor);
    const swatch = cv.swatch || cv.swatchImage || cv.images[0] || null;

    if (!mergedColorVariantsMap.has(cName)) {
      mergedColorVariantsMap.set(cName, {
        name: cName,
        colorCode: resolveColorHex(cName),
        swatch,
        swatchImage: swatch,
        images: [...cv.images],
        stocks: sizeChart.map((sc) => ({
          size: sc.size,
          quantity: soldOutSizes.has(sc.size.toUpperCase()) ? 0 : defaultStock,
        })),
      });
    } else {
      const existing = mergedColorVariantsMap.get(cName);
      for (const img of cv.images) {
        if (!existing.images.includes(img)) existing.images.push(img);
      }
      if (!existing.swatch && swatch) {
        existing.swatch = swatch;
        existing.swatchImage = swatch;
      }
    }
  }

  const fullColorVariants = Array.from(mergedColorVariantsMap.values());

  // 10. Sizes Payload with Detailed Measurements
  const sizesPayload = sizeChart.map((sc) => {
    const productMeasurements = Object.entries(sc)
      .filter(([key]) => key !== 'size')
      .map(([key, val]) => ({
        name: toTitleCase(key.replace(/([A-Z])/g, ' $1')),
        value: String(val ?? ''),
        unit: 'cm',
      }));

    const s = String(sc.size || '').toUpperCase();
    const matchedBodyRow = explicitBodyChart.find((b) => b.size.toUpperCase() === s);
    let bodyMeasurements = [];

    // Only extract body measurements if Shein actually provides true human body metrics
    if (matchedBodyRow) {
      // Discard bogus duplicates where Shein merely cloned garment headers
      const isGarmentCloned = Boolean(
        matchedBodyRow.sleeveLength ||
          matchedBodyRow.cuff ||
          matchedBodyRow.bicepLength ||
          (matchedBodyRow.length && !matchedBodyRow.height),
      );

      if (!isGarmentCloned) {
        bodyMeasurements = Object.entries(matchedBodyRow)
          .filter(([key]) => key !== 'size')
          .map(([key, val]) => ({
            name: toTitleCase(key.replace(/([A-Z])/g, ' $1')),
            value: String(val ?? ''),
            unit: 'cm',
          }));
      }
    }

    return {
      name: sc.size,
      productMeasurements,
      bodyMeasurements,
    };
  });

  const allVariantImages = fullColorVariants.flatMap((v) => v.images);
  const mainImages = allVariantImages.slice(0, 10);
  const uniqueColorNames = fullColorVariants.map((v) => v.name);
  const uniqueSizes = Array.from(new Set(sizeChart.map((s) => s.size)));

  const variantOptions = [];
  if (uniqueColorNames.length > 0) {
    variantOptions.push({ name: 'Color', values: uniqueColorNames });
  }
  if (uniqueSizes.length > 0) {
    variantOptions.push({ name: 'Size', values: uniqueSizes });
  }

  // 11. Complete Hydration-Ready SKU Matrix
  const skus = [];
  const is3P = catalogTarget === '3p';
  const cleanBrand =
    (is3P ? 'BRO' : brand.replace(/[^a-zA-Z0-9]/g, '')).slice(0, 4).toUpperCase() || 'CEL';

  for (const cv of fullColorVariants) {
    for (const sc of sizeChart) {
      const isSoldOut = soldOutSizes.has(sc.size.toUpperCase());
      const stockQty = isSoldOut ? 0 : defaultStock;
      const cleanCol = (cv.name || 'BLK')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase();
      const skuCode = `${cleanBrand}-${cleanCol}-${sc.size}-${Math.floor(1000 + Math.random() * 9000)}`;

      skus.push({
        skuCode,
        sku: skuCode,
        sellerSku: skuCode,
        sheinSku: extractedSku || undefined,
        selectedOptions: {
          Color: cv.name,
          Size: sc.size,
        },
        price: nprRetailPrice,
        discountedPrice: nprSalePrice,
        stock: stockQty,
        quantity: stockQty,
        available: !isSoldOut && stockQty > 0,
        image: cv.images[0] || mainImages[0] || '',
        isDefault: skus.length === 0,
      });
    }
  }

  // 12. Dynamic Form Assets with Verified Swatches & Galleries
  const colorMeta = {};
  for (const cv of fullColorVariants) {
    colorMeta[cv.name] = {
      swatch: cv.swatch || cv.swatchImage || cv.images[0] || '',
      images: cv.images,
      hot: false,
    };
  }

  const dynamicData = {
    values: attributes,
    measurements: {
      unit: 'CM',
      sizeChart,
    },
    variants: {
      colorMeta,
    },
    uploadedAssets: {
      mainImages,
      colorMeta,
    },
    variantFields: [
      { key: 'Color', kind: 'color' },
      { key: 'Size', kind: 'size' },
    ],
  };

  const slug = `${title.toLowerCase().replace(/[^\w]+/g, '-')}-${Date.now().toString().slice(-4)}`;
  const sku = extractedSku || `SKU-${Date.now().toString().slice(-6)}`;
  const tags = [
    matchedCategory.subcategoryId,
    matchedCategory.categorySlug,
    'apparel',
    brand.toLowerCase().replace(/[^\w]+/g, '-'),
  ];

  return {
    raw: {
      title,
      description: rawDesc,
      measurements: rawProductMeasurements,
      bodyMeasurements: rawBodyMeasurements,
      variations: cleanVariations,
      sheinUsdPrice: rawUsdPrice,
      nprPrice: nprRetailPrice,
      nprDiscountedPrice: nprSalePrice,
      category: matchedCategory.category,
      categorySlug: matchedCategory.categorySlug,
      subcategory: matchedCategory.subcategory,
      subcategoryId: matchedCategory.subcategoryId,
      categoryPath: matchedCategory.categoryPath,
    },
    seed: {
      name: title,
      title,
      slug,
      sku,
      brand,
      vendor: is3P ? 'Brothers Collection' : 'Celebs Official',
      vendorName: is3P ? 'Brothers Collection' : 'Celebs Official',
      vendorId: is3P
        ? 'c34e9069-e7cf-4510-90e0-978d0d9ebbf3'
        : '00000000-0000-0000-0000-000000000001',
      category: matchedCategory.category,
      categorySlug: matchedCategory.categorySlug,
      subcategory: matchedCategory.subcategory,
      subcategoryId: matchedCategory.subcategoryId,
      subcategorySlug: matchedCategory.subcategoryId,
      categoryPath: matchedCategory.categoryPath,
      path: matchedCategory.path,
      description: `${title}. ${cleanSummary}`,
      price: nprRetailPrice,
      discountedPrice: nprSalePrice,
      mainImages,
      colorVariants: fullColorVariants,
      sizes: sizesPayload,
      skus,
      variantOptions,
      tags,
      dynamicData,
      variants: cleanVariations,
      status: 'published',
      packageWeightKg: physicalSpecs.packageWeightKg,
      packageLengthCm: physicalSpecs.packageLengthCm,
      packageWidthCm: physicalSpecs.packageWidthCm,
      packageHeightCm: physicalSpecs.packageHeightCm,
      packagingType: physicalSpecs.packagingType,
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: physicalSpecs.warrantyType,
      warrantyPeriod: physicalSpecs.warrantyPeriod,
      warrantyPolicy: physicalSpecs.warrantyPolicy,
      isNonReturnable: false,
    },
  };
}

// ----------------------------------------------------------------------------
// 12. Automated Batch Loop (Multi-Product Navigation Controller)
// ----------------------------------------------------------------------------
chrome.storage.local.get(
  [
    'queue',
    'currentIndex',
    'results',
    'seedResults',
    'isPaused',
    'usdRate',
    'markup',
    'defaultStock',
    'catalogTarget',
  ],
  (data) => {
    if (!data.isPaused && data.queue && data.currentIndex < data.queue.length) {
      const currentTarget = data.queue[data.currentIndex];

      if (
        window.location.href.includes(currentTarget) ||
        currentTarget.includes(window.location.pathname)
      ) {
        const usdRate = data.usdRate || 135;
        const markup = data.markup || 1.15;
        const defaultStock = data.defaultStock !== undefined ? data.defaultStock : 30;
        const catalogTarget = data.catalogTarget || '1p';

        runCelebsProductExtractor(usdRate, markup, defaultStock, catalogTarget)
          .then((res) => {
            const newRawResults = [...(data.results || []), res.raw];
            const newSeedResults = [...(data.seedResults || []), res.seed];
            const nextIndex = data.currentIndex + 1;

            const cooldown = 9000 + Math.random() * 4000;
            console.log(
              `⏱️ Product [${res.seed.category} -> ${res.seed.subcategory}] Extracted! Price: NPR ${res.seed.discountedPrice}. Cooldown ${Math.round(cooldown / 1000)}s...`,
            );

            setTimeout(() => {
              chrome.storage.local.set(
                {
                  results: newRawResults,
                  seedResults: newSeedResults,
                  currentIndex: nextIndex,
                },
                () => {
                  if (nextIndex < data.queue.length) {
                    window.location.href = data.queue[nextIndex];
                  } else {
                    chrome.storage.local.set({ isPaused: true });
                    alert(
                      '🎉 Batch Complete! Open the extension to download your Celebs Seed JSON.',
                    );
                  }
                },
              );
            }, cooldown);
          })
          .catch((err) => {
            console.error('❌ Scraper error:', err);
          });
      }
    }
  },
);
