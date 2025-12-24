/**
 * BullMQ queue and worker for OCR background processing
 * Separated from index.ts to allow testing without server startup
 */

import { Queue, Worker, Job } from 'bullmq';
import { extractTextFromImage, extractTextFromImages } from './ocr.js';

// OCR job data interfaces
export interface OcrJobData {
  type: 'single' | 'batch';
  imagePath?: string;
  imagePaths?: string[];
  language?: string;
  packageId?: number;
}

export interface OcrJobResult {
  text: string;
  confidence: number;
  imagePath?: string;
  results?: Array<{
    text: string;
    confidence: number;
    imagePath: string;
  }>;
  combinedText?: string;
  averageConfidence?: number;
}

// Redis configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// BullMQ connection options (shared by queue and worker)
const connectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null as null, // Required for BullMQ compatibility
};

// BullMQ Queue for OCR processing
export const ocrQueue = new Queue<OcrJobData>('ocr-processing', {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
  },
});

// BullMQ Worker for OCR processing
export const ocrWorker = new Worker<OcrJobData, OcrJobResult>(
  'ocr-processing',
  async (job: Job<OcrJobData, OcrJobResult>) => {
    const { type, imagePath, imagePaths, language = 'swe' } = job.data;

    if (type === 'single' && imagePath) {
      const result = await extractTextFromImage(imagePath, language);
      return {
        text: result.text,
        confidence: result.confidence,
        imagePath: result.imagePath,
      };
    } else if (type === 'batch' && imagePaths && imagePaths.length > 0) {
      const result = await extractTextFromImages(imagePaths, language);
      return {
        text: result.combinedText,
        confidence: result.averageConfidence,
        results: result.results,
        combinedText: result.combinedText,
        averageConfidence: result.averageConfidence,
      };
    } else {
      throw new Error('Invalid OCR job data: must specify type and corresponding image path(s)');
    }
  },
  {
    connection: connectionOptions,
    concurrency: 2, // Process 2 jobs concurrently
  }
);

// Worker event handlers
ocrWorker.on('ready', () => {
  console.log('BullMQ worker started');
});

ocrWorker.on('completed', (job: Job<OcrJobData, OcrJobResult>) => {
  console.log(`OCR job ${job.id} completed`);
});

ocrWorker.on('failed', (job: Job<OcrJobData, OcrJobResult> | undefined, err: Error) => {
  console.error(`OCR job ${job?.id} failed:`, err.message);
});

ocrWorker.on('error', (err: Error) => {
  console.error('BullMQ worker error:', err.message);
});

/**
 * Gracefully close the OCR queue and worker
 * Call this during application shutdown
 */
export async function closeOcrQueue(): Promise<void> {
  await ocrWorker.close();
  await ocrQueue.close();
}
