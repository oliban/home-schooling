/**
 * Chapter detection service for OCR text
 *
 * Detects chapter boundaries in Swedish/English book text and splits
 * the content into separate chapters. Also tracks page numbers and
 * detects missing pages.
 */

export interface Chapter {
  chapterNumber: number;
  title: string;
  text: string;
  startIndex: number;
  endIndex: number;
  pageStart?: number;
  pageEnd?: number;
}

export interface PageInfo {
  pageNumber: number;
  frameIndex: number;
  textPreview: string;
}

export interface PageGap {
  afterPage: number;
  beforePage: number;
  missingCount: number;
}

export interface UncertainChapter {
  chapterNumber: number;
  possibleTitle: string;
  confidence: 'low' | 'medium';
  reason: string;
  nearPage?: number;
}

export interface ChapterDetectionResult {
  chapters: Chapter[];
  hasChapters: boolean;
  rawText: string;
  pages: PageInfo[];
  pageGaps: PageGap[];
  uncertainChapters: UncertainChapter[];
  pageRange?: { start: number; end: number };
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
 * Extract page numbers from OCR text
 * Page numbers typically appear as isolated numbers on their own line
 * or near the edges of pages (first/last few lines of a frame)
 */
function extractPageNumbers(ocrText: string): PageInfo[] {
  const pages: PageInfo[] = [];
  const frames = ocrText.split('---PAGE---');

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const lines = frame.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Look for page numbers in first 5 and last 5 lines of each frame
    const candidateLines = [
      ...lines.slice(0, 5).map((l, i) => ({ line: l, pos: i })),
      ...lines.slice(-5).map((l, i) => ({ line: l, pos: lines.length - 5 + i }))
    ];

    for (const { line, pos } of candidateLines) {
      // Page number patterns:
      // - Standalone number: "42"
      // - Number with noise: "42 |" or "| 42"
      // - Number at start/end: "42 Some text" (less reliable)
      const pageMatch = line.match(/^[\s|,.\-]*(\d{1,3})[\s|,.\-]*$/);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1]);
        // Reasonable page number range (1-500)
        if (pageNum >= 1 && pageNum <= 500) {
          // Get text preview from middle of frame
          const previewLines = lines.slice(
            Math.max(0, Math.floor(lines.length / 2) - 2),
            Math.min(lines.length, Math.floor(lines.length / 2) + 2)
          );
          const preview = previewLines.join(' ').substring(0, 80);

          // Avoid duplicates within same frame
          if (!pages.some(p => p.frameIndex === frameIndex && p.pageNumber === pageNum)) {
            pages.push({
              pageNumber: pageNum,
              frameIndex,
              textPreview: preview
            });
          }
        }
      }
    }
  }

  // Sort by page number and deduplicate
  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  // Remove duplicate page numbers (keep first occurrence)
  const seen = new Set<number>();
  return pages.filter(p => {
    if (seen.has(p.pageNumber)) return false;
    seen.add(p.pageNumber);
    return true;
  });
}

/**
 * Detect gaps in the page sequence (missing pages)
 */
function detectPageGaps(pages: PageInfo[]): PageGap[] {
  const gaps: PageGap[] = [];

  for (let i = 0; i < pages.length - 1; i++) {
    const current = pages[i].pageNumber;
    const next = pages[i + 1].pageNumber;

    // Allow for double-page spreads (skip of 2 is normal)
    // But flag gaps larger than 2
    if (next - current > 2) {
      gaps.push({
        afterPage: current,
        beforePage: next,
        missingCount: next - current - 1
      });
    }
  }

  return gaps;
}

/**
 * Find chapters that were detected but have uncertain/corrupted titles
 */
function findUncertainChapters(
  text: string,
  confirmedChapters: number[],
  pages: PageInfo[]
): UncertainChapter[] {
  const uncertain: UncertainChapter[] = [];
  const lines = text.split('\n');

  // Look for chapter number patterns that weren't confirmed
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match "X. " where X is a number at start of line
    let match = line.match(/^(\d+)\.\s*(.*)$/);

    // Also look for chapter numbers embedded in noisy text like "text 3 D 3 N TITLE"
    if (!match) {
      const embeddedMatch = line.match(/\s(\d)\s+D\s*\d*\s*N\s+([A-ZÅÄÖ]+)/);
      if (embeddedMatch) {
        match = [line, embeddedMatch[1], embeddedMatch[2]];
      }
    }

    if (match) {
      const chapterNum = parseInt(match[1]);

      // Skip if already confirmed or out of reasonable range
      if (confirmedChapters.includes(chapterNum) || chapterNum > 20 || chapterNum < 1) {
        continue;
      }

      let titlePart = match[2].trim();

      // Try to reconstruct title from next few lines if current line has caps
      if (titlePart.length < 10) {
        const nextLines = lines.slice(i, Math.min(i + 3, lines.length));
        const capsWords: string[] = [];
        for (const nextLine of nextLines) {
          // Extract capital letter sequences that might be title words
          const caps = nextLine.match(/[A-ZÅÄÖ]{3,}/g);
          if (caps) {
            capsWords.push(...caps);
          }
        }
        if (capsWords.length > 0) {
          titlePart = capsWords.slice(0, 4).join(' ');
        }
      }

      // Check if this looks like a corrupted chapter title
      const hasSomeCaps = /[A-ZÅÄÖ]{2,}/.test(titlePart);
      const isFragmented = titlePart.split(/\s+/).length > 3 &&
                           titlePart.replace(/[a-zåäöA-ZÅÄÖ\s]/g, '').length > 3;

      if (hasSomeCaps || titlePart.length > 0) {
        // Try to find nearby page number by looking at surrounding context
        let nearPage: number | undefined;
        const contextStart = Math.max(0, i - 20);
        const contextEnd = Math.min(lines.length, i + 20);

        for (let j = contextStart; j < contextEnd; j++) {
          const pageMatch = lines[j].match(/^[\s|,.\-]*(\d{1,3})[\s|,.\-]*$/);
          if (pageMatch) {
            const pageNum = parseInt(pageMatch[1]);
            if (pageNum >= 1 && pageNum <= 500) {
              nearPage = pageNum;
              break;
            }
          }
        }

        // Determine confidence
        let confidence: 'low' | 'medium' = 'low';
        let reason = 'Title appears corrupted by OCR noise';

        if (hasSomeCaps && titlePart.length >= 5) {
          confidence = 'medium';
          reason = 'Title partially readable but may be incomplete';
        }

        if (isFragmented) {
          reason = 'Title fragmented - may contain OCR artifacts';
        }

        // Skip obvious false positives (page numbers misread as chapter numbers)
        if (chapterNum > 10 && !hasSomeCaps && titlePart.length < 5) {
          continue;
        }

        uncertain.push({
          chapterNumber: chapterNum,
          possibleTitle: titlePart.substring(0, 50) + (titlePart.length > 50 ? '...' : ''),
          confidence,
          reason,
          nearPage
        });
      }
    }
  }

  // Deduplicate by chapter number (keep first occurrence)
  const seen = new Set<number>();
  return uncertain.filter(u => {
    if (seen.has(u.chapterNumber)) return false;
    seen.add(u.chapterNumber);
    return true;
  });
}

/**
 * Associate page numbers with chapters
 */
function assignPagesToChapters(
  chapters: Chapter[],
  pages: PageInfo[],
  rawText: string
): void {
  if (pages.length === 0) return;

  // For each chapter, find the page range
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const nextChapter = chapters[i + 1];

    // Find pages that fall within this chapter's text range
    const chapterPages = pages.filter(p => {
      // Estimate frame position from text
      const frameStart = rawText.indexOf('---PAGE---'.repeat(p.frameIndex) || '');
      return frameStart >= chapter.startIndex &&
             (!nextChapter || frameStart < nextChapter.startIndex);
    });

    if (chapterPages.length > 0) {
      chapter.pageStart = Math.min(...chapterPages.map(p => p.pageNumber));
      chapter.pageEnd = Math.max(...chapterPages.map(p => p.pageNumber));
    }
  }
}

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

  // Extract page numbers first
  const pages = extractPageNumbers(ocrText);
  const pageGaps = detectPageGaps(pages);

  // Calculate page range
  const pageRange = pages.length > 0
    ? { start: pages[0].pageNumber, end: pages[pages.length - 1].pageNumber }
    : undefined;

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

  // Keep all headings but track which ones are uncertain
  const confirmedHeadings: typeof headings = [];
  const uncertainFromFilter: UncertainChapter[] = [];

  for (const h of headings) {
    // Title should have real Swedish/English words (at least 3 chars each)
    const words = h.title.match(/[A-ZÅÄÖa-zåäö]{3,}/g) || [];
    // Need at least 2 words of 3+ chars, OR one long word (8+ chars)
    const hasRealWords = words.length >= 2 || words.some(w => w.length >= 8);
    // Title should be at least 8 chars total
    const longEnough = h.title.replace(/\s/g, '').length >= 8;

    if (hasRealWords && longEnough) {
      confirmedHeadings.push(h);
    } else {
      // This is an uncertain chapter
      uncertainFromFilter.push({
        chapterNumber: h.number,
        possibleTitle: h.title,
        confidence: hasRealWords ? 'medium' : 'low',
        reason: !longEnough
          ? 'Title too short - may be corrupted'
          : 'Title lacks recognizable words'
      });
    }
  }

  // Find additional uncertain chapters not in headings
  const confirmedNumbers = confirmedHeadings.map(h => h.number);
  const additionalUncertain = findUncertainChapters(cleanedText, confirmedNumbers, pages);

  // Merge uncertain chapters, avoiding duplicates
  const allUncertain = [...uncertainFromFilter];
  for (const u of additionalUncertain) {
    if (!allUncertain.some(existing => existing.chapterNumber === u.chapterNumber)) {
      allUncertain.push(u);
    }
  }
  allUncertain.sort((a, b) => a.chapterNumber - b.chapterNumber);

  if (confirmedHeadings.length === 0) {
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
      rawText: cleanedText,
      pages,
      pageGaps,
      uncertainChapters: allUncertain,
      pageRange
    };
  }

  const chapters: Chapter[] = [];

  // Use aggressively cleaned text for chapter content
  const textForContent = aggressiveClean(cleanedText);

  for (let i = 0; i < confirmedHeadings.length; i++) {
    const heading = confirmedHeadings[i];
    const nextHeading = confirmedHeadings[i + 1];

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

  // Assign page ranges to chapters
  assignPagesToChapters(chapters, pages, ocrText);

  return {
    chapters,
    hasChapters: true,
    rawText: cleanedText,
    pages,
    pageGaps,
    uncertainChapters: allUncertain,
    pageRange
  };
}

/**
 * Format chapters for display/logging
 */
export function formatChapterSummary(result: ChapterDetectionResult): string {
  const lines: string[] = [];

  // Page range summary
  if (result.pageRange) {
    lines.push(`Pages detected: ${result.pageRange.start} - ${result.pageRange.end} (${result.pages.length} unique pages)`);
  } else {
    lines.push('No page numbers detected');
  }

  // Page gaps warning
  if (result.pageGaps.length > 0) {
    lines.push('');
    lines.push('⚠️  MISSING PAGES DETECTED:');
    for (const gap of result.pageGaps) {
      lines.push(`   Pages ${gap.afterPage + 1}-${gap.beforePage - 1} missing (${gap.missingCount} pages)`);
    }
  }

  lines.push('');

  if (!result.hasChapters) {
    lines.push('No chapters detected - treating as single chapter');
    return lines.join('\n');
  }

  lines.push(`Detected ${result.chapters.length} confirmed chapter(s):`);

  for (const chapter of result.chapters) {
    const preview = chapter.text.substring(0, 100).replace(/\n/g, ' ');
    const pageInfo = chapter.pageStart
      ? ` [pages ${chapter.pageStart}-${chapter.pageEnd}]`
      : '';
    lines.push(`  ${chapter.chapterNumber}. ${chapter.title} (${chapter.text.length} chars)${pageInfo}`);
    lines.push(`     Preview: "${preview}..."`);
  }

  // Uncertain chapters
  if (result.uncertainChapters.length > 0) {
    lines.push('');
    lines.push('❓ UNCERTAIN CHAPTERS (need confirmation):');
    for (const uc of result.uncertainChapters) {
      const pageHint = uc.nearPage ? ` [near page ${uc.nearPage}]` : '';
      lines.push(`  ${uc.chapterNumber}. "${uc.possibleTitle}"${pageHint}`);
      lines.push(`     Confidence: ${uc.confidence} - ${uc.reason}`);
    }
  }

  return lines.join('\n');
}
