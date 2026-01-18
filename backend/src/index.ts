import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from 'ioredis';
import Tesseract from 'tesseract.js';
import promClient from 'prom-client';
import { getDb } from './data/database.js';
import { buildCorsOptions } from './config/cors.js';
import { ocrQueue, ocrWorker, closeOcrQueue } from './services/ocr-queue.js';
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import assignmentsRoutes from './routes/assignments.js';
import collectiblesRoutes from './routes/collectibles.js';
import packagesRoutes from './routes/packages.js';
import curriculumRoutes from './routes/curriculum.js';
import adminRoutes from './routes/admin.js';
import adventuresRoutes from './routes/adventures.js';
import compareRoutes from './routes/compare.js';
import { isDevelopment } from './config/cors.js';

// Re-export OCR queue types and functions for external use
export { ocrQueue, ocrWorker, closeOcrQueue };
export type { OcrJobData, OcrJobResult } from './services/ocr-queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6001;

// Redis configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Initialize Redis client with error handling
// ioredis auto-connects on instantiation
export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ compatibility
  retryStrategy: (times: number) => {
    // Exponential backoff with max 2 second delay
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: false, // Connect immediately
});

// Redis event handlers
redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('ready', () => {
  console.log('Redis ready');
});

redis.on('error', (err: Error) => {
  console.error('Redis error:', err.message);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

// Prometheus metrics configuration
const register = new promClient.Registry();

// Collect default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom histogram for HTTP request duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

// Cache metrics for monitoring hit/miss rates
const cacheHits = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
});
register.registerMetric(cacheHits);

const cacheMisses = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
});
register.registerMetric(cacheMisses);

// Export metrics for use in other modules
export { register, httpRequestDuration, cacheHits, cacheMisses };

// Tesseract.js scheduler for parallel OCR processing
// Create scheduler with 4 workers for optimal performance
export const tesseractScheduler = Tesseract.createScheduler();

// Initialize Tesseract workers
async function initTesseractScheduler(): Promise<void> {
  const workerCount = 4;
  for (let i = 0; i < workerCount; i++) {
    const worker = await Tesseract.createWorker('swe'); // Swedish by default
    tesseractScheduler.addWorker(worker);
  }
  console.log(`Tesseract scheduler ready with ${workerCount} workers`);
}

// Initialize scheduler at startup
initTesseractScheduler().catch((err) => {
  console.error('Failed to initialize Tesseract scheduler:', err.message);
});

// Graceful shutdown for Redis, BullMQ, and Tesseract
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await tesseractScheduler.terminate();
  await closeOcrQueue();
  await redis.quit();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing connections...');
  await tesseractScheduler.terminate();
  await closeOcrQueue();
  await redis.quit();
});

// Middleware
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

// Prometheus request duration tracking middleware
app.use((req, res, next) => {
  // Skip metrics endpoint to avoid recursive tracking
  if (req.path === '/metrics') {
    return next();
  }

  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    // Use route path if available, otherwise use the request path
    // Normalize dynamic segments to avoid high cardinality
    const route = req.route?.path || req.path.replace(/\/[0-9a-f-]{36}/gi, '/:id').replace(/\/\d+/g, '/:id');
    end({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString(),
    });
  });
  next();
});

// Serve scratch pad images
// Use DATA_DIR env var if set, otherwise derive from DATABASE_PATH, otherwise use relative path
const dataDir = process.env.DATA_DIR ||
  (process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : path.join(__dirname, '../../data'));
const scratchImagesDir = path.join(dataDir, 'scratch-images');
app.use('/api/scratch-images', express.static(scratchImagesDir));

// Initialize database
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/collectibles', collectiblesRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/adventures', adventuresRoutes);
app.use('/api/compare', compareRoutes);

// Log admin routes availability
if (isDevelopment()) {
  console.log('✓ Admin routes enabled (all endpoints available in development mode)');
} else {
  console.log('✓ Admin routes enabled (backup/sync restricted to development)');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err instanceof Error ? err.message : 'Error collecting metrics');
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`Brainrot-skolan API running on http://localhost:${PORT}`);
  });
}