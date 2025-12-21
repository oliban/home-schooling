import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';

interface FrameScore {
  framePath: string;
  sharpness: number;
  brightness: number;
  contrast: number;
  overallScore: number;
  timestamp: number; // seconds into video
  // OCR-based scores (populated after text analysis)
  textLength?: number;
  ocrConfidence?: number;
  pageNumber?: number;
  textCoverageScore?: number;
}

interface BestFramesResult {
  allScores: FrameScore[];
  bestFrames: FrameScore[];
  selectedPaths: string[];
}

/**
 * Calculate sharpness using Laplacian variance
 * Higher variance = sharper image
 */
async function calculateSharpness(imagePath: string): Promise<number> {
  const image = sharp(imagePath);

  // Convert to grayscale and apply Laplacian-like edge detection
  const { data, info } = await image
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  // Calculate Laplacian variance (simplified)
  // Uses a 3x3 kernel approximation
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Laplacian approximation: center pixel minus neighbors
      const laplacian =
        4 * data[idx] -
        data[idx - 1] -
        data[idx + 1] -
        data[idx - width] -
        data[idx + width];

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);

  return variance;
}

/**
 * Calculate brightness (mean pixel value)
 */
async function calculateBrightness(imagePath: string): Promise<number> {
  const { data } = await sharp(imagePath)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }

  return sum / data.length;
}

/**
 * Calculate contrast (standard deviation of pixel values)
 */
async function calculateContrast(imagePath: string): Promise<number> {
  const { data } = await sharp(imagePath)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    sumSq += data[i] * data[i];
  }

  const mean = sum / data.length;
  const variance = (sumSq / data.length) - (mean * mean);

  return Math.sqrt(variance);
}

/**
 * Extract page number from OCR text
 * Page numbers are in the BOTTOM RIGHT corner of pages
 * So we look at the last lines and the end/right side of those lines
 */
function extractPageNumber(text: string): number | undefined {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Focus on the BOTTOM of the page (last 15 lines to account for OCR noise)
  const bottomLines = lines.slice(-15);

  // Pattern 1: Number at the END of a line (bottom right)
  // This is the primary pattern for bottom-right page numbers
  for (const line of bottomLines) {
    // Number at end of line, possibly with trailing noise chars
    const endMatch = line.match(/(\d{1,3})\s*[|\]\)}\s]*$/);
    if (endMatch) {
      const num = parseInt(endMatch[1]);
      if (num >= 1 && num <= 200) {
        return num;
      }
    }
  }

  // Pattern 2: Standalone number on its own line at the bottom
  // "42", "|42|", "  42  "
  for (const line of bottomLines) {
    const standaloneMatch = line.match(/^[|[\s\-—.]*(\d{1,3})[|\]\s\-—.]*$/);
    if (standaloneMatch) {
      const num = parseInt(standaloneMatch[1]);
      if (num >= 1 && num <= 200) {
        return num;
      }
    }
  }

  // Pattern 3: Short line (< 15 chars) containing just a number at the bottom
  for (const line of bottomLines) {
    if (line.length <= 15) {
      const shortMatch = line.match(/(\d{1,3})/);
      if (shortMatch) {
        const num = parseInt(shortMatch[1]);
        if (num >= 1 && num <= 200) {
          return num;
        }
      }
    }
  }

  // Pattern 4: Number at start of bottom line (sometimes OCR reverses order)
  for (const line of bottomLines) {
    if (line.length <= 30) {
      const startMatch = line.match(/^(\d{1,3})(?:\s|$|[|\].])/);
      if (startMatch) {
        const num = parseInt(startMatch[1]);
        if (num >= 1 && num <= 200) {
          return num;
        }
      }
    }
  }

  return undefined;
}

/**
 * Run quick OCR on a frame to get text coverage metrics
 */
async function getTextCoverage(
  framePath: string,
  language: string = 'swe'
): Promise<{ textLength: number; confidence: number; pageNumber?: number }> {
  try {
    const result = await Tesseract.recognize(framePath, language, {
      // No logger for speed
    });

    const text = result.data.text.trim();
    const pageNumber = extractPageNumber(text);

    return {
      textLength: text.length,
      confidence: result.data.confidence,
      pageNumber,
    };
  } catch (error) {
    return { textLength: 0, confidence: 0 };
  }
}

/**
 * Score a single frame for quality
 */
export async function scoreFrame(framePath: string, fps: number = 0.5): Promise<FrameScore> {
  // Extract frame number from filename (e.g., frame_0001.jpg -> 1)
  const filename = path.basename(framePath);
  const match = filename.match(/frame_(\d+)/);
  const frameNum = match ? parseInt(match[1]) : 0;
  const timestamp = frameNum / fps;

  const [sharpness, brightness, contrast] = await Promise.all([
    calculateSharpness(framePath),
    calculateBrightness(framePath),
    calculateContrast(framePath),
  ]);

  // Calculate overall score
  // Prioritize sharpness, but penalize extreme brightness (too dark or too bright)
  // Ideal brightness is around 128 (middle gray)
  const brightnessPenalty = Math.abs(brightness - 128) / 128;
  const contrastBonus = contrast / 128; // Higher contrast is better for text

  // Normalize sharpness (typical values range 0-5000+)
  const normalizedSharpness = Math.min(sharpness / 1000, 5);

  const overallScore = normalizedSharpness * (1 - brightnessPenalty * 0.3) * (1 + contrastBonus * 0.2);

  return {
    framePath,
    sharpness,
    brightness,
    contrast,
    overallScore,
    timestamp,
  };
}

/**
 * Score all frames in a directory
 */
export async function scoreAllFrames(
  frameDir: string,
  fps: number = 0.5
): Promise<FrameScore[]> {
  const files = fs.readdirSync(frameDir)
    .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
    .sort()
    .map(f => path.join(frameDir, f));

  console.log(`Scoring ${files.length} frames for quality...`);

  const scores: FrameScore[] = [];

  for (let i = 0; i < files.length; i++) {
    const score = await scoreFrame(files[i], fps);
    scores.push(score);

    const bar = '█'.repeat(Math.floor((i + 1) / files.length * 20));
    const empty = '░'.repeat(20 - bar.length);
    process.stdout.write(`\r  [${bar}${empty}] ${i + 1}/${files.length}`);
  }

  console.log(''); // New line

  return scores;
}

/**
 * Select best frames from each time window using OCR-based text coverage
 * This ensures we get frames with the most visible text (not covered by hands)
 */
export async function selectBestFrames(
  frameDir: string,
  options: {
    fps?: number;
    windowSeconds?: number; // Time window to select best frame from
    minScore?: number; // Minimum score threshold
    useOcr?: boolean; // Use OCR to validate text coverage (slower but more accurate)
    candidatesPerWindow?: number; // How many top candidates to OCR per window
  } = {}
): Promise<BestFramesResult> {
  const {
    fps = 0.5,
    windowSeconds = 3,
    minScore = 0.5,
    useOcr = true,
    candidatesPerWindow = 3
  } = options;

  const allScores = await scoreAllFrames(frameDir, fps);

  // Group frames into time windows
  const windows: FrameScore[][] = [];
  let currentWindow: FrameScore[] = [];
  let windowStart = 0;

  for (const score of allScores) {
    if (score.timestamp >= windowStart + windowSeconds) {
      if (currentWindow.length > 0) {
        windows.push(currentWindow);
      }
      currentWindow = [score];
      windowStart = Math.floor(score.timestamp / windowSeconds) * windowSeconds;
    } else {
      currentWindow.push(score);
    }
  }

  if (currentWindow.length > 0) {
    windows.push(currentWindow);
  }

  console.log(`\nFrame quality analysis:`);
  console.log(`  Total frames: ${allScores.length}`);
  console.log(`  Time windows: ${windows.length} (${windowSeconds}s each)`);

  // Select best frame from each window
  const bestFrames: FrameScore[] = [];

  if (useOcr) {
    console.log(`\nAnalyzing text coverage with OCR (top ${candidatesPerWindow} candidates per window)...`);

    for (let w = 0; w < windows.length; w++) {
      const window = windows[w];

      // Sort by visual quality and take top candidates
      const candidates = [...window]
        .filter(f => f.overallScore >= minScore)
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, candidatesPerWindow);

      if (candidates.length === 0) continue;

      // Run OCR on each candidate to find the one with most text
      let bestCandidate = candidates[0];
      let bestTextScore = 0;

      for (const candidate of candidates) {
        const coverage = await getTextCoverage(candidate.framePath);
        candidate.textLength = coverage.textLength;
        candidate.ocrConfidence = coverage.confidence;
        candidate.pageNumber = coverage.pageNumber;

        // Text coverage score: prioritize text length, boost with confidence
        const textScore = coverage.textLength * (1 + coverage.confidence / 200);
        candidate.textCoverageScore = textScore;

        if (textScore > bestTextScore) {
          bestTextScore = textScore;
          bestCandidate = candidate;
        }
      }

      bestFrames.push(bestCandidate);

      // Progress indicator
      const bar = '█'.repeat(Math.floor((w + 1) / windows.length * 20));
      const empty = '░'.repeat(20 - bar.length);
      const pageInfo = bestCandidate.pageNumber ? ` [page ${bestCandidate.pageNumber}]` : '';
      process.stdout.write(`\r  [${bar}${empty}] ${w + 1}/${windows.length} windows${pageInfo}`);
    }
    console.log(''); // New line
  } else {
    // Original behavior: just use visual quality
    for (const window of windows) {
      const best = window.reduce((a, b) => a.overallScore > b.overallScore ? a : b);
      if (best.overallScore >= minScore) {
        bestFrames.push(best);
      }
    }
  }

  console.log(`  Best frames selected: ${bestFrames.length}`);

  if (bestFrames.length > 0) {
    const avgScore = bestFrames.reduce((sum, f) => sum + f.overallScore, 0) / bestFrames.length;
    console.log(`  Average visual quality: ${avgScore.toFixed(2)}`);

    if (useOcr) {
      const framesWithText = bestFrames.filter(f => f.textLength && f.textLength > 0);
      if (framesWithText.length > 0) {
        const avgText = framesWithText.reduce((sum, f) => sum + (f.textLength || 0), 0) / framesWithText.length;
        console.log(`  Average text length: ${avgText.toFixed(0)} chars`);

        const pagesDetected = bestFrames.filter(f => f.pageNumber !== undefined).length;
        console.log(`  Pages detected in: ${pagesDetected}/${bestFrames.length} frames`);
      }
    }
  }

  // Deduplicate by page number - keep only the best frame for each page
  const deduplicatedFrames = deduplicateByPage(bestFrames);

  if (deduplicatedFrames.length < bestFrames.length) {
    console.log(`  After page deduplication: ${deduplicatedFrames.length} frames (removed ${bestFrames.length - deduplicatedFrames.length} duplicates)`);
  }

  return {
    allScores,
    bestFrames: deduplicatedFrames,
    selectedPaths: deduplicatedFrames.map(f => f.framePath),
  };
}

/**
 * Deduplicate frames by page number
 * When multiple frames have the same page number, keep only the one with highest text coverage
 */
function deduplicateByPage(frames: FrameScore[]): FrameScore[] {
  const pageMap = new Map<number, FrameScore>();
  const noPageFrames: FrameScore[] = [];

  for (const frame of frames) {
    if (frame.pageNumber === undefined) {
      // Keep frames without detected page numbers (might be title pages, etc.)
      noPageFrames.push(frame);
    } else {
      const existing = pageMap.get(frame.pageNumber);
      if (!existing) {
        pageMap.set(frame.pageNumber, frame);
      } else {
        // Keep the one with higher text coverage score
        const existingScore = existing.textCoverageScore || 0;
        const newScore = frame.textCoverageScore || 0;
        if (newScore > existingScore) {
          pageMap.set(frame.pageNumber, frame);
        }
      }
    }
  }

  // Combine: sorted page frames + no-page frames
  const pageFrames = Array.from(pageMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, frame]) => frame);

  // Interleave no-page frames based on timestamp
  const result: FrameScore[] = [];
  let noPageIdx = 0;

  for (const pageFrame of pageFrames) {
    // Add any no-page frames that come before this page frame
    while (noPageIdx < noPageFrames.length && noPageFrames[noPageIdx].timestamp < pageFrame.timestamp) {
      result.push(noPageFrames[noPageIdx]);
      noPageIdx++;
    }
    result.push(pageFrame);
  }

  // Add remaining no-page frames
  while (noPageIdx < noPageFrames.length) {
    result.push(noPageFrames[noPageIdx]);
    noPageIdx++;
  }

  return result;
}

/**
 * Copy best frames to a new directory for OCR processing
 */
export async function copyBestFrames(
  bestFrames: FrameScore[],
  outputDir: string
): Promise<string[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const copiedPaths: string[] = [];

  for (let i = 0; i < bestFrames.length; i++) {
    const frame = bestFrames[i];
    const ext = path.extname(frame.framePath);
    const newPath = path.join(outputDir, `best_${String(i + 1).padStart(4, '0')}${ext}`);

    fs.copyFileSync(frame.framePath, newPath);
    copiedPaths.push(newPath);
  }

  console.log(`Copied ${copiedPaths.length} best frames to ${outputDir}`);

  return copiedPaths;
}
