/**
 * Test script for OCR on extracted frames
 * Run with: npx tsx src/test-ocr.ts [frame-directory]
 */

import { processFrameDirectory } from './services/ocr.js';
import path from 'path';
import fs from 'fs';

async function main() {
  const frameDir = process.argv[2] || path.join(process.cwd(), 'test-frames');

  if (!fs.existsSync(frameDir)) {
    console.error(`Frame directory not found: ${frameDir}`);
    console.error('Run test-ffmpeg.ts first to extract frames from a video.');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('Testing OCR on Video Frames');
  console.log('='.repeat(50));
  console.log(`Frame directory: ${frameDir}`);
  console.log('Language: Swedish (swe)');
  console.log('');

  try {
    const result = await processFrameDirectory(frameDir, 'swe');

    console.log('='.repeat(50));
    console.log('RESULTS');
    console.log('='.repeat(50));
    console.log(`Frames processed: ${result.results.length}`);
    console.log(`Frames with text: ${result.results.filter(r => r.text.length > 0).length}`);
    console.log(`Average confidence: ${result.averageConfidence.toFixed(1)}%`);
    console.log(`Combined text length: ${result.combinedText.length} characters`);
    console.log('');

    // Show first 500 chars of combined text
    if (result.combinedText.length > 0) {
      console.log('Preview of extracted text:');
      console.log('-'.repeat(50));
      console.log(result.combinedText.substring(0, 500));
      if (result.combinedText.length > 500) {
        console.log('...');
        console.log(`(${result.combinedText.length - 500} more characters)`);
      }
      console.log('-'.repeat(50));

      // Save full text to file
      const outputPath = path.join(frameDir, 'ocr_output.txt');
      fs.writeFileSync(outputPath, result.combinedText);
      console.log(`\nFull text saved to: ${outputPath}`);
    } else {
      console.log('No text was extracted from the frames.');
      console.log('This might mean the video does not contain readable text.');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
