/**
 * CORS configuration utility tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseAllowedOrigins,
  isDevelopment,
  buildCorsOptions,
  getAllowedOrigins,
} from '../config/cors.js';

describe('CORS Configuration', () => {
  describe('parseAllowedOrigins', () => {
    it('should parse a single origin', () => {
      const result = parseAllowedOrigins('https://example.com');
      expect(result).toEqual(['https://example.com']);
    });

    it('should parse multiple comma-separated origins', () => {
      const result = parseAllowedOrigins('https://example.com,https://app.example.com,https://admin.example.com');
      expect(result).toEqual([
        'https://example.com',
        'https://app.example.com',
        'https://admin.example.com',
      ]);
    });

    it('should trim whitespace from origins', () => {
      const result = parseAllowedOrigins('  https://example.com  ,  https://app.example.com  ');
      expect(result).toEqual(['https://example.com', 'https://app.example.com']);
    });

    it('should filter out empty entries', () => {
      const result = parseAllowedOrigins('https://example.com,,https://app.example.com,');
      expect(result).toEqual(['https://example.com', 'https://app.example.com']);
    });

    it('should return empty array for undefined input', () => {
      const result = parseAllowedOrigins(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = parseAllowedOrigins('');
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      const result = parseAllowedOrigins('   ');
      expect(result).toEqual([]);
    });

    it('should handle origins with ports', () => {
      const result = parseAllowedOrigins('http://localhost:3000,http://localhost:3001');
      expect(result).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    });

    it('should preserve origin protocol and path', () => {
      const result = parseAllowedOrigins('https://example.com:8080');
      expect(result).toEqual(['https://example.com:8080']);
    });
  });

  describe('isDevelopment', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      // Restore original NODE_ENV
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });

    it('should return true when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      expect(isDevelopment()).toBe(true);
    });

    it('should return true when NODE_ENV is "development"', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('should return true when NODE_ENV is "test"', () => {
      process.env.NODE_ENV = 'test';
      expect(isDevelopment()).toBe(true);
    });

    it('should return false when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('buildCorsOptions', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

    beforeEach(() => {
      // Reset environment variables before each test
      delete process.env.ALLOWED_ORIGINS;
    });

    afterEach(() => {
      // Restore original values
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      if (originalAllowedOrigins !== undefined) {
        process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
      } else {
        delete process.env.ALLOWED_ORIGINS;
      }
    });

    it('should use configured origins when ALLOWED_ORIGINS is set', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      const options = buildCorsOptions();

      expect(options.origin).toEqual(['https://example.com', 'https://app.example.com']);
      expect(options.credentials).toBe(true);
    });

    it('should use localhost origins in development mode without ALLOWED_ORIGINS', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;

      const options = buildCorsOptions();

      expect(options.origin).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ]);
      expect(options.credentials).toBe(true);
    });

    it('should block all origins in production without ALLOWED_ORIGINS', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;

      const options = buildCorsOptions();

      expect(options.origin).toBe(false);
      expect(options.credentials).toBe(true);
    });

    it('should prioritize ALLOWED_ORIGINS over development defaults', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOWED_ORIGINS = 'https://custom-origin.com';

      const options = buildCorsOptions();

      expect(options.origin).toEqual(['https://custom-origin.com']);
      expect(options.credentials).toBe(true);
    });

    it('should always enable credentials', () => {
      // Test with configured origins
      process.env.ALLOWED_ORIGINS = 'https://example.com';
      expect(buildCorsOptions().credentials).toBe(true);

      // Test with development defaults
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'development';
      expect(buildCorsOptions().credentials).toBe(true);

      // Test with production block
      process.env.NODE_ENV = 'production';
      expect(buildCorsOptions().credentials).toBe(true);
    });
  });

  describe('getAllowedOrigins', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

    beforeEach(() => {
      delete process.env.ALLOWED_ORIGINS;
    });

    afterEach(() => {
      if (originalNodeEnv !== undefined) {
        process.env.NODE_ENV = originalNodeEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      if (originalAllowedOrigins !== undefined) {
        process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
      } else {
        delete process.env.ALLOWED_ORIGINS;
      }
    });

    it('should return configured origins when ALLOWED_ORIGINS is set', () => {
      process.env.ALLOWED_ORIGINS = 'https://example.com,https://app.example.com';

      const result = getAllowedOrigins();

      expect(result).toEqual(['https://example.com', 'https://app.example.com']);
    });

    it('should return localhost origins in development mode', () => {
      process.env.NODE_ENV = 'development';

      const result = getAllowedOrigins();

      expect(result).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ]);
    });

    it('should return "none" in production without configured origins', () => {
      process.env.NODE_ENV = 'production';

      const result = getAllowedOrigins();

      expect(result).toBe('none');
    });

    it('should return configured origins regardless of environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://prod.example.com';

      const result = getAllowedOrigins();

      expect(result).toEqual(['https://prod.example.com']);
    });
  });
});
