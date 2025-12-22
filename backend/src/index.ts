import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './data/database.js';
import { buildCorsOptions } from './config/cors.js';
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import assignmentsRoutes from './routes/assignments.js';
import collectiblesRoutes from './routes/collectibles.js';
import packagesRoutes from './routes/packages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6001;

// Middleware
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Home Schooling API running on http://localhost:${PORT}`);
});
