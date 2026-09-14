export interface ReviewQualityHint {
  isValid: boolean;
  message?: string;
  isWarning?: boolean;
}

export function evaluateCommentHint(comment: string): ReviewQualityHint {
  const trimmed = comment.trim();
  if (!trimmed) {
    return { isValid: true };
  }

  // Check character repetition like "......" or "aaaaa"
  if (/(.)\1{4,}/.test(trimmed)) {
    return {
      isValid: false,
      isWarning: true,
      message: 'Avoid repetitive characters. Describe the fabric or fit in your own words.',
    };
  }

  // Count alphanumeric characters vs symbols
  const alphanumericChars = trimmed.replace(/[^\p{L}\p{N}]/gu, '');
  if (alphanumericChars.length < 3 && trimmed.length > 0) {
    return {
      isValid: false,
      isWarning: true,
      message: 'Pure emoji or symbol reviews are not counted. Add words about the product.',
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length < 3) {
    return {
      isValid: true,
      isWarning: false,
      message: 'Detailed reviews (3+ words) help other shoppers make better choices!',
    };
  }

  return { isValid: true };
}
