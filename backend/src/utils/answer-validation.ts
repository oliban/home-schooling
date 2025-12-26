/**
 * Enhanced answer validation utilities
 *
 * Supports multiple equivalent answer formats:
 * - Units: 5m, 5 m, 5 meter
 * - Currency: 100kr, 100 kr, kr100, 100 kronor
 * - Fractions ↔ Decimals: 1/2 = 0.5 = 0,5
 * - Thousand separators: 1000 = 1 000 = 1,000
 * - Percentage as formatting: 35 = 35% (NOT mathematical: 1/2 ≠ 50%)
 */

// Floating-point comparison tolerance (0.1% precision for elementary math)
// This allows 1/3 (0.333333...) to match 0.333, 0.3333, etc.
const TOLERANCE = 0.001;

// Supported units by category
const UNITS = {
  length: ['m', 'meter', 'meters', 'cm', 'centimeter', 'centimeters', 'km', 'kilometer', 'kilometers', 'mm', 'millimeter', 'millimeters'],
  mass: ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'],
  volume: ['l', 'liter', 'liters', 'ml', 'milliliter', 'milliliters'],
  time: ['s', 'sekund', 'sekunder', 'min', 'minut', 'minuter', 'h', 'timme', 'timmar']
};

// Supported currency formats
const CURRENCY_PATTERNS = ['kr', 'kronor', 'krona', 'sek'];

/**
 * Extract number and unit from answer string
 * @param answer - Answer string potentially containing a number and unit
 * @returns Object with numeric value and optional unit
 */
export function extractNumberAndUnit(answer: string): { value: string; unit: string | null } {
  const str = answer.trim().toLowerCase();

  // Flatten all units into a single array with their canonical forms
  const unitMappings: Record<string, string> = {
    // Length (order matters: longest first to avoid matching 'm' before 'mm')
    'millimeters': 'mm', 'millimeter': 'mm', 'mm': 'mm',
    'kilometers': 'km', 'kilometer': 'km', 'km': 'km',
    'centimeters': 'cm', 'centimeter': 'cm', 'cm': 'cm',
    'meters': 'm', 'meter': 'm', 'm': 'm',
    // Mass (longest first)
    'kilograms': 'kg', 'kilogram': 'kg', 'kg': 'kg',
    'grams': 'g', 'gram': 'g', 'g': 'g',
    // Volume (longest first)
    'milliliters': 'ml', 'milliliter': 'ml', 'ml': 'ml',
    'liters': 'l', 'liter': 'l', 'l': 'l',
    // Time (longest first)
    'sekunder': 's', 'sekund': 's', 's': 's',
    'minuter': 'min', 'minut': 'min', 'min': 'min',
    'timmar': 'h', 'timme': 'h', 'h': 'h'
  };

  // Sort units by length (longest first) to match longer units before shorter ones
  const sortedUnits = Object.keys(unitMappings).sort((a, b) => b.length - a.length);

  // Try to match unit at the end (most common case)
  for (const unit of sortedUnits) {
    const canonical = unitMappings[unit];
    // Match unit at end with optional space, using word boundary
    const regex = new RegExp(`^(.+?)\\s*${unit}$`, 'i');
    const match = str.match(regex);
    if (match) {
      return { value: match[1].trim(), unit: canonical };
    }
  }

  return { value: answer, unit: null };
}

/**
 * Extract number and currency from answer string
 * @param answer - Answer string potentially containing a number and currency
 * @returns Object with numeric value and optional currency
 */
export function extractCurrency(answer: string): { value: string; currency: string | null } {
  const str = answer.trim().toLowerCase();

  // Currency patterns: kr, kronor, krona, sek
  const currencyPatterns = ['kronor', 'krona', 'sek', 'kr']; // Order matters: longest first

  for (const curr of currencyPatterns) {
    // Try suffix format: "100 kr" or "100kr"
    const suffixRegex = new RegExp(`^(.+?)\\s*${curr}$`, 'i');
    const suffixMatch = str.match(suffixRegex);
    if (suffixMatch) {
      return { value: suffixMatch[1].trim(), currency: 'kr' };
    }

    // Try prefix format: "kr 100" or "kr100"
    const prefixRegex = new RegExp(`^${curr}\\s*(.+)$`, 'i');
    const prefixMatch = str.match(prefixRegex);
    if (prefixMatch) {
      return { value: prefixMatch[1].trim(), currency: 'kr' };
    }
  }

  return { value: answer, currency: null };
}

/**
 * Parse fraction string to decimal number
 * @param str - String in format "numerator/denominator"
 * @returns Decimal number or null if invalid
 */
export function parseFraction(str: string): number | null {
  // Pattern: <numerator>/<denominator> with optional spaces
  const match = str.trim().match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);

  if (!match) {
    return null;
  }

  const numerator = parseInt(match[1], 10);
  const denominator = parseInt(match[2], 10);

  // Check for division by zero
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

/**
 * Clean thousand separators and normalize to standard decimal format
 * @param str - Number string with potential thousand separators
 * @returns Normalized number string with period as decimal separator
 */
export function cleanThousandSeparators(str: string): string {
  let cleaned = str.trim();

  // Remove all spaces (Swedish thousand separator)
  cleaned = cleaned.replace(/\s+/g, '');

  // Detect comma role:
  // - If comma is followed by exactly 3 digits at end → thousand separator (remove comma)
  // - If comma is followed by 1-2 digits at end → decimal separator (convert to period)
  // - Multiple commas → thousand separators (remove all)

  // Count commas
  const commaCount = (cleaned.match(/,/g) || []).length;

  if (commaCount === 0) {
    // No commas, return as is
    return cleaned;
  }

  if (commaCount > 1) {
    // Multiple commas → all are thousand separators, remove them all
    return cleaned.replace(/,/g, '');
  }

  // Single comma: determine if it's decimal or thousand separator
  const commaMatch = cleaned.match(/,(\d+)$/);
  if (commaMatch) {
    const digitsAfterComma = commaMatch[1].length;

    if (digitsAfterComma === 3) {
      // Exactly 3 digits after comma → thousand separator in most cases
      // Examples: "1,000", "3,500", "10,000"
      // This is the standard thousand separator format
      return cleaned.replace(/,/g, '');
    } else {
      // 1-2 digits after comma → decimal separator
      // Examples: "3,5", "3,14", "1,99"
      return cleaned.replace(/,/g, '.');
    }
  }

  return cleaned;
}

/**
 * Parse answer string to number, handling fractions, percentages, decimals, and thousand separators
 * @param str - Answer string to parse
 * @returns Numeric value or null if invalid
 */
export function parseToNumber(str: string): number | null {
  if (!str || str.trim().length === 0) {
    return null;
  }

  let cleaned = str.trim();

  // Remove parentheses (for backward compatibility with coordinates)
  cleaned = cleaned.replace(/[()]/g, '');

  // Strip % as formatting (no conversion to decimal)
  // According to plan: 35% = 35, not 0.35
  cleaned = cleaned.replace(/%/g, '');
  cleaned = cleaned.trim();

  // Try parsing as fraction first
  const fraction = parseFraction(cleaned);
  if (fraction !== null) {
    return fraction;
  }

  // Clean thousand separators and normalize decimal separator
  const normalized = cleanThousandSeparators(cleaned);

  // Try parsing as regular number
  const num = parseFloat(normalized);

  if (isNaN(num)) {
    return null;
  }

  return num;
}

/**
 * Compare two numbers with floating-point tolerance
 * @param a - First number
 * @param b - Second number
 * @param tolerance - Tolerance for comparison (default: 0.0001)
 * @returns True if numbers are equal within tolerance
 */
export function numbersEqual(a: number, b: number, tolerance: number = TOLERANCE): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Validate if child's answer matches the correct answer
 * Main entry point for answer validation
 *
 * @param correctAnswer - The correct answer to compare against
 * @param childAnswer - The child's submitted answer
 * @returns True if answers are equivalent
 */
export function validateNumberAnswer(correctAnswer: string, childAnswer: string): boolean {
  // Handle empty strings
  if (!correctAnswer || !childAnswer) {
    return false;
  }

  // Fast path: exact match after basic normalization
  const normCorrect = correctAnswer.trim().toLowerCase();
  const normChild = childAnswer.trim().toLowerCase();

  if (normCorrect === normChild) {
    return true;
  }

  // Step 1: Extract units from both answers
  const correctWithUnit = extractNumberAndUnit(normCorrect);
  const childWithUnit = extractNumberAndUnit(normChild);

  // Step 2: Extract currency from numeric values
  const correctWithCurrency = extractCurrency(correctWithUnit.value);
  const childWithCurrency = extractCurrency(childWithUnit.value);

  // Step 3: Parse to numeric values
  const correctNum = parseToNumber(correctWithCurrency.value);
  const childNum = parseToNumber(childWithCurrency.value);

  // Step 4: Compare with floating-point tolerance
  if (correctNum !== null && childNum !== null) {
    return numbersEqual(correctNum, childNum);
  }

  return false;
}
