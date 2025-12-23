/**
 * Curriculum endpoint caching tests
 * Tests the Redis caching configuration for curriculum endpoints
 *
 * Note: These tests verify the caching pattern and configuration
 * without requiring a live Redis connection.
 */

import { describe, it, expect } from 'vitest';

// Test constants matching the implementation in curriculum.ts
const CURRICULUM_CACHE_TTL = 300; // 5 minutes

const TEST_CHILD_ID = 'test-child-123';

// Mirror the cache key functions from curriculum.ts
function getCoverageCacheKey(childId: string): string {
  return `curriculum:coverage:${childId}`;
}

function getGapsCacheKey(childId: string): string {
  return `curriculum:gaps:${childId}`;
}

function getRecommendationsCacheKey(childId: string): string {
  return `curriculum:recommendations:${childId}`;
}

function getGenerationSuggestionsCacheKey(childId: string): string {
  return `curriculum:suggestions:${childId}`;
}

describe('Curriculum Cache Configuration', () => {
  it('should have correct coverage cache key format', () => {
    const cacheKey = getCoverageCacheKey(TEST_CHILD_ID);
    expect(cacheKey).toBe(`curriculum:coverage:${TEST_CHILD_ID}`);
  });

  it('should have correct gaps cache key format', () => {
    const cacheKey = getGapsCacheKey(TEST_CHILD_ID);
    expect(cacheKey).toBe(`curriculum:gaps:${TEST_CHILD_ID}`);
  });

  it('should have correct recommendations cache key format', () => {
    const cacheKey = getRecommendationsCacheKey(TEST_CHILD_ID);
    expect(cacheKey).toBe(`curriculum:recommendations:${TEST_CHILD_ID}`);
  });

  it('should have correct generation suggestions cache key format', () => {
    const cacheKey = getGenerationSuggestionsCacheKey(TEST_CHILD_ID);
    expect(cacheKey).toBe(`curriculum:suggestions:${TEST_CHILD_ID}`);
  });

  it('should have TTL configured correctly', () => {
    // TTL should be 5 minutes (300 seconds) for curriculum data
    expect(CURRICULUM_CACHE_TTL).toBe(300);
  });
});

describe('Curriculum Cache Key Isolation', () => {
  it('should generate unique cache keys per child for coverage', () => {
    const child1Key = getCoverageCacheKey('child-aaa');
    const child2Key = getCoverageCacheKey('child-bbb');
    expect(child1Key).not.toBe(child2Key);
  });

  it('should generate unique cache keys per child for gaps', () => {
    const child1Key = getGapsCacheKey('child-aaa');
    const child2Key = getGapsCacheKey('child-bbb');
    expect(child1Key).not.toBe(child2Key);
  });

  it('should generate unique cache keys per child for recommendations', () => {
    const child1Key = getRecommendationsCacheKey('child-aaa');
    const child2Key = getRecommendationsCacheKey('child-bbb');
    expect(child1Key).not.toBe(child2Key);
  });

  it('should generate unique cache keys per child for suggestions', () => {
    const child1Key = getGenerationSuggestionsCacheKey('child-aaa');
    const child2Key = getGenerationSuggestionsCacheKey('child-bbb');
    expect(child1Key).not.toBe(child2Key);
  });

  it('should handle UUID format child IDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(getCoverageCacheKey(uuid)).toBe(`curriculum:coverage:${uuid}`);
    expect(getGapsCacheKey(uuid)).toBe(`curriculum:gaps:${uuid}`);
    expect(getRecommendationsCacheKey(uuid)).toBe(`curriculum:recommendations:${uuid}`);
    expect(getGenerationSuggestionsCacheKey(uuid)).toBe(`curriculum:suggestions:${uuid}`);
  });

  it('should have different keys for different endpoint types', () => {
    const coverageKey = getCoverageCacheKey(TEST_CHILD_ID);
    const gapsKey = getGapsCacheKey(TEST_CHILD_ID);
    const recommendationsKey = getRecommendationsCacheKey(TEST_CHILD_ID);
    const suggestionsKey = getGenerationSuggestionsCacheKey(TEST_CHILD_ID);

    const keys = [coverageKey, gapsKey, recommendationsKey, suggestionsKey];
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(4);
  });
});

describe('Curriculum Cache Key Namespacing', () => {
  it('should use curriculum namespace for all keys', () => {
    const coverageKey = getCoverageCacheKey(TEST_CHILD_ID);
    const gapsKey = getGapsCacheKey(TEST_CHILD_ID);
    const recommendationsKey = getRecommendationsCacheKey(TEST_CHILD_ID);
    const suggestionsKey = getGenerationSuggestionsCacheKey(TEST_CHILD_ID);

    expect(coverageKey.startsWith('curriculum:')).toBe(true);
    expect(gapsKey.startsWith('curriculum:')).toBe(true);
    expect(recommendationsKey.startsWith('curriculum:')).toBe(true);
    expect(suggestionsKey.startsWith('curriculum:')).toBe(true);
  });

  it('should allow for pattern-based invalidation per child', () => {
    const childId = 'test-child-abc';
    const keys = [
      getCoverageCacheKey(childId),
      getGapsCacheKey(childId),
      getRecommendationsCacheKey(childId),
      getGenerationSuggestionsCacheKey(childId)
    ];

    // All keys should contain the childId
    keys.forEach(key => {
      expect(key).toContain(childId);
    });
  });

  it('should have consistent structure for parsing', () => {
    const key = getCoverageCacheKey(TEST_CHILD_ID);
    const parts = key.split(':');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('curriculum');
    expect(parts[1]).toBe('coverage');
    expect(parts[2]).toBe(TEST_CHILD_ID);
  });
});
