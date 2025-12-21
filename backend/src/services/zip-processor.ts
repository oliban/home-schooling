/**
 * Zip file processor for book page images
 * Extracts images from zip files and converts HEIC to JPEG for OCR
 */

import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// HEIC conversion - dynamic import since it's ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let heicConvert: any = null;

async function getHeicConvert() {
  if (!heicConvert) {
    // @ts-expect-error - heic-convert doesn't have type definitions
    const module = await import('heic-convert');
    heicConvert = module.default;
  }
  return heicConvert;
}

const IMAGE_EXTENSIONS = ['.heic', '.png', '.jpg', '.jpeg'];

interface ExtractResult {
  imagePaths: string[];
  totalFiles: number;
  heicConverted: number;
}

/**
 * Check if a file is an image we can process
 */
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Crop image to remove partial second page visible on edge
 * Removes ~15% from right edge where the other page bleeds through
 */
async function cropToMainPage(imagePath: string): Promise<void> {
  const metadata = await sharp(imagePath).metadata();
  if (!metadata.width || !metadata.height) return;

  // Crop 15% from the right edge to remove partial second page
  const cropWidth = Math.floor(metadata.width * 0.85);

  const buffer = await sharp(imagePath)
    .extract({ left: 0, top: 0, width: cropWidth, height: metadata.height })
    .toBuffer();

  fs.writeFileSync(imagePath, buffer);
}

/**
 * Convert a HEIC file to JPEG
 */
async function convertHeicToJpeg(heicPath: string): Promise<string> {
  const convert = await getHeicConvert();
  const inputBuffer = fs.readFileSync(heicPath);

  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.9
  });

  // Save as .jpg next to the original
  const jpegPath = heicPath.replace(/\.heic$/i, '.jpg');
  fs.writeFileSync(jpegPath, Buffer.from(outputBuffer));

  // Remove the original HEIC file
  fs.unlinkSync(heicPath);

  return jpegPath;
}

/**
 * Extract a zip file and prepare images for OCR
 * - Extracts all files to outputDir
 * - Filters for image files (HEIC, PNG, JPG, JPEG)
 * - Converts HEIC files to JPEG
 * - Returns sorted list of image paths (alphabetically, assuming pages are in order)
 */
export async function extractAndPrepareImages(
  zipPath: string,
  outputDir: string
): Promise<ExtractResult> {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Zip file not found: ${zipPath}`);
  }

  // Create output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Extracting: ${zipPath}`);

  // Extract zip
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  // Filter for image files and extract them
  const imageEntries = entries.filter(entry => {
    // Skip directories and hidden files (like __MACOSX)
    if (entry.isDirectory) return false;
    if (entry.entryName.startsWith('__MACOSX')) return false;
    if (entry.entryName.startsWith('.')) return false;
    return isImageFile(entry.entryName);
  });

  console.log(`Found ${imageEntries.length} image files`);

  // Extract image files with flat naming (preserve order)
  const extractedPaths: string[] = [];

  for (const entry of imageEntries) {
    const originalName = path.basename(entry.entryName);
    const outputPath = path.join(outputDir, originalName);

    fs.writeFileSync(outputPath, entry.getData());
    extractedPaths.push(outputPath);
  }

  // Sort by filename (assumes pages are numbered/ordered in filename)
  extractedPaths.sort((a, b) => {
    const nameA = path.basename(a).toLowerCase();
    const nameB = path.basename(b).toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true });
  });

  // Convert HEIC files to JPEG and crop to main page
  let heicConverted = 0;
  const finalPaths: string[] = [];

  for (let i = 0; i < extractedPaths.length; i++) {
    const filePath = extractedPaths[i];
    const ext = path.extname(filePath).toLowerCase();
    let processedPath = filePath;

    if (ext === '.heic') {
      console.log(`Converting HEIC: ${path.basename(filePath)}`);
      processedPath = await convertHeicToJpeg(filePath);
      heicConverted++;
    }

    // Crop to remove partial second page from edge
    await cropToMainPage(processedPath);
    finalPaths.push(processedPath);

    // Progress
    const pct = Math.round(((i + 1) / extractedPaths.length) * 100);
    process.stdout.write(`\r  Processing: ${pct}%`);
  }

  console.log(''); // New line after progress

  return {
    imagePaths: finalPaths,
    totalFiles: imageEntries.length,
    heicConverted
  };
}

/**
 * Get info about a zip file without extracting
 */
export function getZipInfo(zipPath: string): { totalFiles: number; imageFiles: number; heicFiles: number } {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  let imageFiles = 0;
  let heicFiles = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (entry.entryName.startsWith('__MACOSX')) continue;
    if (entry.entryName.startsWith('.')) continue;

    if (isImageFile(entry.entryName)) {
      imageFiles++;
      if (path.extname(entry.entryName).toLowerCase() === '.heic') {
        heicFiles++;
      }
    }
  }

  return {
    totalFiles: entries.length,
    imageFiles,
    heicFiles
  };
}
