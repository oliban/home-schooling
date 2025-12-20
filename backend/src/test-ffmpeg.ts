/**
 * Test script for video frame extraction
 * Run with: npx tsx src/test-ffmpeg.ts /path/to/video.mov
 */

import { extractFramesFromVideo, getVideoDuration } from './services/ffmpeg.js';
import path from 'path';
import fs from 'fs';

async function main() {
  const videoPath = process.argv[2];
  const forceRotate = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  if (!videoPath) {
    console.error('Usage: npx tsx src/test-ffmpeg.ts /path/to/video.mov [rotation: 90|180|270]');
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('Testing Video Frame Extraction');
  console.log('='.repeat(50));
  console.log(`Input: ${videoPath}`);

  try {
    // Get video info
    const duration = await getVideoDuration(videoPath);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'test-frames');

    // Clean up any existing frames
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }

    console.log(`Output directory: ${outputDir}`);
    console.log('');
    console.log('Extracting frames (1 frame every 2 seconds)...');

    // Extract frames
    const result = await extractFramesFromVideo(videoPath, outputDir, {
      fps: 0.5, // 1 frame every 2 seconds
      outputFormat: 'jpg',
      maxFrames: 50,
      forceRotate,
    });

    console.log('');
    console.log('='.repeat(50));
    console.log('RESULTS');
    console.log('='.repeat(50));
    console.log(`Frames extracted: ${result.frameCount}`);
    console.log(`Output directory: ${result.outputDir}`);
    console.log('');
    console.log('First 5 frames:');
    result.frames.slice(0, 5).forEach((frame, i) => {
      const stats = fs.statSync(frame);
      console.log(`  ${i + 1}. ${path.basename(frame)} (${(stats.size / 1024).toFixed(1)} KB)`);
    });

    if (result.frames.length > 5) {
      console.log(`  ... and ${result.frames.length - 5} more`);
    }

    console.log('');
    console.log('SUCCESS! Frames are ready for OCR processing.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
