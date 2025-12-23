/**
 * Prometheus Metrics tests
 * Tests the metrics configuration for performance monitoring
 */

import { describe, it, expect } from 'vitest';
import { register, httpRequestDuration, cacheHits, cacheMisses } from '../index.js';

describe('Prometheus Registry Configuration', () => {
  it('should have register exported and configured', () => {
    expect(register).toBeDefined();
    expect(typeof register.metrics).toBe('function');
    expect(typeof register.contentType).toBe('string');
  });

  it('should have correct content type for Prometheus', () => {
    expect(register.contentType).toContain('text/plain');
  });

  it('should collect default metrics', async () => {
    const metricsOutput = await register.metrics();
    // Default metrics include process and nodejs metrics
    expect(metricsOutput).toContain('process_');
    expect(metricsOutput).toContain('nodejs_');
  });
});

describe('HTTP Request Duration Histogram', () => {
  it('should have httpRequestDuration exported and configured', () => {
    expect(httpRequestDuration).toBeDefined();
  });

  it('should have correct histogram name', async () => {
    const metricsOutput = await register.metrics();
    expect(metricsOutput).toContain('http_request_duration_seconds');
  });

  it('should have correct histogram buckets after observation', async () => {
    // Make an observation to populate the histogram
    const endTimer = httpRequestDuration.startTimer();
    endTimer({ method: 'GET', route: '/test-bucket', status_code: '200' });

    const metricsOutput = await register.metrics();
    // Check for the defined buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="0.01"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="0.05"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="0.1"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="0.2"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="0.5"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="1"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="2"');
    expect(metricsOutput).toContain('http_request_duration_seconds_bucket{le="5"');
  });

  it('should have help text defined', async () => {
    const metricsOutput = await register.metrics();
    expect(metricsOutput).toContain('# HELP http_request_duration_seconds');
    expect(metricsOutput).toContain('Duration of HTTP requests in seconds');
  });

  it('should support startTimer for measuring duration', () => {
    const endTimer = httpRequestDuration.startTimer();
    expect(typeof endTimer).toBe('function');
    // End the timer to avoid leaking metrics
    endTimer({ method: 'GET', route: '/test', status_code: '200' });
  });
});

describe('Cache Metrics Counters', () => {
  it('should have cacheHits exported and configured', () => {
    expect(cacheHits).toBeDefined();
  });

  it('should have cacheMisses exported and configured', () => {
    expect(cacheMisses).toBeDefined();
  });

  it('should have cache_hits_total metric defined', async () => {
    const metricsOutput = await register.metrics();
    expect(metricsOutput).toContain('# HELP cache_hits_total');
    expect(metricsOutput).toContain('Total number of cache hits');
  });

  it('should have cache_misses_total metric defined', async () => {
    const metricsOutput = await register.metrics();
    expect(metricsOutput).toContain('# HELP cache_misses_total');
    expect(metricsOutput).toContain('Total number of cache misses');
  });

  it('should support incrementing cache hits', () => {
    // Increment the counter
    cacheHits.inc({ cache_type: 'test' });
    // No error means it works
    expect(true).toBe(true);
  });

  it('should support incrementing cache misses', () => {
    // Increment the counter
    cacheMisses.inc({ cache_type: 'test' });
    // No error means it works
    expect(true).toBe(true);
  });
});
