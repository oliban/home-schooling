/**
 * CORS Integration Tests
 *
 * Tests the CORS middleware behavior at the HTTP level by making actual
 * requests to verify CORS headers are set correctly for allowed and
 * disallowed origins.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import cors from 'cors';
import type { Server } from 'http';
import { buildCorsOptions } from '../config/cors.js';

const TEST_PORT = 9876;
const TEST_URL = `http://localhost:${TEST_PORT}/api/test`;

/**
 * Helper function to make HTTP requests with custom Origin header
 */
async function makeRequest(
  origin: string | undefined,
  method: 'GET' | 'OPTIONS' = 'GET'
): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (origin) {
    headers['Origin'] = origin;
  }

  // For preflight requests, add required headers
  if (method === 'OPTIONS') {
    headers['Access-Control-Request-Method'] = 'POST';
    headers['Access-Control-Request-Headers'] = 'content-type';
  }

  const response = await fetch(TEST_URL, {
    method,
    headers,
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key.toLowerCase()] = value;
  });

  const body = await response.text();

  return {
    status: response.status,
    headers: responseHeaders,
    body,
  };
}

/**
 * Creates a test Express app with CORS configured
 */
function createTestApp(corsOptions: cors.CorsOptions): Express {
  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());

  // Test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ message: 'Test endpoint', success: true });
  });

  app.post('/api/test', (req, res) => {
    res.json({ message: 'POST received', success: true });
  });

  return app;
}

/**
 * Helper to start server and return the server instance
 */
async function startServer(app: Express, port: number): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}

/**
 * Helper to close server
 */
async function closeServer(server: Server | null): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

describe('CORS Integration Tests', () => {
  let server: Server | null = null;
  let app: Express;

  afterEach(async () => {
    await closeServer(server);
    server = null;
  });

  describe('Allowed origins can make requests successfully', () => {
    const allowedOrigins = ['https://allowed-origin.com', 'https://another-allowed.com'];

    beforeEach(async () => {
      app = createTestApp({
        origin: allowedOrigins,
        credentials: true,
      });
      server = await startServer(app, TEST_PORT);
    });

    it('should include CORS headers for allowed origin', async () => {
      const response = await makeRequest('https://allowed-origin.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://allowed-origin.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include CORS headers for second allowed origin', async () => {
      const response = await makeRequest('https://another-allowed.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://another-allowed.com');
    });

    it('should return valid JSON response for allowed origin', async () => {
      const response = await makeRequest('https://allowed-origin.com');

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Test endpoint');
      expect(body.success).toBe(true);
    });
  });

  describe('Requests from non-allowed origins are blocked with CORS error', () => {
    const allowedOrigins = ['https://allowed-only.com'];

    beforeEach(async () => {
      app = createTestApp({
        origin: allowedOrigins,
        credentials: true,
      });
      server = await startServer(app, TEST_PORT);
    });

    it('should not include Access-Control-Allow-Origin for disallowed origin', async () => {
      const response = await makeRequest('https://malicious-site.com');

      // The cors middleware will not add CORS headers for disallowed origins
      // The request still succeeds server-side, but browsers will block the response
      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should not include Access-Control-Allow-Origin for completely different origin', async () => {
      const response = await makeRequest('https://evil.attacker.com');

      // Origin header is not set, so CORS is not triggered
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should not accept similar but not exact origin matches', async () => {
      // Try to access with a subdomain of allowed origin
      const response = await makeRequest('https://sub.allowed-only.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should not accept origin with different protocol', async () => {
      // HTTP vs HTTPS
      const response = await makeRequest('http://allowed-only.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Preflight OPTIONS requests handled correctly', () => {
    const allowedOrigins = ['https://preflight-test.com'];

    beforeEach(async () => {
      app = createTestApp({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      });
      server = await startServer(app, TEST_PORT);
    });

    it('should respond to OPTIONS preflight request with correct headers', async () => {
      const response = await makeRequest('https://preflight-test.com', 'OPTIONS');

      expect(response.status).toBe(204); // No Content
      expect(response.headers['access-control-allow-origin']).toBe('https://preflight-test.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include allowed methods in preflight response', async () => {
      const response = await makeRequest('https://preflight-test.com', 'OPTIONS');

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toBeDefined();
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
    });

    it('should include allowed headers in preflight response', async () => {
      const response = await makeRequest('https://preflight-test.com', 'OPTIONS');

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders?.toLowerCase()).toContain('content-type');
    });

    it('should not respond to OPTIONS for disallowed origin', async () => {
      const response = await makeRequest('https://disallowed.com', 'OPTIONS');

      // OPTIONS still succeeds but without CORS headers
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Credentials mode works when configured', () => {
    beforeEach(async () => {
      app = createTestApp({
        origin: ['https://credentials-test.com'],
        credentials: true,
      });
      server = await startServer(app, TEST_PORT);
    });

    it('should include Access-Control-Allow-Credentials header', async () => {
      const response = await makeRequest('https://credentials-test.com');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include credentials header in preflight response', async () => {
      const response = await makeRequest('https://credentials-test.com', 'OPTIONS');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Credentials disabled when not configured', () => {
    beforeEach(async () => {
      app = createTestApp({
        origin: ['https://no-credentials.com'],
        credentials: false,
      });
      server = await startServer(app, TEST_PORT);
    });

    it('should not include Access-Control-Allow-Credentials header when disabled', async () => {
      const response = await makeRequest('https://no-credentials.com');

      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });

  describe('Origin blocking (origin: false)', () => {
    beforeEach(async () => {
      app = createTestApp({
        origin: false,
        credentials: true,
      });
      server = await startServer(app, TEST_PORT);
    });

    it('should not include any CORS headers when origin is false', async () => {
      const response = await makeRequest('https://any-origin.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
      expect(response.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });

  describe('Integration with buildCorsOptions function', () => {
    const originalEnv = { ...process.env };

    beforeEach(async () => {
      // Ensure clean state before starting new server
      await closeServer(server);
      server = null;
    });

    afterEach(async () => {
      // Restore original environment
      process.env = { ...originalEnv };
    });

    it('should work with buildCorsOptions for allowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://configured-origin.com';
      process.env.NODE_ENV = 'production';

      const corsOptions = buildCorsOptions();
      app = createTestApp(corsOptions);
      server = await startServer(app, TEST_PORT);

      const response = await makeRequest('https://configured-origin.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://configured-origin.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should work with buildCorsOptions for disallowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://only-this-origin.com';
      process.env.NODE_ENV = 'production';

      const corsOptions = buildCorsOptions();
      app = createTestApp(corsOptions);
      server = await startServer(app, TEST_PORT);

      const response = await makeRequest('https://evil.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow localhost origins in development mode', async () => {
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'development';

      const corsOptions = buildCorsOptions();
      app = createTestApp(corsOptions);
      server = await startServer(app, TEST_PORT);

      const response = await makeRequest('http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should block all origins in production without ALLOWED_ORIGINS', async () => {
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const corsOptions = buildCorsOptions();
      app = createTestApp(corsOptions);
      server = await startServer(app, TEST_PORT);

      const response = await makeRequest('https://any-origin.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should support multiple configured origins', async () => {
      process.env.ALLOWED_ORIGINS = 'https://first.com,https://second.com,https://third.com';
      process.env.NODE_ENV = 'production';

      const corsOptions = buildCorsOptions();
      app = createTestApp(corsOptions);
      server = await startServer(app, TEST_PORT);

      // Test first origin
      let response = await makeRequest('https://first.com');
      expect(response.headers['access-control-allow-origin']).toBe('https://first.com');

      // Test second origin
      response = await makeRequest('https://second.com');
      expect(response.headers['access-control-allow-origin']).toBe('https://second.com');

      // Test third origin
      response = await makeRequest('https://third.com');
      expect(response.headers['access-control-allow-origin']).toBe('https://third.com');

      // Test disallowed origin
      response = await makeRequest('https://fourth.com');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

});

