import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

interface OcrResult {
  text: string;
  confidence: number;
  imagePath: string;
}

interface BatchOcrResult {
  results: OcrResult[];
  combinedText: string;
  averageConfidence: number;
}

/**
 * Extract text from a single image using Tesseract OCR
 */
export async function extractTextFromImage(
  imagePath: string,
  language: string = 'swe' // Swedish by default
): Promise<OcrResult> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  console.log(`Processing: ${path.basename(imagePath)}`);

  const result = await Tesseract.recognize(imagePath, language, {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        // Only log every 25%
        const pct = Math.round(m.progress * 100);
        if (pct % 25 === 0) {
          process.stdout.write(`\r  Progress: ${pct}%`);
        }
      }
    },
  });

  console.log(''); // New line after progress

  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
    imagePath,
  };
}

/**
 * Extract text from multiple images (e.g., video frames)
 */
export async function extractTextFromImages(
  imagePaths: string[],
  language: string = 'swe'
): Promise<BatchOcrResult> {
  const results: OcrResult[] = [];

  console.log(`Processing ${imagePaths.length} images...`);
  console.log('');

  for (let i = 0; i < imagePaths.length; i++) {
    console.log(`[${i + 1}/${imagePaths.length}] ${path.basename(imagePaths[i])}`);

    try {
      const result = await extractTextFromImage(imagePaths[i], language);
      results.push(result);

      if (result.text.length > 0) {
        console.log(`  Confidence: ${result.confidence.toFixed(1)}%`);
        console.log(`  Text length: ${result.text.length} chars`);
      } else {
        console.log(`  No text detected`);
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
      results.push({
        text: '',
        confidence: 0,
        imagePath: imagePaths[i],
      });
    }

    console.log('');
  }

  // Combine results
  const textsWithContent = results.filter(r => r.text.length > 0);
  const combinedText = textsWithContent.map(r => r.text).join('\n\n---PAGE---\n\n');
  const averageConfidence = textsWithContent.length > 0
    ? textsWithContent.reduce((sum, r) => sum + r.confidence, 0) / textsWithContent.length
    : 0;

  return {
    results,
    combinedText,
    averageConfidence,
  };
}

/**
 * Process a directory of frames from video extraction
 */
export async function processFrameDirectory(
  frameDir: string,
  language: string = 'swe'
): Promise<BatchOcrResult> {
  if (!fs.existsSync(frameDir)) {
    throw new Error(`Directory not found: ${frameDir}`);
  }

  const frames = fs.readdirSync(frameDir)
    .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
    .sort()
    .map(f => path.join(frameDir, f));

  if (frames.length === 0) {
    throw new Error(`No image files found in: ${frameDir}`);
  }

  return extractTextFromImages(frames, language);
}
