/**
 * Zip-to-text pipeline for book page images
 *
 * This script:
 * 1. Extracts images from a zip file
 * 2. Converts HEIC files to JPEG
 * 3. Runs OCR on all images (sorted by filename)
 * 4. Detects chapters in the text
 * 5. Saves output to best-frames directory
 *
 * Usage: npx tsx src/process-zip-ocr.ts /path/to/book-pages.zip
 */

import { extractAndPrepareImages, getZipInfo } from './services/zip-processor.js';
import { extractTextFromImages } from './services/ocr.js';
import { detectChapters, formatChapterSummary } from './services/chapter-detection.js';
import path from 'path';
import fs from 'fs';

async function main() {
  const zipPath = process.argv[2];

  if (!zipPath) {
    console.error('Usage: npx tsx src/process-zip-ocr.ts /path/to/book-pages.zip');
    console.error('');
    console.error('This script extracts text from a zip file containing book page images.');
    console.error('Supports: HEIC, PNG, JPG, JPEG');
    process.exit(1);
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`Zip file not found: ${zipPath}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('  ZIP TO TEXT - Book Page OCR Pipeline');
  console.log('═'.repeat(60));
  console.log(`Input: ${zipPath}`);

  try {
    // Get zip info
    const info = getZipInfo(zipPath);
    console.log(`Zip contains: ${info.imageFiles} images (${info.heicFiles} HEIC)`);
    console.log('');

    // Create output directory
    const outputDir = path.join(process.cwd(), 'best-frames');

    // Step 1: Extract and prepare images
    console.log('─'.repeat(60));
    console.log('STEP 1: Extracting and preparing images');
    console.log('─'.repeat(60));

    const extractDir = path.join(outputDir, 'extracted');
    const { imagePaths, totalFiles, heicConverted } = await extractAndPrepareImages(zipPath, extractDir);

    console.log(`Extracted: ${totalFiles} images`);
    if (heicConverted > 0) {
      console.log(`Converted: ${heicConverted} HEIC → JPEG`);
    }
    console.log('');

    // Step 2: Run OCR on all images
    console.log('─'.repeat(60));
    console.log('STEP 2: Running OCR on images');
    console.log('─'.repeat(60));

    const ocrResult = await extractTextFromImages(imagePaths, 'swe');

    // Save raw OCR output
    const ocrOutputPath = path.join(outputDir, 'ocr_output.txt');
    fs.writeFileSync(ocrOutputPath, ocrResult.combinedText);

    console.log(`OCR complete: ${ocrResult.combinedText.length} characters`);
    console.log(`Average confidence: ${ocrResult.averageConfidence.toFixed(1)}%`);
    console.log('');

    // Step 3: Detect chapters
    console.log('─'.repeat(60));
    console.log('STEP 3: Detecting chapters');
    console.log('─'.repeat(60));

    const chapterResult = detectChapters(ocrResult.combinedText);
    console.log(formatChapterSummary(chapterResult));

    // Save chapter files
    const chaptersDir = path.join(outputDir, 'chapters');
    if (!fs.existsSync(chaptersDir)) {
      fs.mkdirSync(chaptersDir, { recursive: true });
    }

    for (const chapter of chapterResult.chapters) {
      const chapterFileName = `chapter_${String(chapter.chapterNumber).padStart(2, '0')}.txt`;
      const chapterPath = path.join(chaptersDir, chapterFileName);
      const chapterContent = `# ${chapter.chapterNumber}. ${chapter.title}\n\n${chapter.text}`;
      fs.writeFileSync(chapterPath, chapterContent);
    }

    // Save chapter metadata as JSON
    const metadataPath = path.join(chaptersDir, 'chapters.json');
    fs.writeFileSync(metadataPath, JSON.stringify({
      source: path.basename(zipPath),
      totalImages: totalFiles,
      totalChapters: chapterResult.chapters.length,
      hasChapters: chapterResult.hasChapters,
      pageRange: chapterResult.pageRange,
      pageGaps: chapterResult.pageGaps,
      uncertainChapters: chapterResult.uncertainChapters,
      chapters: chapterResult.chapters.map(c => ({
        chapterNumber: c.chapterNumber,
        title: c.title,
        textLength: c.text.length,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        file: `chapter_${String(c.chapterNumber).padStart(2, '0')}.txt`
      }))
    }, null, 2));

    // Final summary
    console.log('');
    console.log('═'.repeat(60));
    console.log('  RESULTS');
    console.log('═'.repeat(60));
    console.log(`Images processed: ${totalFiles}`);
    console.log(`HEIC converted: ${heicConverted}`);
    console.log(`OCR confidence: ${ocrResult.averageConfidence.toFixed(1)}%`);
    console.log(`Text extracted: ${ocrResult.combinedText.length} characters`);
    console.log(`Chapters detected: ${chapterResult.chapters.length}`);
    console.log('');
    console.log(`Output saved to: ${outputDir}`);
    console.log(`  - ocr_output.txt`);
    console.log(`  - chapters/`);

    // Preview first chapter
    if (chapterResult.chapters.length > 0) {
      const firstChapter = chapterResult.chapters[0];
      console.log('');
      console.log(`Preview of Chapter ${firstChapter.chapterNumber}: ${firstChapter.title}`);
      console.log('─'.repeat(60));
      console.log(firstChapter.text.substring(0, 400));
      if (firstChapter.text.length > 400) {
        console.log('...');
      }
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
