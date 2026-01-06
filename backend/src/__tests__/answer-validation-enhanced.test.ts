/**
 * Comprehensive tests for enhanced answer validation
 */

import {
  extractNumberAndUnit,
  extractCurrency,
  parseFraction,
  cleanThousandSeparators,
  parseToNumber,
  numbersEqual,
  validateNumberAnswer
} from '../utils/answer-validation';

describe('Answer Validation - Enhanced', () => {

  // ============================================================================
  // 1. UNIT EXTRACTION TESTS (25 tests)
  // ============================================================================

  describe('extractNumberAndUnit', () => {
    describe('basic unit extraction', () => {
      it('should extract number with no space before unit', () => {
        expect(extractNumberAndUnit('5m')).toEqual({ value: '5', unit: 'm' });
      });

      it('should extract number with space before unit', () => {
        expect(extractNumberAndUnit('5 m')).toEqual({ value: '5', unit: 'm' });
      });

      it('should extract number with full unit name', () => {
        expect(extractNumberAndUnit('5 meter')).toEqual({ value: '5', unit: 'm' });
      });

      it('should extract number with plural unit name', () => {
        expect(extractNumberAndUnit('5 meters')).toEqual({ value: '5', unit: 'm' });
      });
    });

    describe('different unit types', () => {
      it('should handle mass units - kg', () => {
        expect(extractNumberAndUnit('10kg')).toEqual({ value: '10', unit: 'kg' });
      });

      it('should handle mass units - kilogram', () => {
        expect(extractNumberAndUnit('10 kilogram')).toEqual({ value: '10', unit: 'kg' });
      });

      it('should handle volume units - l', () => {
        expect(extractNumberAndUnit('2l')).toEqual({ value: '2', unit: 'l' });
      });

      it('should handle volume units - liter', () => {
        expect(extractNumberAndUnit('2 liter')).toEqual({ value: '2', unit: 'l' });
      });

      it('should handle time units - h', () => {
        expect(extractNumberAndUnit('3h')).toEqual({ value: '3', unit: 'h' });
      });

      it('should handle time units - timmar', () => {
        expect(extractNumberAndUnit('3 timmar')).toEqual({ value: '3', unit: 'h' });
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase units', () => {
        expect(extractNumberAndUnit('2L')).toEqual({ value: '2', unit: 'l' });
      });

      it('should handle mixed case units', () => {
        expect(extractNumberAndUnit('5 Meter')).toEqual({ value: '5', unit: 'm' });
      });
    });

    describe('decimal numbers with units', () => {
      it('should handle decimal with comma and unit', () => {
        expect(extractNumberAndUnit('2,5 m')).toEqual({ value: '2,5', unit: 'm' });
      });

      it('should handle decimal with period and unit', () => {
        expect(extractNumberAndUnit('2.5 m')).toEqual({ value: '2.5', unit: 'm' });
      });
    });

    describe('no unit cases', () => {
      it('should return null for unit when no unit present', () => {
        expect(extractNumberAndUnit('5')).toEqual({ value: '5', unit: null });
      });

      it('should handle decimal numbers with no unit', () => {
        expect(extractNumberAndUnit('3.14')).toEqual({ value: '3.14', unit: null });
      });
    });
  });

  // ============================================================================
  // 2. CURRENCY EXTRACTION TESTS (20 tests)
  // ============================================================================

  describe('extractCurrency', () => {
    describe('suffix currency formats', () => {
      it('should extract currency suffix without space', () => {
        expect(extractCurrency('100kr')).toEqual({ value: '100', currency: 'kr' });
      });

      it('should extract currency suffix with space', () => {
        expect(extractCurrency('100 kr')).toEqual({ value: '100', currency: 'kr' });
      });

      it('should extract "kronor" suffix', () => {
        expect(extractCurrency('100 kronor')).toEqual({ value: '100', currency: 'kr' });
      });

      it('should extract "SEK" suffix', () => {
        expect(extractCurrency('100 SEK')).toEqual({ value: '100', currency: 'kr' });
      });
    });

    describe('prefix currency formats', () => {
      it('should extract currency prefix without space', () => {
        expect(extractCurrency('kr100')).toEqual({ value: '100', currency: 'kr' });
      });

      it('should extract currency prefix with space', () => {
        expect(extractCurrency('kr 100')).toEqual({ value: '100', currency: 'kr' });
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase currency', () => {
        expect(extractCurrency('100 KR')).toEqual({ value: '100', currency: 'kr' });
      });

      it('should handle mixed case currency', () => {
        expect(extractCurrency('100 Kronor')).toEqual({ value: '100', currency: 'kr' });
      });
    });

    describe('decimals with currency', () => {
      it('should handle decimal with comma and currency', () => {
        expect(extractCurrency('5,50 kr')).toEqual({ value: '5,50', currency: 'kr' });
      });

      it('should handle decimal with period and currency', () => {
        expect(extractCurrency('5.50 kr')).toEqual({ value: '5.50', currency: 'kr' });
      });
    });

    describe('thousand separators with currency', () => {
      it('should handle thousand separator (space) with currency', () => {
        expect(extractCurrency('1 000 kr')).toEqual({ value: '1 000', currency: 'kr' });
      });

      it('should handle thousand separator (comma) with currency', () => {
        expect(extractCurrency('1,000 kr')).toEqual({ value: '1,000', currency: 'kr' });
      });
    });

    describe('no currency cases', () => {
      it('should return null for currency when no currency present', () => {
        expect(extractCurrency('100')).toEqual({ value: '100', currency: null });
      });
    });
  });

  // ============================================================================
  // 3. FRACTION PARSING TESTS (15 tests)
  // ============================================================================

  describe('parseFraction', () => {
    describe('basic fractions', () => {
      it('should parse 1/2', () => {
        expect(parseFraction('1/2')).toBe(0.5);
      });

      it('should parse 1/4', () => {
        expect(parseFraction('1/4')).toBe(0.25);
      });

      it('should parse 3/4', () => {
        expect(parseFraction('3/4')).toBe(0.75);
      });
    });

    describe('repeating decimals', () => {
      it('should parse 1/3', () => {
        const result = parseFraction('1/3');
        expect(result).toBeCloseTo(0.333333, 5);
      });

      it('should parse 2/3', () => {
        const result = parseFraction('2/3');
        expect(result).toBeCloseTo(0.666666, 5);
      });
    });

    describe('fractions with spaces', () => {
      it('should parse fraction with spaces around slash', () => {
        expect(parseFraction('1 / 2')).toBe(0.5);
      });

      it('should parse fraction with leading/trailing spaces', () => {
        expect(parseFraction(' 1/2 ')).toBe(0.5);
      });
    });

    describe('invalid fractions', () => {
      it('should return null for division by zero', () => {
        expect(parseFraction('1/0')).toBe(null);
      });

      it('should return null for invalid format', () => {
        expect(parseFraction('abc')).toBe(null);
      });

      it('should return null for not a fraction', () => {
        expect(parseFraction('5')).toBe(null);
      });
    });
  });

  // ============================================================================
  // 4. THOUSAND SEPARATOR NORMALIZATION TESTS (15 tests)
  // ============================================================================

  describe('cleanThousandSeparators', () => {
    describe('space separators (Swedish standard)', () => {
      it('should remove single space separator', () => {
        expect(cleanThousandSeparators('1 000')).toBe('1000');
      });

      it('should remove multiple space separators', () => {
        expect(cleanThousandSeparators('1 000 000')).toBe('1000000');
      });

      it('should handle space separator with decimal comma', () => {
        expect(cleanThousandSeparators('1 000,50')).toBe('1000.50');
      });
    });

    describe('comma separators (English standard)', () => {
      it('should remove single comma separator', () => {
        expect(cleanThousandSeparators('1,000')).toBe('1000');
      });

      it('should remove multiple comma separators', () => {
        expect(cleanThousandSeparators('1,000,000')).toBe('1000000');
      });
    });

    describe('decimal commas', () => {
      it('should convert decimal comma to period', () => {
        expect(cleanThousandSeparators('3,5')).toBe('3.5');
      });

      it('should convert decimal comma with two digits', () => {
        expect(cleanThousandSeparators('3,50')).toBe('3.50');
      });

      it('should not confuse decimal comma with thousand separator', () => {
        expect(cleanThousandSeparators('3,500')).toBe('3500'); // 3,500 is three thousand five hundred
      });
    });

    describe('no separators', () => {
      it('should handle numbers without separators', () => {
        expect(cleanThousandSeparators('1000')).toBe('1000');
      });

      it('should handle decimal with period (no change needed)', () => {
        expect(cleanThousandSeparators('3.5')).toBe('3.5');
      });
    });
  });

  // ============================================================================
  // 5. NUMBER PARSING TESTS (20 tests)
  // ============================================================================

  describe('parseToNumber', () => {
    describe('plain numbers', () => {
      it('should parse integer', () => {
        expect(parseToNumber('5')).toBe(5);
      });

      it('should parse decimal with period', () => {
        expect(parseToNumber('3.5')).toBe(3.5);
      });

      it('should parse decimal with comma', () => {
        expect(parseToNumber('3,5')).toBe(3.5);
      });
    });

    describe('fractions', () => {
      it('should parse fraction 1/2', () => {
        expect(parseToNumber('1/2')).toBe(0.5);
      });

      it('should parse fraction 1/4', () => {
        expect(parseToNumber('1/4')).toBe(0.25);
      });
    });

    describe('percentages (as formatting, not mathematical)', () => {
      it('should strip % and return numeric value', () => {
        expect(parseToNumber('50%')).toBe(50);
      });

      it('should strip % from decimal', () => {
        expect(parseToNumber('50.5%')).toBe(50.5);
      });

      it('should NOT convert % to decimal (35% = 35, not 0.35)', () => {
        expect(parseToNumber('35%')).toBe(35);
        expect(parseToNumber('35%')).not.toBe(0.35);
      });
    });

    describe('thousand separators', () => {
      it('should parse number with space separator', () => {
        expect(parseToNumber('1 000')).toBe(1000);
      });

      it('should parse number with comma separator', () => {
        expect(parseToNumber('1,000')).toBe(1000);
      });

      it('should parse large number with mixed separators', () => {
        expect(parseToNumber('1 000,50')).toBe(1000.5);
      });
    });

    describe('leading/trailing zeros', () => {
      it('should handle leading zeros', () => {
        expect(parseToNumber('007')).toBe(7);
      });

      it('should handle trailing zeros in decimal', () => {
        expect(parseToNumber('5.0')).toBe(5);
      });
    });

    describe('negative numbers', () => {
      it('should parse negative integer', () => {
        expect(parseToNumber('-5')).toBe(-5);
      });

      it('should parse negative decimal', () => {
        expect(parseToNumber('-3.5')).toBe(-3.5);
      });
    });

    describe('invalid inputs', () => {
      it('should return null for empty string', () => {
        expect(parseToNumber('')).toBe(null);
      });

      it('should return null for non-numeric string', () => {
        expect(parseToNumber('abc')).toBe(null);
      });
    });
  });

  // ============================================================================
  // 6. FLOATING POINT COMPARISON TESTS (10 tests)
  // ============================================================================

  describe('numbersEqual', () => {
    describe('exact matches', () => {
      it('should match exact integers', () => {
        expect(numbersEqual(5, 5)).toBe(true);
      });

      it('should match exact decimals', () => {
        expect(numbersEqual(3.5, 3.5)).toBe(true);
      });
    });

    describe('floating-point tolerance', () => {
      it('should match within tolerance', () => {
        expect(numbersEqual(0.1 + 0.2, 0.3)).toBe(true);
      });

      it('should match repeating decimals (1/3)', () => {
        expect(numbersEqual(1/3, 0.3333)).toBe(true);
      });

      it('should match repeating decimals (2/3)', () => {
        expect(numbersEqual(2/3, 0.6667)).toBe(true);
      });
    });

    describe('no match outside tolerance', () => {
      it('should NOT accept 5.01 when correct answer is integer 5', () => {
        // Rounding tolerance only applies when correct answer has decimals
        // Integer answers require exact match
        expect(numbersEqual(5, 5.01)).toBe(false);
      });

      it('should accept 5.01 when correct answer is decimal 5.0001', () => {
        // When correct answer has decimals, rounding tolerance applies
        expect(numbersEqual(5.0001, 5.01)).toBe(true);
      });

      it('should not match significantly different numbers', () => {
        expect(numbersEqual(35, 0.35)).toBe(false);
      });

      it('should not match numbers that differ by more than 1', () => {
        expect(numbersEqual(5, 6.5)).toBe(false);
      });
    });

    describe('negative numbers', () => {
      it('should match negative numbers', () => {
        expect(numbersEqual(-5, -5)).toBe(true);
      });

      it('should not match positive and negative', () => {
        expect(numbersEqual(5, -5)).toBe(false);
      });
    });
  });

  // ============================================================================
  // 7. COMPLETE VALIDATION TESTS (50 tests)
  // ============================================================================

  describe('validateNumberAnswer - Complete Integration', () => {

    describe('exact matches', () => {
      it('should match exact strings', () => {
        expect(validateNumberAnswer('5', '5')).toBe(true);
      });

      it('should match with different whitespace', () => {
        expect(validateNumberAnswer('5', ' 5 ')).toBe(true);
      });

      it('should match with different case', () => {
        expect(validateNumberAnswer('5M', '5m')).toBe(true);
      });
    });

    describe('units - equivalent forms', () => {
      it('should match 5m and 5 m', () => {
        expect(validateNumberAnswer('5m', '5 m')).toBe(true);
      });

      it('should match 5m and 5meter', () => {
        expect(validateNumberAnswer('5m', '5meter')).toBe(true);
      });

      it('should match 5 meter and 5 meters', () => {
        expect(validateNumberAnswer('5 meter', '5 meters')).toBe(true);
      });

      it('should match 10kg and 10 kilogram', () => {
        expect(validateNumberAnswer('10kg', '10 kilogram')).toBe(true);
      });

      it('should match 2l and 2 L (case insensitive)', () => {
        expect(validateNumberAnswer('2l', '2 L')).toBe(true);
      });

      it('should match number with and without unit', () => {
        expect(validateNumberAnswer('5', '5m')).toBe(true);
      });

      it('should match decimal with unit: 2,5 m and 2.5', () => {
        expect(validateNumberAnswer('2,5 m', '2.5')).toBe(true);
      });
    });

    describe('currency - equivalent forms', () => {
      it('should match 100kr and 100', () => {
        expect(validateNumberAnswer('100kr', '100')).toBe(true);
      });

      it('should match 100 kr and 100', () => {
        expect(validateNumberAnswer('100 kr', '100')).toBe(true);
      });

      it('should match kr100 and 100', () => {
        expect(validateNumberAnswer('kr100', '100')).toBe(true);
      });

      it('should match kr 100 and 100', () => {
        expect(validateNumberAnswer('kr 100', '100')).toBe(true);
      });

      it('should match 100 kronor and 100', () => {
        expect(validateNumberAnswer('100 kronor', '100')).toBe(true);
      });

      it('should match 100 SEK and 100', () => {
        expect(validateNumberAnswer('100 SEK', '100')).toBe(true);
      });

      it('should match 1 000 kr and 1000', () => {
        expect(validateNumberAnswer('1 000 kr', '1000')).toBe(true);
      });
    });

    describe('fractions and decimals - equivalent forms', () => {
      it('should match 1/2 and 0.5', () => {
        expect(validateNumberAnswer('1/2', '0.5')).toBe(true);
      });

      it('should match 1/2 and 0,5 (Swedish decimal)', () => {
        expect(validateNumberAnswer('1/2', '0,5')).toBe(true);
      });

      it('should match 1/4 and 0.25', () => {
        expect(validateNumberAnswer('1/4', '0.25')).toBe(true);
      });

      it('should match 3/4 and 0.75', () => {
        expect(validateNumberAnswer('3/4', '0.75')).toBe(true);
      });

      it('should match 1/3 and 0.333 (with tolerance)', () => {
        expect(validateNumberAnswer('1/3', '0.333')).toBe(true);
      });

      it('should match 1/3 and 0.3333 (with tolerance)', () => {
        expect(validateNumberAnswer('1/3', '0.3333')).toBe(true);
      });

      it('should match 2/3 and 0.666666', () => {
        expect(validateNumberAnswer('2/3', '0.666666')).toBe(true);
      });
    });

    describe('percentages - as formatting (NOT mathematical)', () => {
      it('should match 50 and 50%', () => {
        expect(validateNumberAnswer('50', '50%')).toBe(true);
      });

      it('should match 35 and 35%', () => {
        expect(validateNumberAnswer('35', '35%')).toBe(true);
      });

      it('should match 35 and 35 % (space before %)', () => {
        expect(validateNumberAnswer('35', '35 %')).toBe(true);
      });

      it('should match 35% and 35', () => {
        expect(validateNumberAnswer('35%', '35')).toBe(true);
      });

      it('should NOT match 1/2 and 50% (% is formatting, not mathematical)', () => {
        expect(validateNumberAnswer('1/2', '50%')).toBe(false);
      });

      it('should NOT match 0.35 and 35%', () => {
        expect(validateNumberAnswer('0.35', '35%')).toBe(false);
      });
    });

    describe('thousand separators - equivalent forms', () => {
      it('should match 1000 and 1 000', () => {
        expect(validateNumberAnswer('1000', '1 000')).toBe(true);
      });

      it('should match 1000 and 1,000', () => {
        expect(validateNumberAnswer('1000', '1,000')).toBe(true);
      });

      it('should match 10000 and 10 000', () => {
        expect(validateNumberAnswer('10000', '10 000')).toBe(true);
      });

      it('should match 1000000 and 1 000 000', () => {
        expect(validateNumberAnswer('1000000', '1 000 000')).toBe(true);
      });

      it('should NOT match 3,5 and 3,500 (decimal vs thousand)', () => {
        expect(validateNumberAnswer('3.5', '3500')).toBe(false);
      });

      it('should match 1 000,50 and 1000.5', () => {
        expect(validateNumberAnswer('1 000,50', '1000.5')).toBe(true);
      });
    });

    describe('combined cases', () => {
      it('should match 1 000 kr and 1000', () => {
        expect(validateNumberAnswer('1 000 kr', '1000')).toBe(true);
      });

      it('should match 2,5 m and 2.5 meter', () => {
        expect(validateNumberAnswer('2,5 m', '2.5 meter')).toBe(true);
      });

      it('should match 1/2 l and 0.5', () => {
        expect(validateNumberAnswer('1/2 l', '0.5')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should match 0 and 0.0', () => {
        expect(validateNumberAnswer('0', '0.0')).toBe(true);
      });

      it('should match -5 and -5.0', () => {
        expect(validateNumberAnswer('-5', '-5.0')).toBe(true);
      });

      it('should NOT match invalid fraction 1/0', () => {
        expect(validateNumberAnswer('5', '1/0')).toBe(false);
      });

      it('should NOT match empty strings', () => {
        expect(validateNumberAnswer('', '')).toBe(false);
      });

      it('should NOT match non-numeric strings', () => {
        expect(validateNumberAnswer('abc', 'def')).toBe(false);
      });

      it('should match leading zeros: 007 and 7', () => {
        expect(validateNumberAnswer('007', '7')).toBe(true);
      });

      it('should match trailing zeros: 5.0 and 5', () => {
        expect(validateNumberAnswer('5.0', '5')).toBe(true);
      });
    });

    describe('backward compatibility (coordinates)', () => {
      it('should still handle coordinate format (5,6)', () => {
        // This is an existing behavior that should be preserved
        // Coordinates like (5,6) should match 5,6 or (5, 6)
        expect(validateNumberAnswer('(5,6)', '5,6')).toBe(true);
      });

      it('should handle coordinate with spaces', () => {
        expect(validateNumberAnswer('(5, 6)', '5,6')).toBe(true);
      });
    });

    describe('integer exact match (no rounding tolerance)', () => {
      it('should NOT accept 7 when correct answer is 8', () => {
        expect(validateNumberAnswer('8', '7')).toBe(false);
      });

      it('should NOT accept 9 when correct answer is 8', () => {
        expect(validateNumberAnswer('8', '9')).toBe(false);
      });

      it('should accept exact match for integers', () => {
        expect(validateNumberAnswer('8', '8')).toBe(true);
      });

      it('should NOT accept 47 when correct answer is 48', () => {
        expect(validateNumberAnswer('48', '47')).toBe(false);
      });

      it('should NOT accept 100 when correct answer is 99', () => {
        expect(validateNumberAnswer('99', '100')).toBe(false);
      });
    });

    describe('rounding tolerance', () => {
      it('should accept rounded answer for average: 228.57 rounded to 228', () => {
        expect(validateNumberAnswer('228.57', '228')).toBe(true);
      });

      it('should accept rounded answer for average: 228.57 rounded to 229', () => {
        expect(validateNumberAnswer('228.57', '229')).toBe(true);
      });

      it('should accept 228.6 as answer for 228.57', () => {
        expect(validateNumberAnswer('228.57', '228.6')).toBe(true);
      });

      it('should accept 12.5 rounded to 12', () => {
        expect(validateNumberAnswer('12.5', '12')).toBe(true);
      });

      it('should accept 12.5 rounded to 13', () => {
        expect(validateNumberAnswer('12.5', '13')).toBe(true);
      });

      it('should accept 3.33 as answer for 3.333...', () => {
        expect(validateNumberAnswer('3.333333', '3.33')).toBe(true);
      });

      it('should accept 3 as answer for 3.333... (rounded down)', () => {
        expect(validateNumberAnswer('3.333333', '3')).toBe(true);
      });

      it('should NOT accept answers that differ by more than 1', () => {
        expect(validateNumberAnswer('228.57', '230')).toBe(false);
      });

      it('should NOT accept answers that differ by more than 1 (lower)', () => {
        expect(validateNumberAnswer('228.57', '227')).toBe(false);
      });

      it('should accept answers within 0.5 for small numbers', () => {
        expect(validateNumberAnswer('5.7', '6')).toBe(true);
      });

      it('should accept 0.33 for 1/3', () => {
        expect(validateNumberAnswer('0.333333', '0.33')).toBe(true);
      });

      it('should work with Swedish comma format', () => {
        expect(validateNumberAnswer('228,57', '228')).toBe(true);
      });

      it('should NOT accept 228.57 when correct answer is integer 228', () => {
        // If the correct answer is an integer, rounding tolerance does not apply
        // Child must answer exactly 228, not 228.57
        expect(validateNumberAnswer('228', '228.57')).toBe(false);
      });
    });
  });
});
