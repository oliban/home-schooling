import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

interface ExtractOptions {
  fps?: number;           // Frames per second to extract (default: 0.5 = 1 frame every 2 seconds)
  outputFormat?: 'png' | 'jpg';
  maxFrames?: number;     // Maximum number of frames to extract
  autoRotate?: boolean;   // Auto-rotate based on metadata (default: true)
  forceRotate?: number;   // Force rotation: 90, 180, or 270 degrees
}

interface ExtractResult {
  outputDir: string;
  frames: string[];
  duration: number;
  frameCount: number;
}

/**
 * Get video duration in seconds
 */
export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Extract frames from a video file
 */
/**
 * Get video rotation from metadata
 */
export function getVideoRotation(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      // Check for rotation in video stream
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (videoStream) {
        // Check rotation tag
        const rotation = videoStream.rotation || 0;
        // Also check side_data for display matrix
        const sideData = (videoStream as unknown as { side_data_list?: Array<{ rotation?: number }> }).side_data_list;
        if (sideData) {
          const displayMatrix = sideData.find(d => d.rotation !== undefined);
          if (displayMatrix) {
            resolve(displayMatrix.rotation || 0);
            return;
          }
        }
        resolve(typeof rotation === 'number' ? rotation : parseInt(rotation) || 0);
      } else {
        resolve(0);
      }
    });
  });
}

export async function extractFramesFromVideo(
  videoPath: string,
  outputDir: string,
  options: ExtractOptions = {}
): Promise<ExtractResult> {
  const { fps = 0.5, outputFormat = 'jpg', maxFrames = 100, autoRotate = true, forceRotate } = options;

  // Ensure video exists
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get video duration
  const duration = await getVideoDuration(videoPath);
  console.log(`Video duration: ${duration.toFixed(2)}s`);

  // Check rotation
  let rotation = 0;
  if (forceRotate) {
    rotation = forceRotate;
    console.log(`Forcing rotation: ${rotation}°`);
  } else if (autoRotate) {
    rotation = await getVideoRotation(videoPath);
    if (rotation !== 0) {
      console.log(`Detected rotation: ${rotation}° (will auto-correct)`);
    }
  }

  // Calculate expected frames
  const expectedFrames = Math.min(Math.ceil(duration * fps), maxFrames);
  console.log(`Expected frames: ~${expectedFrames} (at ${fps} fps)`);

  const outputPattern = path.join(outputDir, `frame_%04d.${outputFormat}`);

  // Build video filter
  let vf = `fps=${fps}`;

  // Add rotation if needed (transpose filter)
  // Note: ffmpeg auto-rotates by default when using -autorotate (enabled by default)
  // But for manual control:
  if (forceRotate) {
    switch (forceRotate) {
      case 90:
        vf += ',transpose=1'; // 90° clockwise
        break;
      case 180:
        vf += ',transpose=1,transpose=1'; // 180°
        break;
      case 270:
        vf += ',transpose=2'; // 90° counter-clockwise
        break;
    }
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf ${vf}`,
        '-q:v 2', // High quality for jpg
      ])
      .output(outputPattern)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`Progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        // Get list of extracted frames
        const files = fs.readdirSync(outputDir)
          .filter(f => f.startsWith('frame_') && f.endsWith(`.${outputFormat}`))
          .sort()
          .slice(0, maxFrames);

        const frames = files.map(f => path.join(outputDir, f));

        console.log(`Extracted ${frames.length} frames to ${outputDir}`);

        resolve({
          outputDir,
          frames,
          duration,
          frameCount: frames.length,
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Extract frames at specific intervals (e.g., one per page flip)
 * This is useful for book scanning where you want distinct pages
 */
export async function extractKeyFrames(
  videoPath: string,
  outputDir: string,
  options: { interval?: number; outputFormat?: 'png' | 'jpg' } = {}
): Promise<ExtractResult> {
  const { interval = 2, outputFormat = 'jpg' } = options;

  // Use scene detection or fixed interval
  // For book page flipping, every 2-3 seconds usually works well
  return extractFramesFromVideo(videoPath, outputDir, {
    fps: 1 / interval,
    outputFormat,
  });
}
