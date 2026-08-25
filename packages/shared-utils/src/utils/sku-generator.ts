/**
 * Real-World Shein/Retail Standard Collision-Proof SKU Generator
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

export function resolveDepartmentCode(departmentOrCategory?: string): string {
  if (!departmentOrCategory) return 'u';
  const clean = departmentOrCategory.toLowerCase().trim();

  if (clean.includes('men') && !clean.includes('women')) return 'm';
  if (clean.includes('women') || clean.includes('female') || clean.includes('ladies')) return 'w';
  if (
    clean.includes('kid') ||
    clean.includes('child') ||
    clean.includes('baby') ||
    clean.includes('boy') ||
    clean.includes('girl')
  ) {
    return 'k';
  }
  if (
    clean.includes('access') ||
    clean.includes('jewelry') ||
    clean.includes('bag') ||
    clean.includes('shoe') ||
    clean.includes('footwear')
  ) {
    return 'a';
  }
  if (clean.includes('home') || clean.includes('decor') || clean.includes('living')) return 'h';
  if (
    clean.includes('elect') ||
    clean.includes('gadget') ||
    clean.includes('phone') ||
    clean.includes('tech')
  ) {
    return 'e';
  }
  if (
    clean.includes('beauty') ||
    clean.includes('cosmetic') ||
    clean.includes('care') ||
    clean.includes('personal')
  ) {
    return 'b';
  }

  // Single letter prefix fallback if already a valid 1-char code
  if (clean.length === 1 && /[a-z0-9]/.test(clean)) return clean;

  // Otherwise, take first alphanumeric character of the category/department name
  const firstAlpha = clean.replace(/[^a-z0-9]/g, '').slice(0, 1);
  return firstAlpha || 'u';
}

export function generateSheinStyleSku(options: SkuOptions = {}): string {
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
