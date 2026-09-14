// ============================================================================
// Shein Stealth Product Extractor (Celebs Production Edition)
// ============================================================================

// ----------------------------------------------------------------------------
// Link Collector Listener (Popup Trigger)
// ----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
  }
  return true;
});

// ----------------------------------------------------------------------------
// Celebs Category Taxonomy & Intelligent Auto-Matcher
// ----------------------------------------------------------------------------
const CELEBS_CATEGORY_TAXONOMY = [
  // 1. Men Knitwear
  {
    keywords: ['knit top', 'knit tops', 'knitted top', 'crochet top', 'hollow out top', 'knitwear'],
    category: 'Men Knitwear',
    subcategoryId: 'men-knit-tops',
    subcategory: 'Men Knit Tops',
    path: 'men/men-knitwear/men-knit-tops',
  },
  {
    keywords: [
      'sweater',
      'sweaters',
      'cardigan',
      'pullover sweater',
      'cable knit',
      'turtleneck',
      'knit cardigan',
    ],
    category: 'Men Knitwear',
    subcategoryId: 'men-sweaters',
    subcategory: 'Men Sweaters',
    path: 'men/men-knitwear/men-sweaters',
  },

  // 2. Men Denim
  {
    keywords: [
      'denim jacket',
      'denim jackets',
      'trucker jacket',
      'jean jacket',
      'single-breasted jacket',
      'denim single-breasted',
    ],
    category: 'Men Denim',
    subcategoryId: 'men-denim-jackets',
    subcategory: 'Men Denim Jackets',
    path: 'men/men-denim/men-denim-jackets',
  },
  {
    keywords: ['jeans', 'jean', 'denim pants', 'ripped jeans', 'baggy jeans', 'straight jeans'],
    category: 'Men Denim',
    subcategoryId: 'men-jeans',
    subcategory: 'Men Jeans',
    path: 'men/men-denim/men-jeans',
  },
  {
    keywords: ['denim shirt', 'chambray', 'denim tops', 'denim top'],
    category: 'Men Denim',
    subcategoryId: 'men-denim-tops',
    subcategory: 'Men Denim Tops',
    path: 'men/men-denim/men-denim-tops',
  },
  {
    keywords: ['denim shorts', 'jorts', 'jean shorts'],
    category: 'Men Denim',
    subcategoryId: 'men-denim-shorts',
    subcategory: 'Men Denim Shorts',
    path: 'men/men-denim/men-denim-shorts',
  },

  // 3. Men Hoodies & Sweatshirts
  {
    keywords: ['sweatshirt', 'sweatshirts', 'crewneck sweatshirt'],
    category: 'Men Hoodies & Sweatshirts',
    subcategoryId: 'men-sweatshirts',
    subcategory: 'Men Sweatshirts',
    path: 'men/men-hoodies-sweatshirts/men-sweatshirts',
  },
  {
    keywords: ['hoodie', 'hoodies', 'zip hoodie', 'zip-up hoodie', 'pullover hoodie'],
    category: 'Men Hoodies & Sweatshirts',
    subcategoryId: 'men-zip-up-hoodies',
    subcategory: 'Men Zip-up Hoodies',
    path: 'men/men-hoodies-sweatshirts/men-zip-up-hoodies',
  },

  // 4. Men Tops
  {
    keywords: ['t-shirt', 't-shirts', 'tee', 'tees', 'graphic tee', 'oversized tee'],
    category: 'Men Tops',
    subcategoryId: 'men-t-shirts',
    subcategory: 'Men T-Shirts',
    path: 'men/men-tops/men-t-shirts',
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
    ],
    category: 'Men Tops',
    subcategoryId: 'men-shirts',
    subcategory: 'Men Shirts',
    path: 'men/men-tops/men-shirts',
  },
  {
    keywords: ['polo', 'polo shirt', 'polos', 'knit polo'],
    category: 'Men Tops',
    subcategoryId: 'men-polo-shirts',
    subcategory: 'Men Polo Shirts',
    path: 'men/men-tops/men-polo-shirts',
  },
  {
    keywords: ['tank top', 'tank tops', 'sleeveless', 'vest top'],
    category: 'Men Tops',
    subcategoryId: 'men-tank-tops',
    subcategory: 'Men Tank Tops',
    path: 'men/men-tops/men-tank-tops',
  },

  // 5. Men Bottoms
  {
    keywords: ['shorts', 'short', 'cargo shorts', 'sweat shorts', 'bermuda', 'running shorts'],
    category: 'Men Bottoms',
    subcategoryId: 'men-shorts',
    subcategory: 'Men Shorts',
    path: 'men/men-bottoms/men-shorts',
  },
  {
    keywords: [
      'pants',
      'pant',
      'trousers',
      'chinos',
      'cargo pants',
      'slacks',
      'parachute pants',
      'sweatpants',
    ],
    category: 'Men Bottoms',
    subcategoryId: 'men-pants',
    subcategory: 'Men Pants',
    path: 'men/men-bottoms/men-pants',
  },

  // 6. Men Suits & Separates
  {
    keywords: ['blazer', 'blazers', 'suit jacket', 'sport coat'],
    category: 'Men Suits & Separates',
    subcategoryId: 'men-blazers',
    subcategory: 'Men Blazers',
    path: 'men/men-suits-separates/men-blazers',
  },
  {
    keywords: ['suit', 'suits', 'tuxedo'],
    category: 'Men Suits & Separates',
    subcategoryId: 'men-suits',
    subcategory: 'Men Suits',
    path: 'men/men-suits-separates/men-suits',
  },

  // 7. Men Outerwear
  {
    keywords: [
      'winter coat',
      'puffer',
      'down jacket',
      'parka',
      'trench coat',
      'overcoat',
      'fleece coat',
    ],
    category: 'Men Outerwear',
    subcategoryId: 'men-winter-coats',
    subcategory: 'Men Winter Coats',
    path: 'men/men-outerwear/men-winter-coats',
  },
  {
    keywords: ['jacket', 'jackets', 'bomber', 'windbreaker', 'varsity jacket', 'coach jacket'],
    category: 'Men Outerwear',
    subcategoryId: 'men-jackets',
    subcategory: 'Men Jackets',
    path: 'men/men-outerwear/men-jackets',
  },
];

/**
 * Matches Shein breadcrumbs or title against our application's category dictionary.
 * Guaranteed to never set an 80-character product title as a category!
 */
function resolveCelebsCategory(rawBreadcrumbs = [], title = '') {
  const combinedContext = [...rawBreadcrumbs, title].join(' ').toLowerCase();

  for (const item of CELEBS_CATEGORY_TAXONOMY) {
    for (const kw of item.keywords) {
      const regex = new RegExp(`\\b${kw.replace('-', '\\-')}\\b`, 'i');
      if (regex.test(combinedContext)) {
        return {
          category: item.category,
          subcategory: item.subcategory,
          subcategoryId: item.subcategoryId,
          categoryPath: `${item.category} / ${item.subcategory}`,
          path: item.path,
        };
      }
    }
  }

  // Sensible fallback based on top-level crumbs
  const cleanCrumbs = rawBreadcrumbs.filter((c) => {
    if (!c) return false;
    const s = c.trim().toLowerCase();
    return (
      !/^(home|shein|men|women|clothing|all|>|\/)$/i.test(s) &&
      s.length < 35 &&
      !title.toLowerCase().includes(s)
    );
  });

  const leaf = cleanCrumbs[cleanCrumbs.length - 1] || 'Men Apparel';
  const parent = cleanCrumbs[cleanCrumbs.length - 2] || 'Men Clothing';

  return {
    category: parent,
    subcategory: leaf,
    subcategoryId: leaf.toLowerCase().replace(/[^\w]+/g, '-'),
    categoryPath: `${parent} / ${leaf}`,
    path: `men/${parent.toLowerCase().replace(/[^\w]+/g, '-')}/${leaf.toLowerCase().replace(/[^\w]+/g, '-')}`,
  };
}

// ----------------------------------------------------------------------------
// Real Price & NPR Currency Conversion
// ----------------------------------------------------------------------------
function extractSheinRealPrice() {
  // 1. Check JSON-LD
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
            if (!isNaN(parsed) && parsed > 0) {
              return parsed;
            }
          }
        }
        if (Array.isArray(productObj.hasVariant) && productObj.hasVariant[0]?.offers?.price) {
          const parsed = parseFloat(productObj.hasVariant[0].offers.price);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        }
      }
    }
  } catch (_e) {}

  // 2. Check DOM Elements
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
      if (!isNaN(parsed) && parsed > 0 && parsed < 500) {
        return parsed;
      }
    }
  }

  return 19.99; // Standard baseline fallback
}

/**
 * Computes neat, rounded NPR retail (MRP) and sale prices.
 */
function calculateNprPrices(usdPrice, usdToNprRate = 135, markupMultiplier = 1.15) {
  const saleNpr = Math.round((usdPrice * usdToNprRate * markupMultiplier) / 10) * 10;
  const retailNpr = Math.round((saleNpr * 1.18) / 10) * 10;
  return {
    price: retailNpr,
    discountedPrice: saleNpr,
  };
}

// ----------------------------------------------------------------------------
// Human Delays & Simulation
// ----------------------------------------------------------------------------
const humanDelay = (min, max) =>
  new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function humanScroll(targetY, duration = 800) {
  const currentY = window.scrollY;
  const delta = targetY - currentY;
  const steps = Math.floor(10 + Math.random() * 8);
  const stepDist = delta / steps;

  for (let i = 0; i < steps; i++) {
    const jitter = (Math.random() - 0.48) * 15;
    window.scrollBy({ top: stepDist + jitter, behavior: 'smooth' });
    await humanDelay((duration / steps) * 0.7, (duration / steps) * 1.3);
  }
}

async function humanClick(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width * (0.3 + Math.random() * 0.4);
  const y = rect.top + rect.height * (0.3 + Math.random() * 0.4);
  const eventOpts = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
  };

  el.dispatchEvent(new PointerEvent('pointerover', eventOpts));
  el.dispatchEvent(new MouseEvent('mouseover', eventOpts));
  await humanDelay(40, 90);

  el.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
  el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
  await humanDelay(50, 120);

  el.dispatchEvent(new PointerEvent('pointerup', eventOpts));
  el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
  await humanDelay(30, 80);

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
// High-Resolution Image Sanitizer
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

const COLOR_HEX_MAP = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  brown: '#8B4513',
  'coffee brown': '#4B2E1A',
  grey: '#808080',
  gray: '#808080',
  'dark grey': '#4A4A4A',
  beige: '#D4BE8D',
  cream: '#FFFDD0',
  apricot: '#F5C99B',
  'navy blue': '#1B2A4A',
  navy: '#000080',
  blue: '#1E90FF',
  'dusty blue': '#5A7D9A',
  'baby blue': '#89CFF0',
  'royal blue': '#4A5568',
  green: '#2E8B57',
  'dark green': '#4A5568',
  'mint green': '#4A5568',
  'olive green': '#556B2F',
  khaki: '#C3B091',
  burgundy: '#800020',
  pink: '#F4A7C3',
  'baby pink': '#4A5568',
  'mauve purple': '#4A5568',
  red: '#C0392B',
  orange: '#E67E22',
  'coral orange': '#4A5568',
  'mustard yellow': '#4A5568',
  multicolor: '#4A90E2',
};

function resolveColorHex(colorName) {
  const normalized = String(colorName || '')
    .trim()
    .toLowerCase();
  return COLOR_HEX_MAP[normalized] || '#4A5568';
}

function toTitleCase(str) {
  return String(str || '')
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ----------------------------------------------------------------------------
// Smart Brand Detector
// ----------------------------------------------------------------------------
const KNOWN_BRANDS = [
  'Manfinity',
  'DAZY',
  'ROMWE',
  'MOTF',
  'QuarKem',
  'SHEIN',
  'Emery Rose',
  'LUVLETTE',
  'GLOWMODE',
];

function detectBrand(title = '', attributes = {}) {
  if (attributes['Brand']) return attributes['Brand'].trim();

  for (const b of KNOWN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(title)) {
      return b;
    }
  }

  const firstWord = title.split(' ')[0];
  return firstWord && firstWord.length > 2 ? firstWord : 'Celebs';
}

// ----------------------------------------------------------------------------
// Description & Measurement Parsers
// ----------------------------------------------------------------------------
function parseDescriptionAttributes(rawDesc) {
  const attributes = {};
  if (!rawDesc) return { attributes, cleanSummary: '' };

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
  const material = attributes['Material'] || attributes['Composition'] || 'Knitwear';
  const care = attributes['Care Instructions'] || 'Hand wash or professional dry clean';
  const cleanSummary = `Style: ${style}. Fit: ${fit}. Material: ${material}. Care: ${care}.`;

  return { attributes, extractedSku, cleanSummary };
}

function parseMeasurements(rawMeasurements) {
  if (!rawMeasurements) return { unit: 'CM', sizeChart: [] };

  const lines = rawMeasurements
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

  if (headerIdx === -1) return { unit: 'CM', sizeChart: [] };

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
    isInch = avg < 58;
  } else {
    isInch = rawMeasurements.includes('Switch to\nType\nCM') || rawMeasurements.includes('\tIN\t');
  }

  const factor = isInch ? 2.54 : 1.0;
  const sizeChart = [];

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
    sizeChart.push(row);
  }

  return { unit: 'CM', sizeChart };
}

// ----------------------------------------------------------------------------
// Swatch Image Extractor
// ----------------------------------------------------------------------------
function extractSwatchUrl(element) {
  if (!element) return null;

  // 1. Direct <img> tag inside swatch button
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

  // 2. CSS background-image
  const bg = window.getComputedStyle(element).backgroundImage || '';
  const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
  if (match && match[1]) {
    const cleaned = cleanProductImageUrl(match[1]);
    if (cleaned) return cleaned;
  }

  return null;
}

// ----------------------------------------------------------------------------
// Main Product Extractor Routine
// ----------------------------------------------------------------------------
async function runCelebsProductExtractor(usdRate = 135, markup = 1.15, defaultStock = 30) {
  await ensureNoAntiBotChallenge();

  // 1. Smooth landing simulation
  await humanScroll(260 + Math.random() * 120, 600);
  await humanDelay(1800, 3000);
  await ensureNoAntiBotChallenge();

  // 2. Expand Description Accordion
  const descToggle = document.querySelector('.common-entry__top');
  if (descToggle) {
    await humanClick(descToggle);
    await humanDelay(1000, 1800);
  }

  // 3. Expand Size & Fit Accordion
  const sizeFitEntry = Array.from(document.querySelectorAll('.common-entry__container')).find(
    (el) => el.innerText.includes('Size & Fit'),
  );

  if (sizeFitEntry) {
    const toggle = sizeFitEntry.querySelector('.common-entry__top');
    if (toggle) {
      await humanClick(toggle);
      await humanDelay(1000, 1800);
    }
    const cmSwitch = Array.from(sizeFitEntry.querySelectorAll('button, span, div')).find(
      (el) => el.textContent.trim() === 'CM',
    );
    if (cmSwitch) {
      await humanClick(cmSwitch);
      await humanDelay(600, 1200);
    }
  }

  await humanScroll(120, 400);
  await humanDelay(800, 1400);

  // 4. Color Swatches & High-Res Galleries
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
      await humanDelay(1800, 3200);
      await ensureNoAntiBotChallenge();
    }

    const rawImages = Array.from(
      document.querySelectorAll(
        '.product-intro__thumbs img, .goods-thumbs img, .goods-thumbs-item img, .product-intro__gallery img, .product-intro__main-img img, .main-picture img, [class*="gallery"] img, [class*="goods-thumb"] img, [class*="slider"] img, [class*="main-img"] img, .swiper-slide img',
      ),
    );

    const swatchImgEl = s ? s.querySelector('img') : null;
    const colorName = swatchImgEl?.alt || s?.textContent?.trim() || '';
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
        color: colorName || 'Default',
        swatchImage: swatchThumbUrl || cleanImageList[0] || null,
        swatch: swatchThumbUrl || cleanImageList[0] || null,
        images: cleanImageList,
      });
    }
  }

  // 5. Extract Details & Measurements
  const title =
    document
      .querySelector('h1.fsp-element, h1.product-intro__head-name, h1[class*="head-name"]')
      ?.textContent.trim() || 'Contemporary Fashion Apparel';

  const rawDesc = document.querySelector('.common-entry__content')?.innerText.trim() || '';
  const rawMeasurements =
    Array.from(document.querySelectorAll('.common-entry__container'))
      .find((el) => el.innerText.includes('Size & Fit'))
      ?.innerText.trim() || '';

  const { attributes, extractedSku, cleanSummary } = parseDescriptionAttributes(rawDesc);
  const { sizeChart } = parseMeasurements(rawMeasurements);

  // Detect out-of-stock / disabled sizes directly on Shein
  const disabledSizeElements = Array.from(
    document.querySelectorAll(
      '.product-intro__size-radio.disabled, .product-intro__size-radio--disabled, [class*="size-item"][class*="disabled"], [class*="size-item"][aria-disabled="true"], button[disabled][class*="size"]',
    ),
  );
  const soldOutSizes = new Set(
    disabledSizeElements.map((el) => el.textContent.trim().toUpperCase()),
  );

  // 6. Automatic Category Matching
  const rawBreadcrumbs = Array.from(
    document.querySelectorAll(
      '.bread-crumb a, .bread-crumbs a, .bread-crumbs__item, .crumbs-nav a, [class*="breadcrumb"] a',
    ),
  ).map((el) => el.textContent.trim());

  const matchedCategory = resolveCelebsCategory(rawBreadcrumbs, title);

  // 7. Dynamic Brand Detection
  const brand = detectBrand(title, attributes);

  // 8. Real Price & NPR Conversion
  const rawUsdPrice = extractSheinRealPrice();
  const { price: nprRetailPrice, discountedPrice: nprSalePrice } = calculateNprPrices(
    rawUsdPrice,
    usdRate,
    markup,
  );

  // 9. Variant & Swatch Consolidation
  const primaryColor = attributes['Color'] || title.split(' ')[0] || 'Default';

  if (cleanVariations.length === 0) {
    const allImgs = Array.from(document.querySelectorAll('img'))
      .map((img) => cleanProductImageUrl(img.getAttribute('data-src') || img.src))
      .filter(Boolean);
    const uniqueFallback = Array.from(new Set(allImgs)).slice(0, 8);

    cleanVariations.push({
      color: primaryColor,
      swatchImage: uniqueFallback[0] || null,
      swatch: uniqueFallback[0] || null,
      images: uniqueFallback,
    });
  }

  const mergedColorVariantsMap = new Map();
  for (const cv of cleanVariations) {
    const cName = cv.color || primaryColor;
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
        if (!existing.images.includes(img)) {
          existing.images.push(img);
        }
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

    return {
      name: sc.size,
      productMeasurements,
      bodyMeasurements: [
        { name: 'Height', value: '170-185', unit: 'cm' },
        ...(sc.waist || sc.waistSize
          ? [{ name: 'Waist Size', value: String(sc.waist || sc.waistSize), unit: 'cm' }]
          : []),
        ...(sc.bust || sc.chest
          ? [{ name: 'Bust', value: String(sc.bust || sc.chest), unit: 'cm' }]
          : []),
        ...(sc.hip || sc.hipSize
          ? [{ name: 'Hip Size', value: String(sc.hip || sc.hipSize), unit: 'cm' }]
          : []),
      ],
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

  // 11. Complete SKU Matrix Table (Hydration-Ready)
  const skus = [];
  for (const cv of fullColorVariants) {
    for (const sc of sizeChart) {
      const isSoldOut = soldOutSizes.has(sc.size.toUpperCase());
      const stockQty = isSoldOut ? 0 : defaultStock;
      const cleanCol = (cv.colorCode || '#000000').replace('#', '').slice(0, 4).toUpperCase();
      const skuCode = `${brand.slice(0, 4).toUpperCase()}-${cleanCol}-${sc.size}-${Math.floor(1000 + Math.random() * 9000)}`;

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

  // 12. Dynamic Form Assets with Verified Swatches
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

  // Clean tags: [Category slug, Subcategory slug, apparel, brand]
  const cleanCategorySlug = matchedCategory.category.toLowerCase().replace(/[^\w]+/g, '-');
  const cleanSubcategorySlug = matchedCategory.subcategory.toLowerCase().replace(/[^\w]+/g, '-');
  const tags = [cleanSubcategorySlug, cleanCategorySlug, 'apparel', brand.toLowerCase()];

  return {
    raw: {
      title,
      description: rawDesc,
      measurements: rawMeasurements,
      variations: cleanVariations,
      sheinUsdPrice: rawUsdPrice,
      nprPrice: nprRetailPrice,
      nprDiscountedPrice: nprSalePrice,
      category: matchedCategory.category,
      subcategory: matchedCategory.subcategory,
      categoryPath: matchedCategory.categoryPath,
    },
    seed: {
      name: title,
      title,
      slug,
      sku,
      brand,
      category: matchedCategory.category,
      subcategory: matchedCategory.subcategory,
      subcategoryId: matchedCategory.subcategoryId,
      categoryPath: matchedCategory.categoryPath,
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
    },
  };
}

// ----------------------------------------------------------------------------
// Execution Controller
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

        runCelebsProductExtractor(usdRate, markup, defaultStock)
          .then((res) => {
            const newRawResults = [...(data.results || []), res.raw];
            const newSeedResults = [...(data.seedResults || []), res.seed];
            const nextIndex = data.currentIndex + 1;

            const cooldown = 9000 + Math.random() * 5000;
            console.log(
              `⏱️ Product [${res.seed.category} -> ${res.seed.subcategory}] Extracted! Real Price: NPR ${res.seed.discountedPrice}. Cooldown ${Math.round(cooldown / 1000)}s...`,
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
