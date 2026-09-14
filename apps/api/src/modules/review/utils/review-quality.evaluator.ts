export interface ReviewQualityResult {
  isSubstantive: boolean;
  qualityScore: number;
  flagReason?: string;
}

/**
 * Evaluates review text quality according to SHEIN/e-commerce standard policies:
 * Filters out comments that consist solely of symbols, emojis, repetitive spam, or gibberish.
 */
export function evaluateReviewQuality(comment: string): ReviewQualityResult {
  const trimmed = (comment || '').trim();

  // Strip symbols, punctuation, and emojis to count genuine alphanumeric characters
  const alphanumericOnly = trimmed.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const uniqueWords = new Set(
    alphanumericOnly
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );

  // Check for repetitive character spam (e.g. "aaaaaa", "......")
  const hasRepetitiveSpam = /(.)\1{4,}/.test(trimmed);

  // Check if mostly symbols/emojis
  const symbolCount = trimmed.length - alphanumericOnly.length;
  const isMostlySymbols = trimmed.length > 0 && symbolCount / trimmed.length > 0.6;

  if (alphanumericOnly.length < 8 || uniqueWords.size < 2 || hasRepetitiveSpam || isMostlySymbols) {
    return {
      isSubstantive: false,
      qualityScore: 20,
      flagReason: hasRepetitiveSpam
        ? 'REPETITIVE_CHARACTERS'
        : isMostlySymbols
          ? 'SYMBOL_OR_EMOJI_DOMINANT'
          : 'TOO_SHORT_OR_NON_SUBSTANTIVE',
    };
  }

  return {
    isSubstantive: true,
    qualityScore: 100,
  };
}
