/**
 * Encoding Detection and Normalization Utilities
 *
 * Supports:
 * - Base64 decoding
 * - Hex decoding
 * - URL decoding
 * - Unicode normalization (fullwidth chars, zero-width spaces)
 */

/**
 * Normalize unicode characters to standard forms
 */
export function normalizeUnicode(text: string): string {
  // Remove zero-width spaces
  let normalized = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Convert fullwidth characters to halfwidth (ASCII)
  normalized = normalized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
  });

  // Normalize unicode (NFC - Canonical Decomposition, followed by Canonical Composition)
  normalized = normalized.normalize('NFC');

  return normalized;
}

/**
 * Detect if a string is likely Base64 encoded
 */
export function isLikelyBase64(str: string): boolean {
  // Must be at least 8 chars
  if (str.length < 8) return false;

  // Check if it matches base64 pattern
  const base64Pattern = /^[A-Za-z0-9+/=]{8,}$/;
  if (!base64Pattern.test(str)) return false;

  // Check for valid padding
  const paddingCount = (str.match(/=/g) || []).length;
  if (paddingCount > 2) return false;

  // Length should be multiple of 4
  return str.length % 4 === 0;
}

/**
 * Detect if a string is likely hex encoded
 */
export function isLikelyHex(str: string): boolean {
  // Must be at least 8 chars and even length
  if (str.length < 8 || str.length % 2 !== 0) return false;

  // Must be all hex characters
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Detect if a string is likely URL encoded
 */
export function isLikelyUrlEncoded(str: string): boolean {
  // Must contain %XX patterns
  if (!/%(2|3|4|5|6|7)[0-9A-Fa-f]/.test(str)) return false;

  // Must have at least 3 encoded chars
  const encodedCount = (str.match(/%[0-9A-Fa-f]{2}/g) || []).length;
  return encodedCount >= 3;
}

/**
 * Try to decode Base64 string
 */
export function tryDecodeBase64(str: string): string | null {
  if (!isLikelyBase64(str)) return null;

  try {
    const decoded = Buffer.from(str, 'base64').toString('utf-8');

    // Check if decoded string is valid UTF-8 and printable
    if (!/[\x00-\x08\x0E-\x1F\x7F-\x9F]/.test(decoded)) {
      return decoded;
    }
  } catch (e) {
    // Decoding failed
  }

  return null;
}

/**
 * Try to decode hex string
 */
export function tryDecodeHex(str: string): string | null {
  if (!isLikelyHex(str)) return null;

  try {
    const decoded = Buffer.from(str, 'hex').toString('utf-8');

    // Check if decoded string is valid UTF-8 and printable
    if (!/[\x00-\x08\x0E-\x1F\x7F-\x9F]/.test(decoded)) {
      return decoded;
    }
  } catch (e) {
    // Decoding failed
  }

  return null;
}

/**
 * Try to decode URL encoded string
 */
export function tryDecodeUrl(str: string): string | null {
  if (!isLikelyUrlEncoded(str)) return null;

  try {
    const decoded = decodeURIComponent(str);
    return decoded !== str ? decoded : null;
  } catch (e) {
    // Decoding failed
  }

  return null;
}

/**
 * Comprehensive text normalization and decoding
 * Returns: [normalizedText, decodedVariants]
 */
export function normalizeAndDecode(text: string): {
  normalized: string;
  variants: Array<{ type: string; decoded: string; original: string }>;
} {
  const normalized = normalizeUnicode(text);
  const variants: Array<{ type: string; decoded: string; original: string }> = [];

  // Extract potential encoded strings
  const words = text.split(/\s+/);

  for (const word of words) {
    // Try Base64
    const base64 = tryDecodeBase64(word);
    if (base64 && base64.length >= 4) {
      variants.push({ type: 'base64', decoded: base64, original: word });
    }

    // Try Hex
    const hex = tryDecodeHex(word);
    if (hex && hex.length >= 4) {
      variants.push({ type: 'hex', decoded: hex, original: word });
    }

    // Try URL encoding
    const url = tryDecodeUrl(word);
    if (url && url !== word && url.length >= 4) {
      variants.push({ type: 'url', decoded: url, original: word });
    }
  }

  return { normalized, variants };
}

/**
 * Check if decoded text contains PII patterns
 */
export function hasEncodedPII(text: string, piiPatterns: RegExp[]): {
  found: boolean;
  matches: Array<{ pattern: string; encoded: string; decoded: string }>;
} {
  const { variants } = normalizeAndDecode(text);
  const matches: Array<{ pattern: string; encoded: string; decoded: string }> = [];

  for (const variant of variants) {
    for (const pattern of piiPatterns) {
      if (pattern.test(variant.decoded)) {
        matches.push({
          pattern: pattern.source,
          encoded: variant.original,
          decoded: variant.decoded,
        });
      }
    }
  }

  return {
    found: matches.length > 0,
    matches,
  };
}
