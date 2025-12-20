/**
 * Chapter detection tests
 */

import { describe, it, expect } from 'vitest';
import { detectChapters, formatChapterSummary } from '../services/chapter-detection.js';

describe('Chapter Detection', () => {
  describe('detectChapters', () => {
    it('should detect Swedish chapter format "1. TITLE"', () => {
      const text = `
        Some intro text here.

        1. DE FREDLÖSA I SHERWOOD-SKOGEN

        I Sherwood-skogen i England levde för många hundra år sedan
        en man som kallades Robin Hood.

        2. ROBIN MÖTER LILLE JOHN

        En dag gick Robin genom skogen och mötte en stor man.
      `;

      const result = detectChapters(text);

      expect(result.hasChapters).toBe(true);
      expect(result.chapters.length).toBe(2);
      expect(result.chapters[0].chapterNumber).toBe(1);
      expect(result.chapters[0].title).toContain('FREDLÖSA');
      expect(result.chapters[1].chapterNumber).toBe(2);
      expect(result.chapters[1].title).toContain('ROBIN');
    });

    it('should detect "Kapitel X" format', () => {
      const text = `
        Kapitel 1: Pippi flyttar in

        Det var en gång en flicka som hette Pippi.

        Kapitel 2: Äventyret börjar

        Pippi gick ut i trädgården.
      `;

      const result = detectChapters(text);

      expect(result.hasChapters).toBe(true);
      expect(result.chapters.length).toBe(2);
      expect(result.chapters[0].chapterNumber).toBe(1);
      expect(result.chapters[1].chapterNumber).toBe(2);
    });

    it('should detect "Chapter X" format (English)', () => {
      const text = `
        Chapter 1: The Beginning

        Once upon a time there was a hobbit.

        Chapter 2: The Journey

        The hobbit left his home.
      `;

      const result = detectChapters(text);

      expect(result.hasChapters).toBe(true);
      expect(result.chapters.length).toBe(2);
    });

    it('should return single untitled chapter when no chapters detected', () => {
      const text = `
        This is just some text without any chapter markers.
        It continues here with more content.
        And even more content here.
      `;

      const result = detectChapters(text);

      expect(result.hasChapters).toBe(false);
      expect(result.chapters.length).toBe(1);
      expect(result.chapters[0].chapterNumber).toBe(1);
      expect(result.chapters[0].title).toBe('Untitled');
    });

    it('should filter out false positives from noisy OCR', () => {
      const text = `
        7. XYZ ABC
        Some random noise here
        3. MOS TS S
        More noise
      `;

      const result = detectChapters(text);

      // Should not detect these as real chapters (titles are too short/noisy)
      expect(result.hasChapters).toBe(false);
    });

    it('should handle page markers', () => {
      const text = `
        1. FÖRSTA KAPITLET

        Text on first page.

        ---PAGE---

        More text on second page.

        2. ANDRA KAPITLET

        New chapter text.
      `;

      const result = detectChapters(text);

      expect(result.hasChapters).toBe(true);
      expect(result.chapters.length).toBe(2);
      // Page markers should be removed from chapter text
      expect(result.chapters[0].text).not.toContain('---PAGE---');
    });

    it('should extract chapter text correctly', () => {
      const text = `
        1. MIN FÖRSTA KAPITEL

        Detta är första kapitlets text.
        Det fortsätter här.

        2. MIN ANDRA KAPITEL

        Detta är andra kapitlets text.
      `;

      const result = detectChapters(text);

      expect(result.chapters[0].text).toContain('första kapitlets text');
      expect(result.chapters[0].text).not.toContain('andra kapitlets text');
      expect(result.chapters[1].text).toContain('andra kapitlets text');
    });
  });

  describe('formatChapterSummary', () => {
    it('should format chapter summary correctly', () => {
      const result = detectChapters(`
        1. TEST KAPITEL

        Some text here.
      `);

      const summary = formatChapterSummary(result);

      expect(summary).toContain('Detected 1 chapter');
      expect(summary).toContain('TEST KAPITEL');
    });

    it('should indicate when no chapters detected', () => {
      const result = detectChapters('Just some text without chapters.');

      const summary = formatChapterSummary(result);

      expect(summary).toContain('No chapters detected');
    });
  });
});
