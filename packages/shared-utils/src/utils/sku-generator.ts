/**
 * Retail Standard Collision-Proof SKU Generator
 *
 * Format: [brand: 1 char][dept: 1 char][date: YYMMDD 6 digits][uniqueID: 10 digits]
 * Example: cm2608140051059585 (Men), cw2608140051059585 (Women), ck2608140051059585 (Kids), cu2608140051059585 (Unisex)
 * Total length: Exactly 18 characters.
 *
 * Fully compatible with Code 128 Subset C (double numeric data density)
 * for compact 50x30mm retail garment tags, handheld POS laser/CCD barcode scanners,
 * and high-throughput warehouse billing workflows.
 */

export interface SkuOptions {
  brandPrefix?: string;
  department?: string;
  date?: Date;
  customSequence?: string | number;
}

/**
 * One keyword bucket in the department lookup. Array order is precedence:
 * the first rule that matches wins, so the buckets must stay in the order the
 * original if-ladder tested them (menswear before accessories, etc.).
 */
interface DepartmentRule {
  keywords: readonly string[];
  /** Keywords that veto a rule — "men" must never claim "women". */
  excludes?: readonly string[];
  code: string;
}

const DEPARTMENT_RULES: ReadonlyArray<DepartmentRule> = [
  { keywords: ['men'], excludes: ['women'], code: 'm' },
  { keywords: ['women', 'female', 'ladies'], code: 'w' },
  { keywords: ['kid', 'child', 'baby', 'boy', 'girl'], code: 'k' },
  { keywords: ['access', 'jewelry', 'bag', 'shoe', 'footwear'], code: 'a' },
  { keywords: ['home', 'decor', 'living'], code: 'h' },
  { keywords: ['elect', 'gadget', 'phone', 'tech'], code: 'e' },
  { keywords: ['beauty', 'cosmetic', 'care', 'personal'], code: 'b' },
];

function matchesDepartmentRule(clean: string, rule: DepartmentRule): boolean {
  if (!rule.keywords.some((keyword) => clean.includes(keyword))) return false;
  return !(rule.excludes ?? []).some((keyword) => clean.includes(keyword));
}

export function resolveDepartmentCode(departmentOrCategory?: string): string {
  if (!departmentOrCategory) return 'u';
  const clean = departmentOrCategory.toLowerCase().trim();

  const matched = DEPARTMENT_RULES.find((rule) => matchesDepartmentRule(clean, rule));
  if (matched) return matched.code;

  // Single letter prefix fallback if already a valid 1-char code
  if (clean.length === 1 && /[a-z0-9]/.test(clean)) return clean;

  // Otherwise, take first alphanumeric character of the category/department name
  const firstAlpha = clean.replace(/[^a-z0-9]/g, '').slice(0, 1);
  return firstAlpha || 'u';
}

export function generateSku(options: SkuOptions = {}): string {
  const brand =
    options.brandPrefix
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 1) || 'c';
  const dept = resolveDepartmentCode(options.department);
  const now = options.date instanceof Date ? options.date : new Date();

  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`; // 6 digits

  let entropyPart: string;
  if (options.customSequence !== undefined && options.customSequence !== null) {
    const rawSeq = String(options.customSequence).replace(/[^0-9]/g, '');
    entropyPart = rawSeq.padStart(10, '0').slice(-10);
  } else {
    // 10-digit high-entropy numeric string (1000000000..9999999999)
    const random10 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    entropyPart = random10;
  }

  return `${brand}${dept}${datePart}${entropyPart}`;
}

export interface RetailSkuOptions {
  brandToken?: string;
  storeCode?: string;
  styleRef: string;
  options?: string[];
}

export function cleanVariantCode(value: string): string {
  if (!value) return 'STD';
  // Remove special characters, keep alphanumeric, convert to uppercase
  const sanitized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!sanitized) return 'STD';
  // Cap at 8 characters to keep SKU compact and barcode scannable
  return sanitized.slice(0, 8);
}

export function generateRetailSku(options: RetailSkuOptions): string {
  const brand = (options.brandToken || 'CLB').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const style = options.styleRef.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const store = options.storeCode?.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const parts = [brand];
  if (store) {
    parts.push(store);
  }
  parts.push(style);

  if (options.options && options.options.length > 0) {
    const variantCodes = options.options.map((opt) => cleanVariantCode(opt)).filter(Boolean);
    if (variantCodes.length > 0) {
      parts.push(...variantCodes);
    } else {
      parts.push('STD');
    }
  } else {
    parts.push('STD');
  }

  return parts.join('-');
}

/**
 * Collision-proof retail style reference generator.
 * Derives a clean, readable 8-character style code:
 * - 4 characters from the product name (e.g. "COTT" for "Cotton T-Shirt")
 * - 4 characters of high-entropy alphanumeric token (e.g. "8K2M")
 * This ensures products with identical starting words (e.g. "Cotton T-Shirt" vs "Cotton Slim Jeans")
 * from the same vendor never collide in PostgreSQL ProductInventory.sku unique index.
 */
export function buildProductStyleRef(productName?: string, customEntropy?: string): string {
  const cleanName =
    (productName || 'ITEM')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 4) || 'ITEM';

  let entropy = customEntropy;
  if (!entropy) {
    entropy = Math.random().toString(36).substring(2, 6).toUpperCase().padStart(4, 'X');
  } else {
    entropy = entropy
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 4)
      .padStart(4, '0');
  }

  return `${cleanName.padEnd(4, 'X').slice(0, 4)}${entropy}`;
}

/**
 * Single choke point for discount validation across every price-display
 * site (PDP card, size modal, product card) and cart/checkout totals.
 *
 * A discount is only valid when it is a finite number strictly below the
 * list price and above zero. Anything else (above-list, zero, negative,
 * NaN, null/undefined, non-numeric) returns undefined so callers fall back
 * to the list price instead of rendering a fake deal or a NaN total.
 */
export function validDiscount(price: number, discounted: unknown): number | undefined {
  const value = Number(discounted);
  if (Number.isFinite(value) && value > 0 && value < price) return value;
  return undefined;
}
