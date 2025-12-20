import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface FrameScore {
  framePath: string;
  sharpness: number;
  brightness: number;
  contrast: number;
  overallScore: number;
  timestamp: number; // seconds into video
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
 * Select best frames from each time window
 * This ensures we get the clearest frame for each "page" being shown
 */
export async function selectBestFrames(
  frameDir: string,
  options: {
    fps?: number;
    windowSeconds?: number; // Time window to select best frame from
    minScore?: number; // Minimum score threshold
  } = {}
): Promise<BestFramesResult> {
  const { fps = 0.5, windowSeconds = 3, minScore = 0.5 } = options;

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

  // Select best frame from each window
  const bestFrames: FrameScore[] = [];

  for (const window of windows) {
    const best = window.reduce((a, b) => a.overallScore > b.overallScore ? a : b);
    if (best.overallScore >= minScore) {
      bestFrames.push(best);
    }
  }

  console.log(`\nFrame quality analysis:`);
  console.log(`  Total frames: ${allScores.length}`);
  console.log(`  Time windows: ${windows.length} (${windowSeconds}s each)`);
  console.log(`  Best frames selected: ${bestFrames.length}`);

  if (bestFrames.length > 0) {
    const avgScore = bestFrames.reduce((sum, f) => sum + f.overallScore, 0) / bestFrames.length;
    console.log(`  Average quality score: ${avgScore.toFixed(2)}`);
  }

  return {
    allScores,
    bestFrames,
    selectedPaths: bestFrames.map(f => f.framePath),
  };
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
