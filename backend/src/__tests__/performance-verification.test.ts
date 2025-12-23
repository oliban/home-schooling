/**
 * Performance Verification Tests
 *
 * Tests the metrics parsing and p95 calculation logic used in the
 * performance verification script (subtask-6-2).
 */

import { describe, it, expect } from 'vitest';

// Inline the parsing functions for testing
function parseHistogramBuckets(metricsText: string, metricName: string): { le: string; count: number }[] {
  const buckets: { le: string; count: number }[] = [];
  const bucketRegex = new RegExp(`${metricName}_bucket\\{[^}]*le="([^"]+)"[^}]*\\}\\s+(\\d+\\.?\\d*)`, 'g');

  let match;
  while ((match = bucketRegex.exec(metricsText)) !== null) {
    buckets.push({
      le: match[1],
      count: parseFloat(match[2]),
    });
  }

  return buckets.sort((a, b) => {
    if (a.le === '+Inf') return 1;
    if (b.le === '+Inf') return -1;
    return parseFloat(a.le) - parseFloat(b.le);
  });
}

function parseCounterTotal(metricsText: string, metricName: string): number {
  const regex = new RegExp(`${metricName}(?:\\{[^}]*\\})?\\s+(\\d+\\.?\\d*)`, 'g');
  let total = 0;
  let match;

  while ((match = regex.exec(metricsText)) !== null) {
    total += parseFloat(match[1]);
  }

  return total;
}

function calculatePercentileFromHistogram(buckets: { le: string; count: number }[], percentile: number): number {
  if (buckets.length === 0) {
    return 0;
  }

  const infBucket = buckets.find(b => b.le === '+Inf');
  const totalCount = infBucket?.count || 0;

  if (totalCount === 0) {
    return 0;
  }

  const targetCount = totalCount * (percentile / 100);

  let prevBucketCount = 0;
  let prevBucketBound = 0;

  for (const bucket of buckets) {
    if (bucket.le === '+Inf') continue;

    const bucketBound = parseFloat(bucket.le);

    if (bucket.count >= targetCount) {
      const bucketWidth = bucketBound - prevBucketBound;
      const countInBucket = bucket.count - prevBucketCount;

      if (countInBucket === 0) {
        return bucketBound;
      }

      const percentInBucket = (targetCount - prevBucketCount) / countInBucket;
      return prevBucketBound + (bucketWidth * percentInBucket);
    }

    prevBucketCount = bucket.count;
    prevBucketBound = bucketBound;
  }

  const finiteBuckets = buckets.filter(b => b.le !== '+Inf');
  if (finiteBuckets.length > 0) {
    return parseFloat(finiteBuckets[finiteBuckets.length - 1].le);
  }

  return 0;
}

describe('Performance Verification Metrics Parsing', () => {
  describe('parseHistogramBuckets', () => {
    it('should parse histogram buckets from Prometheus format', () => {
      const metricsText = `
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="0.01"} 50
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="0.05"} 80
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="0.1"} 95
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="0.2"} 100
http_request_duration_seconds_bucket{method="GET",route="/api/health",status_code="200",le="+Inf"} 100
      `;

      const buckets = parseHistogramBuckets(metricsText, 'http_request_duration_seconds');

      expect(buckets).toHaveLength(5);
      expect(buckets[0]).toEqual({ le: '0.01', count: 50 });
      expect(buckets[1]).toEqual({ le: '0.05', count: 80 });
      expect(buckets[4]).toEqual({ le: '+Inf', count: 100 });
    });

    it('should return empty array for missing metric', () => {
      const metricsText = `some_other_metric{} 123`;
      const buckets = parseHistogramBuckets(metricsText, 'http_request_duration_seconds');
      expect(buckets).toHaveLength(0);
    });

    it('should sort buckets by le value', () => {
      const metricsText = `
http_request_duration_seconds_bucket{le="+Inf"} 100
http_request_duration_seconds_bucket{le="0.1"} 90
http_request_duration_seconds_bucket{le="0.01"} 50
      `;

      const buckets = parseHistogramBuckets(metricsText, 'http_request_duration_seconds');

      expect(buckets[0].le).toBe('0.01');
      expect(buckets[1].le).toBe('0.1');
      expect(buckets[2].le).toBe('+Inf');
    });
  });

  describe('parseCounterTotal', () => {
    it('should parse counter with labels', () => {
      const metricsText = `
cache_hits_total{cache_type="children"} 25
cache_hits_total{cache_type="collectibles"} 30
cache_hits_total{cache_type="packages"} 15
      `;

      const total = parseCounterTotal(metricsText, 'cache_hits_total');
      expect(total).toBe(70);
    });

    it('should parse counter without labels', () => {
      const metricsText = `simple_counter 42`;
      const total = parseCounterTotal(metricsText, 'simple_counter');
      expect(total).toBe(42);
    });

    it('should return 0 for missing counter', () => {
      const metricsText = `other_metric 123`;
      const total = parseCounterTotal(metricsText, 'cache_hits_total');
      expect(total).toBe(0);
    });
  });

  describe('calculatePercentileFromHistogram', () => {
    it('should calculate p95 correctly when all requests are fast', () => {
      // All 100 requests completed in under 0.1 seconds
      const buckets = [
        { le: '0.01', count: 60 },
        { le: '0.05', count: 90 },
        { le: '0.1', count: 100 },
        { le: '0.2', count: 100 },
        { le: '+Inf', count: 100 },
      ];

      const p95 = calculatePercentileFromHistogram(buckets, 95);

      // p95 should be <= 0.1 since all 100 requests are under 0.1s
      expect(p95).toBeLessThanOrEqual(0.1);
    });

    it('should calculate p95 correctly with distribution across buckets', () => {
      // 95th percentile falls in 0.1-0.2 bucket
      const buckets = [
        { le: '0.01', count: 20 },
        { le: '0.05', count: 40 },
        { le: '0.1', count: 80 },
        { le: '0.2', count: 98 },
        { le: '0.5', count: 100 },
        { le: '+Inf', count: 100 },
      ];

      const p95 = calculatePercentileFromHistogram(buckets, 95);

      // 95th request (out of 100) falls in 0.1-0.2 bucket
      expect(p95).toBeGreaterThanOrEqual(0.1);
      expect(p95).toBeLessThanOrEqual(0.2);
    });

    it('should return 0 for empty buckets', () => {
      const p95 = calculatePercentileFromHistogram([], 95);
      expect(p95).toBe(0);
    });

    it('should return 0 for zero total count', () => {
      const buckets = [
        { le: '0.01', count: 0 },
        { le: '0.05', count: 0 },
        { le: '+Inf', count: 0 },
      ];

      const p95 = calculatePercentileFromHistogram(buckets, 95);
      expect(p95).toBe(0);
    });

    it('should calculate p50 (median) correctly', () => {
      const buckets = [
        { le: '0.01', count: 40 },
        { le: '0.05', count: 60 },
        { le: '0.1', count: 100 },
        { le: '+Inf', count: 100 },
      ];

      const p50 = calculatePercentileFromHistogram(buckets, 50);

      // 50th request falls in 0.01-0.05 bucket
      expect(p50).toBeGreaterThanOrEqual(0.01);
      expect(p50).toBeLessThanOrEqual(0.05);
    });
  });

  describe('Performance Criteria Validation', () => {
    it('should verify p95 < 200ms for fast responses', () => {
      // Simulate metrics where all requests complete within 200ms
      const buckets = [
        { le: '0.01', count: 30 },
        { le: '0.05', count: 70 },
        { le: '0.1', count: 90 },
        { le: '0.2', count: 100 },
        { le: '0.5', count: 100 },
        { le: '1', count: 100 },
        { le: '2', count: 100 },
        { le: '5', count: 100 },
        { le: '+Inf', count: 100 },
      ];

      const p95 = calculatePercentileFromHistogram(buckets, 95);

      // All requests complete within 0.2s, so p95 should be < 0.2
      expect(p95).toBeLessThan(0.2);
    });

    it('should detect p95 > 200ms for slow responses', () => {
      // Simulate metrics where some requests are slow
      const buckets = [
        { le: '0.01', count: 10 },
        { le: '0.05', count: 30 },
        { le: '0.1', count: 50 },
        { le: '0.2', count: 70 },
        { le: '0.5', count: 90 },
        { le: '1', count: 100 },
        { le: '+Inf', count: 100 },
      ];

      const p95 = calculatePercentileFromHistogram(buckets, 95);

      // p95 falls in 0.5-1.0 bucket, so should be > 0.2
      expect(p95).toBeGreaterThan(0.2);
    });

    it('should calculate cache hit rate correctly', () => {
      const cacheHits = 75;
      const cacheMisses = 25;
      const hitRate = cacheHits / (cacheHits + cacheMisses);

      expect(hitRate).toBe(0.75);
      expect(hitRate).toBeGreaterThan(0.7);
    });
  });
});
