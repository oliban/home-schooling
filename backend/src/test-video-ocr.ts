/**
 * Integrated video-to-text pipeline with smart frame selection
 *
 * This script:
 * 1. Auto-detects the best rotation by testing all orientations
 * 2. Extracts frames at higher FPS for better selection
 * 3. Scores each frame for sharpness/quality
 * 4. Selects the best frame from each time window
 * 5. Runs OCR only on the best frames
 *
 * Usage: npx tsx src/test-video-ocr.ts /path/to/video.mov [rotation]
 */

import { extractFramesFromVideo, getVideoDuration } from './services/ffmpeg.js';
import { selectBestFrames, copyBestFrames } from './services/frame-quality.js';
import { extractTextFromImages, extractTextFromImage } from './services/ocr.js';
import { detectChapters, formatChapterSummary } from './services/chapter-detection.js';
import path from 'path';
import fs from 'fs';

/**
 * Detect the best rotation by testing OCR on a sample frame with all orientations
 */
async function detectBestRotation(videoPath: string): Promise<number> {
  const rotations = [0, 90, 180, 270];
  const testDir = path.join(process.cwd(), 'rotation-test');

  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  console.log('Testing rotations to find best orientation...');

  const results: { rotation: number; confidence: number; textLength: number }[] = [];

  for (const rotation of rotations) {
    const rotDir = path.join(testDir, `rot_${rotation}`);
    fs.mkdirSync(rotDir, { recursive: true });

    // Extract a single frame from the middle of the video
    const duration = await getVideoDuration(videoPath);
    const midTime = duration / 2;

    // Use ffmpeg to extract a single frame at midpoint with rotation
    const { execSync } = await import('child_process');
    const outputPath = path.join(rotDir, 'test_frame.jpg');

    let vf = `select='eq(n\\,0)'`;
    if (rotation === 90) {
      vf = `select='eq(n\\,0)',transpose=1`;
    } else if (rotation === 180) {
      vf = `select='eq(n\\,0)',transpose=1,transpose=1`;
    } else if (rotation === 270) {
      vf = `select='eq(n\\,0)',transpose=2`;
    }

    try {
      execSync(
        `ffmpeg -y -ss ${midTime.toFixed(2)} -i "${videoPath}" -vf "${vf}" -vframes 1 -q:v 2 "${outputPath}" 2>/dev/null`,
        { stdio: 'pipe' }
      );

      // Run OCR on the test frame
      const ocrResult = await extractTextFromImage(outputPath, 'swe');

      results.push({
        rotation,
        confidence: ocrResult.confidence,
        textLength: ocrResult.text.length,
      });

      console.log(`  ${rotation}°: confidence=${ocrResult.confidence.toFixed(1)}%, text=${ocrResult.text.length} chars`);
    } catch (error) {
      console.log(`  ${rotation}°: failed to extract frame`);
      results.push({ rotation, confidence: 0, textLength: 0 });
    }
  }

  // Clean up test directory
  fs.rmSync(testDir, { recursive: true });

  // Find the best rotation (highest confidence, with text length as tiebreaker)
  const best = results.reduce((a, b) => {
    if (b.confidence > a.confidence) return b;
    if (b.confidence === a.confidence && b.textLength > a.textLength) return b;
    return a;
  });

  console.log(`\nBest rotation: ${best.rotation}° (confidence: ${best.confidence.toFixed(1)}%)`);
  console.log('');

  return best.rotation;
}

async function main() {
  const videoPath = process.argv[2];
  let forceRotate = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  if (!videoPath) {
    console.error('Usage: npx tsx src/test-video-ocr.ts /path/to/video.mov [rotation: 90|180|270]');
    console.error('');
    console.error('This script extracts text from a video of book pages.');
    console.error('It automatically detects the best rotation if not specified.');
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('  VIDEO TO TEXT - Smart Frame Selection Pipeline');
  console.log('═'.repeat(60));
  console.log(`Input: ${videoPath}`);

  try {
    // Get video info
    const duration = await getVideoDuration(videoPath);
    console.log(`Video duration: ${duration.toFixed(1)} seconds`);

    // Auto-detect rotation if not specified
    if (forceRotate === undefined) {
      console.log('');
      console.log('─'.repeat(60));
      console.log('STEP 0: Auto-detecting best rotation');
      console.log('─'.repeat(60));
      forceRotate = await detectBestRotation(videoPath);
    } else {
      console.log(`Rotation: ${forceRotate}° (manually specified)`);
    }
    console.log('');

    // Create directories
    const allFramesDir = path.join(process.cwd(), 'all-frames');
    const bestFramesDir = path.join(process.cwd(), 'best-frames');

    // Clean up existing directories
    for (const dir of [allFramesDir, bestFramesDir]) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
      }
    }

    // Step 1: Extract frames at higher FPS for better selection
    console.log('');
    console.log('─'.repeat(60));
    console.log('STEP 1: Extracting frames (2 fps for quality selection)');
    console.log('─'.repeat(60));

    const extractionFps = 2; // 2 frames per second for selection
    const result = await extractFramesFromVideo(videoPath, allFramesDir, {
      fps: extractionFps,
      outputFormat: 'jpg',
      maxFrames: 200,
      forceRotate,
    });

    console.log(`Extracted ${result.frameCount} frames`);

    // Step 2: Score frames and select best ones
    console.log('');
    console.log('─'.repeat(60));
    console.log('STEP 2: Analyzing frame quality');
    console.log('─'.repeat(60));

    const windowSeconds = 2; // Select best frame every 2 seconds
    const { bestFrames, allScores } = await selectBestFrames(allFramesDir, {
      fps: extractionFps,
      windowSeconds,
      minScore: 0.3,
    });

    // Show quality distribution
    console.log('');
    console.log('Quality distribution:');
    const sortedScores = [...allScores].sort((a, b) => b.overallScore - a.overallScore);
    const top5 = sortedScores.slice(0, 5);
    const bottom5 = sortedScores.slice(-5);
    console.log('  Top 5 frames:');
    top5.forEach((f, i) => {
      console.log(`    ${i + 1}. ${path.basename(f.framePath)} - score: ${f.overallScore.toFixed(2)}, sharpness: ${f.sharpness.toFixed(0)}`);
    });
    console.log('  Bottom 5 frames:');
    bottom5.forEach((f, i) => {
      console.log(`    ${i + 1}. ${path.basename(f.framePath)} - score: ${f.overallScore.toFixed(2)}, sharpness: ${f.sharpness.toFixed(0)}`);
    });

    // Step 3: Copy best frames
    console.log('');
    console.log('─'.repeat(60));
    console.log('STEP 3: Copying best frames');
    console.log('─'.repeat(60));

    const bestPaths = await copyBestFrames(bestFrames, bestFramesDir);

    // Step 4: Run OCR on best frames only
    console.log('');
    console.log('─'.repeat(60));
    console.log('STEP 4: Running OCR on best frames');
    console.log('─'.repeat(60));

    const ocrResult = await extractTextFromImages(bestPaths, 'swe');

    // Save raw OCR results
    const outputPath = path.join(bestFramesDir, 'ocr_output.txt');
    fs.writeFileSync(outputPath, ocrResult.combinedText);

    // Step 5: Detect chapters
    console.log('');
    console.log('─'.repeat(60));
    console.log('STEP 5: Detecting chapters');
    console.log('─'.repeat(60));

    const chapterResult = detectChapters(ocrResult.combinedText);
    console.log(formatChapterSummary(chapterResult));

    // Save chapter files
    const chaptersDir = path.join(bestFramesDir, 'chapters');
    if (!fs.existsSync(chaptersDir)) {
      fs.mkdirSync(chaptersDir, { recursive: true });
    }

    for (const chapter of chapterResult.chapters) {
      const chapterFileName = `chapter_${String(chapter.chapterNumber).padStart(2, '0')}.txt`;
      const chapterPath = path.join(chaptersDir, chapterFileName);
      const chapterContent = `# ${chapter.chapterNumber}. ${chapter.title}\n\n${chapter.text}`;
      fs.writeFileSync(chapterPath, chapterContent);
    }

    // Save chapter metadata as JSON (including page info)
    const metadataPath = path.join(chaptersDir, 'chapters.json');
    fs.writeFileSync(metadataPath, JSON.stringify({
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
    console.log(`Total frames extracted: ${result.frameCount}`);
    console.log(`Best frames selected: ${bestFrames.length} (reduction: ${((1 - bestFrames.length / result.frameCount) * 100).toFixed(0)}%)`);
    console.log(`OCR confidence: ${ocrResult.averageConfidence.toFixed(1)}%`);
    console.log(`Text extracted: ${ocrResult.combinedText.length} characters`);

    // Page information
    if (chapterResult.pageRange) {
      console.log(`Pages detected: ${chapterResult.pageRange.start} - ${chapterResult.pageRange.end} (${chapterResult.pages.length} unique)`);
    }

    console.log(`Chapters detected: ${chapterResult.chapters.length}`);

    // Warnings about missing pages
    if (chapterResult.pageGaps.length > 0) {
      console.log('');
      console.log('⚠️  MISSING PAGES:');
      for (const gap of chapterResult.pageGaps) {
        console.log(`   Pages ${gap.afterPage + 1}-${gap.beforePage - 1} not found (${gap.missingCount} pages)`);
      }
    }

    // Uncertain chapters that need confirmation
    if (chapterResult.uncertainChapters.length > 0) {
      console.log('');
      console.log('❓ UNCERTAIN CHAPTERS (may need confirmation):');
      for (const uc of chapterResult.uncertainChapters) {
        const pageHint = uc.nearPage ? ` [near page ${uc.nearPage}]` : '';
        console.log(`   ${uc.chapterNumber}. "${uc.possibleTitle}"${pageHint} - ${uc.reason}`);
      }
    }

    console.log('');
    console.log(`Output saved to: ${outputPath}`);
    console.log(`Chapter files saved to: ${chaptersDir}`);

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

    // Cleanup all-frames to save space (keep only best-frames)
    console.log('');
    console.log('Cleaning up temporary frames...');
    fs.rmSync(allFramesDir, { recursive: true });
    console.log('Done! Best frames, chapters, and OCR output are in: ' + bestFramesDir);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
