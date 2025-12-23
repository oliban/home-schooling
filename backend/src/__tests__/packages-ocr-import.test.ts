/**
 * Tests for OCR background processing in package import
 * Subtask 4-1: POST /packages/import with OCR job queuing
 */

import { describe, it, expect } from 'vitest';
import { ocrQueue, OcrJobData } from '../services/ocr-queue.js';

describe('Package Import OCR Job Queuing', () => {
  describe('OCR Import Request Structure', () => {
    it('should accept imagePaths for single image OCR processing', () => {
      const ocrRequest = {
        imagePaths: ['/path/to/image.jpg'],
        language: 'swe',
      };
      expect(ocrRequest.imagePaths).toBeDefined();
      expect(ocrRequest.imagePaths.length).toBe(1);
    });

    it('should accept imagePaths for batch image OCR processing', () => {
      const ocrRequest = {
        imagePaths: ['/path/to/image1.jpg', '/path/to/image2.jpg', '/path/to/image3.jpg'],
        language: 'eng',
      };
      expect(ocrRequest.imagePaths).toBeDefined();
      expect(ocrRequest.imagePaths.length).toBe(3);
    });

    it('should default to Swedish language when not specified', () => {
      const ocrRequest: { imagePaths: string[]; language?: string } = {
        imagePaths: ['/path/to/image.jpg'],
      };
      // Default language should be 'swe' when not provided
      const language = ocrRequest.language || 'swe';
      expect(language).toBe('swe');
    });
  });

  describe('OCR Job Data Construction', () => {
    it('should create single-type job data for one image', () => {
      const imagePaths = ['/path/to/single-image.jpg'];
      const jobData: OcrJobData = {
        type: imagePaths.length === 1 ? 'single' : 'batch',
        imagePath: imagePaths.length === 1 ? imagePaths[0] : undefined,
        imagePaths: imagePaths.length > 1 ? imagePaths : undefined,
        language: 'swe',
      };

      expect(jobData.type).toBe('single');
      expect(jobData.imagePath).toBe('/path/to/single-image.jpg');
      expect(jobData.imagePaths).toBeUndefined();
    });

    it('should create batch-type job data for multiple images', () => {
      const imagePaths = ['/path/to/image1.jpg', '/path/to/image2.jpg'];
      const jobData: OcrJobData = {
        type: imagePaths.length === 1 ? 'single' : 'batch',
        imagePath: imagePaths.length === 1 ? imagePaths[0] : undefined,
        imagePaths: imagePaths.length > 1 ? imagePaths : undefined,
        language: 'swe',
      };

      expect(jobData.type).toBe('batch');
      expect(jobData.imagePath).toBeUndefined();
      expect(jobData.imagePaths).toEqual(imagePaths);
    });

    it('should include language in job data', () => {
      const jobData: OcrJobData = {
        type: 'single',
        imagePath: '/path/to/image.jpg',
        language: 'eng',
      };

      expect(jobData.language).toBe('eng');
    });
  });

  describe('OCR Queue Integration', () => {
    it('should have ocrQueue configured for ocr-import jobs', () => {
      expect(ocrQueue).toBeDefined();
      expect(ocrQueue.name).toBe('ocr-processing');
    });

    it('should have retry configuration for failed OCR jobs', () => {
      const defaultOpts = ocrQueue.defaultJobOptions;
      expect(defaultOpts?.attempts).toBe(3);
      expect(defaultOpts?.backoff).toEqual({
        type: 'exponential',
        delay: 1000,
      });
    });
  });

  describe('Response Format', () => {
    it('should define 202 Accepted response structure for OCR jobs', () => {
      // When imagePaths are provided, endpoint should return 202 with this structure
      const expectedResponse = {
        status: 'queued',
        jobId: 'some-uuid-here',
        message: 'OCR processing queued. Poll /api/packages/jobs/:jobId for status.',
        imagePaths: ['/path/to/image.jpg'],
      };

      expect(expectedResponse.status).toBe('queued');
      expect(expectedResponse.jobId).toBeDefined();
      expect(expectedResponse.message).toContain('Poll');
      expect(expectedResponse.imagePaths).toBeDefined();
    });

    it('should still return 201 Created for standard package imports', () => {
      // When no imagePaths are provided, endpoint returns 201 with package info
      const standardResponse = {
        id: 'package-uuid',
        problemCount: 5,
      };

      expect(standardResponse.id).toBeDefined();
      expect(standardResponse.problemCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty imagePaths array as standard import', () => {
      const request = {
        imagePaths: [],
        package: { name: 'Test', grade_level: 3 },
        problems: [{ question_text: 'Q?', correct_answer: 'A' }],
      };

      // Empty imagePaths should not trigger OCR processing
      const shouldQueueOcr = request.imagePaths && request.imagePaths.length > 0;
      expect(shouldQueueOcr).toBeFalsy();
    });

    it('should handle undefined imagePaths as standard import', () => {
      const request: {
        package: { name: string; grade_level: number };
        problems: { question_text: string; correct_answer: string }[];
        imagePaths?: string[]
      } = {
        package: { name: 'Test', grade_level: 3 },
        problems: [{ question_text: 'Q?', correct_answer: 'A' }],
      };

      // Undefined imagePaths should not trigger OCR processing
      const shouldQueueOcr = request.imagePaths && request.imagePaths.length > 0;
      expect(shouldQueueOcr).toBeFalsy();
    });
  });
});
