/**
 * Pure SVG Code 128 Barcode Generator
 * Outputs crisp vector bars suitable for 203 DPI & 300 DPI thermal barcode printers (50x30mm).
 */

const CODE128_PATTERNS = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];

const START_B = 104;
const STOP = 106;

export function encodeCode128B(text: string): string {
  const codes: number[] = [START_B];
  let checkSum = START_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const code = charCode - 32;
    if (code < 0 || code > 95) {
      throw new Error(
        `encodeCode128B: unsupported character ${JSON.stringify(text[i])} ` +
          `(U+${charCode.toString(16).toUpperCase().padStart(4, '0')}) at index ${i}; ` +
          `Code 128-B supports U+0020..U+007E only`,
      );
    }
    codes.push(code);
    checkSum += code * (i + 1);
  }

  codes.push(checkSum % 103);
  codes.push(STOP);

  return codes.map((c) => CODE128_PATTERNS[c] || '').join('');
}

export function generateBarcodeBars(pattern: string): Array<{ width: number; isBar: boolean }> {
  const bars: Array<{ width: number; isBar: boolean }> = [];
  let isBar = true;

  for (const digit of pattern) {
    const width = parseInt(digit, 10);
    bars.push({ width, isBar });
    isBar = !isBar;
  }

  return bars;
}
