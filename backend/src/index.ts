import express from 'express';
import cors from 'cors';
import { getDb } from './data/database.js';
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import assignmentsRoutes from './routes/assignments.js';
import collectiblesRoutes from './routes/collectibles.js';

const app = express();
const PORT = process.env.PORT || 6001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/collectibles', collectiblesRoutes);

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
  console.log(`Teacher API running on http://localhost:${PORT}`);
});
