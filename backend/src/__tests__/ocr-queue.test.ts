/**
 * BullMQ OCR Queue tests
 * Tests the queue and worker configuration for background OCR processing
 */

import { describe, it, expect } from 'vitest';
import { ocrQueue, ocrWorker, OcrJobData, OcrJobResult } from '../services/ocr-queue.js';

describe('OCR Queue Configuration', () => {
  it('should have ocrQueue exported and configured', () => {
    expect(ocrQueue).toBeDefined();
    expect(ocrQueue.name).toBe('ocr-processing');
  });

  it('should have ocrWorker exported and configured', () => {
    expect(ocrWorker).toBeDefined();
    expect(ocrWorker.name).toBe('ocr-processing');
  });

  it('should have correct concurrency setting on worker', () => {
    // Worker concurrency is set to 2 for parallel processing
    expect(ocrWorker.opts.concurrency).toBe(2);
  });

  it('should have correct default job options on queue', () => {
    const defaultOpts = ocrQueue.defaultJobOptions;
    expect(defaultOpts).toBeDefined();
    expect(defaultOpts?.attempts).toBe(3);
    expect(defaultOpts?.backoff).toEqual({
      type: 'exponential',
      delay: 1000,
    });
    expect(defaultOpts?.removeOnComplete).toBe(100);
    expect(defaultOpts?.removeOnFail).toBe(50);
  });
});

describe('OCR Job Data Types', () => {
  it('should accept single image job data', () => {
    const singleJob: OcrJobData = {
      type: 'single',
      imagePath: '/path/to/image.jpg',
      language: 'swe',
    };
    expect(singleJob.type).toBe('single');
    expect(singleJob.imagePath).toBeDefined();
  });

  it('should accept batch image job data', () => {
    const batchJob: OcrJobData = {
      type: 'batch',
      imagePaths: ['/path/to/image1.jpg', '/path/to/image2.jpg'],
      language: 'eng',
      packageId: 123,
    };
    expect(batchJob.type).toBe('batch');
    expect(batchJob.imagePaths?.length).toBe(2);
  });

  it('should define OcrJobResult structure', () => {
    const result: OcrJobResult = {
      text: 'Extracted text',
      confidence: 95.5,
      imagePath: '/path/to/image.jpg',
    };
    expect(result.text).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should define batch OcrJobResult structure', () => {
    const batchResult: OcrJobResult = {
      text: 'Combined text',
      confidence: 90.0,
      results: [
        { text: 'Page 1', confidence: 92.0, imagePath: '/img1.jpg' },
        { text: 'Page 2', confidence: 88.0, imagePath: '/img2.jpg' },
      ],
      combinedText: 'Page 1\n---PAGE---\nPage 2',
      averageConfidence: 90.0,
    };
    expect(batchResult.results?.length).toBe(2);
    expect(batchResult.combinedText).toBeDefined();
  });
});
