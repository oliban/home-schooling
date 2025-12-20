/**
 * Chapter detection service for OCR text
 *
 * Detects chapter boundaries in Swedish/English book text and splits
 * the content into separate chapters.
 */

export interface Chapter {
  chapterNumber: number;
  title: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface ChapterDetectionResult {
  chapters: Chapter[];
  hasChapters: boolean;
  rawText: string;
}

// Patterns for detecting chapter headings in Swedish and English
// These are ordered by specificity - more specific patterns first
const CHAPTER_PATTERNS = [
  // Swedish explicit chapter markers - "Kapitel 1" or "Kap. 1: Titel"
  /(?:^|\n)\s*(kapitel|kap\.?)\s+(\d+)[:\.\s]*([^\n]*)/i,

  // English explicit chapter markers - "Chapter 1" or "Ch. 1: Title"
  /(?:^|\n)\s*(chapter|ch\.?)\s+(\d+)[:\.\s]*([^\n]*)/i,

  // Numbered chapter with ALL CAPS title on same or next line (Swedish books)
  /(?:^|\n)\s*(\d+)\.\s*([A-ZÅÄÖ][A-ZÅÄÖ\s\-]{3,})/,              // "1. DE FREDLÖSA"

  // Look for "X. TITLE" pattern where title has multiple caps words
  /(?:^|\n)\s*(\d+)\.\s+([A-ZÅÄÖ][A-ZÅÄÖ]+(?:\s+[A-ZÅÄÖ]+)+)/,   // "1. SHERWOOD SKOGEN"
];

// Pattern to detect page markers from OCR (---PAGE---)
const PAGE_MARKER = /---PAGE---/g;

/**
 * Clean OCR text by removing noise and normalizing whitespace
 */
function cleanOcrText(text: string): string {
  return text
    // Remove common OCR artifacts (random symbols, broken characters)
    .replace(/[|\\/<>{}[\]@#$%^&*+=~`]/g, ' ')
    // Normalize multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Normalize multiple newlines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * Aggressively clean OCR text - remove short lines that are likely noise
 */
function aggressiveClean(text: string): string {
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Keep lines that:
    // - Are page markers
    // - Have at least 20 chars of actual words (not just random chars)
    // - Or look like chapter headings (start with number or "Kapitel")
    if (trimmed === '---PAGE---') {
      cleanedLines.push(trimmed);
    } else if (/^\d+\.\s+[A-ZÅÄÖ]/.test(trimmed)) {
      // Chapter heading pattern
      cleanedLines.push(trimmed);
    } else if (/^(kapitel|chapter)/i.test(trimmed)) {
      cleanedLines.push(trimmed);
    } else {
      // Count actual Swedish words (3+ letters)
      const words = trimmed.match(/[a-zåäöA-ZÅÄÖ]{3,}/g) || [];
      const wordChars = words.join('').length;
      // Keep if more than 60% of the line is actual words
      if (wordChars > 0 && wordChars / trimmed.replace(/\s/g, '').length > 0.6) {
        cleanedLines.push(trimmed);
      }
    }
  }

  return cleanedLines.join('\n');
}

/**
 * Try to find chapter heading by looking for patterns in noisy OCR
 * Looks for numbered sections with recognizable title words nearby
 */
function findChapterInNoisyText(text: string): Array<{ index: number; number: number; title: string }> {
  const chapters: Array<{ index: number; number: number; title: string }> = [];

  // Look for "X." followed by capital letters within a window
  const lines = text.split('\n');
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for chapter number pattern
    const numMatch = line.match(/^(\d+)\.\s*/);
    if (numMatch) {
      const chapterNum = parseInt(numMatch[1]);
      if (chapterNum > 0 && chapterNum < 50) {
        // Look for title in this line and next few lines
        let titleParts: string[] = [];
        const afterNum = line.substring(numMatch[0].length).trim();

        // Check if there's ALL CAPS text after the number
        const capsMatch = afterNum.match(/^([A-ZÅÄÖ][A-ZÅÄÖ\s\-]+)/);
        if (capsMatch) {
          titleParts.push(capsMatch[1].trim());
        }

        // Also check next 2 lines for continuation of ALL CAPS title
        for (let j = 1; j <= 2 && i + j < lines.length; j++) {
          const nextLine = lines[i + j].trim();
          // If line is mostly ALL CAPS, it might be title continuation
          if (/^[A-ZÅÄÖ][A-ZÅÄÖ\s\-]+$/.test(nextLine) && nextLine.length > 3) {
            titleParts.push(nextLine);
          } else {
            break;
          }
        }

        if (titleParts.length > 0) {
          const title = titleParts.join(' ').replace(/\s+/g, ' ').trim();
          if (title.length > 3) {
            chapters.push({
              index: currentIndex,
              number: chapterNum,
              title
            });
          }
        }
      }
    }

    currentIndex += line.length + 1; // +1 for newline
  }

  return chapters;
}

/**
 * Extract chapter number from match groups
 */
function extractChapterNumber(match: RegExpMatchArray): number | null {
  // Look for a number in the match groups
  for (let i = 1; i < match.length; i++) {
    const num = parseInt(match[i]);
    if (!isNaN(num) && num > 0 && num < 100) {
      return num;
    }
  }
  return null;
}

/**
 * Extract chapter title from match groups
 */
function extractChapterTitle(match: RegExpMatchArray, pattern: RegExp): string {
  const fullMatch = match[0];

  // For pattern "1. TITLE" - title is in group 2
  if (pattern.source.includes('([A-ZÅÄÖ][A-ZÅÄÖ\\s\\-]+)')) {
    return (match[2] || '').trim();
  }

  // For pattern "Kapitel X: Title" - title might be in group 3
  if (match[3] && match[3].trim().length > 0) {
    return match[3].trim();
  }

  // For pattern "Kapitel X" without title
  if (match[2] && isNaN(parseInt(match[2]))) {
    return match[2].trim();
  }

  // Fallback: use everything after the number
  const titleMatch = fullMatch.match(/\d+[:\.\s\-]+(.+)$/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  return `Kapitel ${extractChapterNumber(match) || '?'}`;
}

/**
 * Find all chapter headings in the text
 */
function findChapterHeadings(text: string): Array<{ index: number; number: number; title: string; match: string }> {
  const headings: Array<{ index: number; number: number; title: string; match: string }> = [];

  for (const pattern of CHAPTER_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));

    while ((match = regex.exec(text)) !== null) {
      const chapterNum = extractChapterNumber(match);
      if (chapterNum !== null) {
        // Check if we already found this chapter (avoid duplicates)
        const existing = headings.find(h => h.number === chapterNum);
        if (!existing) {
          headings.push({
            index: match.index,
            number: chapterNum,
            title: extractChapterTitle(match, pattern),
            match: match[0]
          });
        }
      }
    }
  }

  // Sort by position in text
  headings.sort((a, b) => a.index - b.index);

  return headings;
}

/**
 * Detect chapters in OCR text and split into separate chapter objects
 */
export function detectChapters(ocrText: string): ChapterDetectionResult {
  const cleanedText = cleanOcrText(ocrText);

  // Try multiple strategies to find chapters
  let headings = findChapterHeadings(cleanedText);

  // If no chapters found with standard patterns, try aggressive cleaning and noisy text detection
  if (headings.length === 0) {
    const aggressivelyCleaned = aggressiveClean(cleanedText);
    headings = findChapterHeadings(aggressivelyCleaned);

    // Still nothing? Try noisy text detection on original
    if (headings.length === 0) {
      const noisyChapters = findChapterInNoisyText(cleanedText);
      if (noisyChapters.length > 0) {
        headings = noisyChapters.map(c => ({
          index: c.index,
          number: c.number,
          title: c.title,
          match: `${c.number}. ${c.title}`
        }));
      }
    }
  }

  // Filter out suspicious false positives (like "7. " followed by noise)
  headings = headings.filter(h => {
    // Title should have real Swedish/English words (at least 3 chars each)
    const words = h.title.match(/[A-ZÅÄÖa-zåäö]{3,}/g) || [];
    // Need at least 2 words of 3+ chars, OR one long word (8+ chars)
    const hasRealWords = words.length >= 2 || words.some(w => w.length >= 8);
    // Title should be at least 8 chars total
    const longEnough = h.title.replace(/\s/g, '').length >= 8;
    return hasRealWords && longEnough;
  });

  if (headings.length === 0) {
    // No chapters found - use the aggressively cleaned text as single chapter
    const cleanText = aggressiveClean(cleanedText);
    return {
      chapters: [{
        chapterNumber: 1,
        title: 'Untitled',
        text: cleanText.replace(PAGE_MARKER, '\n\n').trim(),
        startIndex: 0,
        endIndex: cleanText.length
      }],
      hasChapters: false,
      rawText: cleanedText
    };
  }

  const chapters: Chapter[] = [];

  // Use aggressively cleaned text for chapter content
  const textForContent = aggressiveClean(cleanedText);

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    const startIndex = heading.index;
    const endIndex = nextHeading ? nextHeading.index : textForContent.length;

    // Extract chapter text (excluding the heading itself from the beginning)
    let chapterText = textForContent.substring(
      Math.min(startIndex, textForContent.length),
      Math.min(endIndex, textForContent.length)
    ).trim();

    // Remove the heading line from the start of the chapter text
    const headingLineEnd = chapterText.indexOf('\n');
    if (headingLineEnd > 0) {
      chapterText = chapterText.substring(headingLineEnd).trim();
    }

    // Remove page markers and clean up
    chapterText = chapterText.replace(PAGE_MARKER, '\n\n').trim();

    chapters.push({
      chapterNumber: heading.number,
      title: heading.title,
      text: chapterText,
      startIndex,
      endIndex
    });
  }

  return {
    chapters,
    hasChapters: true,
    rawText: cleanedText
  };
}

/**
 * Format chapters for display/logging
 */
export function formatChapterSummary(result: ChapterDetectionResult): string {
  if (!result.hasChapters) {
    return 'No chapters detected - treating as single chapter';
  }

  const lines = [`Detected ${result.chapters.length} chapter(s):`];

  for (const chapter of result.chapters) {
    const preview = chapter.text.substring(0, 100).replace(/\n/g, ' ');
    lines.push(`  ${chapter.chapterNumber}. ${chapter.title} (${chapter.text.length} chars)`);
    lines.push(`     Preview: "${preview}..."`);
  }

  return lines.join('\n');
}
