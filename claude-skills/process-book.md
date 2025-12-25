# Process Book OCR Text

Clean up OCR-extracted text and identify chapter boundaries.

## Video to OCR Pipeline

If the input is a video file (e.g., `.MOV`, `.mp4`), use the smart frame selection pipeline:

### Recommended: Smart Pipeline (auto-selects best frames)
```bash
cd backend && npx tsx src/test-video-ocr.ts /path/to/video.mov [rotation]
```

This pipeline automatically:
1. Extracts frames at 2fps for quality analysis
2. Scores each frame for sharpness and readability
3. Selects only the clearest frame from each 2-second window
4. Runs OCR only on the best frames (typically 70-80% reduction)
5. **Detects page numbers** and identifies gaps (missing pages)
6. **Identifies chapters** and flags uncertain ones for confirmation

Output is saved to `backend/best-frames/ocr_output.txt`.
Chapter files are saved to `backend/best-frames/chapters/`.
Metadata (including page info) is in `backend/best-frames/chapters/chapters.json`.

### Understanding the Output

The pipeline will display:
- **Page range**: Which pages were detected (e.g., "Pages 1-45")
- **Missing pages warning**: Gaps in the page sequence that may indicate skipped pages
- **Confirmed chapters**: Chapters with clearly readable titles
- **Uncertain chapters**: Chapter markers found but titles corrupted by OCR noise

**When uncertain chapters are found**, ask the user to confirm:
1. What the chapter title should be
2. Whether the chapter number is correct
3. If any chapters are missing entirely from the video

**Rotation options:** If the video was recorded on a phone held sideways:
- `90` - Rotate 90° clockwise
- `180` - Rotate 180°
- `270` - Rotate 90° counter-clockwise

Example:
```bash
cd backend && npx tsx src/test-video-ocr.ts /path/to/video.mov 270
```

### Manual Pipeline (if you need more control)

**Step 1:** Extract frames
```bash
cd backend && npx tsx src/test-ffmpeg.ts /path/to/video.mov [rotation]
```

**Step 2:** Run OCR on all frames
```bash
cd backend && npx tsx src/test-ocr.ts
```

Output: `test-frames/ocr_output.txt`

### Use the OCR output as input
The `ocr_output.txt` file contains the raw text ready for cleanup below.

### Output location
- **Chapter text files**: Save to `data/generated/` for reuse
  - Format: `{book-name}-chapter{N}-text.txt`
  - Example: `data/generated/harry-potter-chapter6-text.txt`
- **Reading question JSON files**: Save to `data/generated/`
  - Format: `{book-name}-chapter{N}-reading.json`
  - For multiple question sets: `{book-name}-chapter{N}-reading-v2.json`, etc.

**After running OCR, always copy the chapter text to data/generated:**
```bash
cp backend/best-frames/chapters/chapter_01.txt data/generated/{book-name}-chapter{N}-text.txt
```

This allows generating multiple question sets without re-running OCR.

---

## Input Required
- **raw_text**: The OCR output from all pages (or from `ocr_output.txt` after video processing)
- **book_title**: Name of the book

## Output Format (JSON)

The `chapters.json` metadata file includes:

```json
{
  "totalChapters": 8,
  "hasChapters": true,
  "pageRange": { "start": 5, "end": 48 },
  "pageGaps": [
    { "afterPage": 12, "beforePage": 16, "missingCount": 3 }
  ],
  "uncertainChapters": [
    {
      "chapterNumber": 3,
      "possibleTitle": "DEN GYL...",
      "confidence": "medium",
      "reason": "Title partially readable but may be incomplete",
      "nearPage": 15
    }
  ],
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Pippi flyttar in i Villa Villekulla",
      "textLength": 2500,
      "pageStart": 5,
      "pageEnd": 18,
      "file": "chapter_01.txt"
    }
  ]
}
```

**Key fields:**
- `pageRange`: First and last page numbers detected
- `pageGaps`: Sequences of missing pages (may indicate skipped content)
- `uncertainChapters`: Chapters found but needing user confirmation

## OCR Cleanup Tasks

1. **Fix common OCR errors:**
   - `rn` → `m` (common misread)
   - `l` → `I` or `1` depending on context
   - `0` → `O` in words
   - Join hyphenated words at line breaks

2. **Paragraph formatting:**
   - Merge lines into paragraphs
   - Preserve intentional line breaks (dialogue, poetry)
   - Remove page numbers and headers

3. **Swedish-specific fixes:**
   - Ensure å, ä, ö are correct
   - Fix common Swedish OCR errors:
     - `a` → `å` or `ä` when appropriate
     - `o` → `ö` when appropriate

4. **Chapter detection:**
   - Look for "Kapitel X" or "KAPITEL X"
   - Look for numbered chapters (1., 2., etc.)
   - Look for titled chapters in larger/bold font (may show as ALL CAPS)

## Example OCR Cleanup

**Before (raw OCR):**
```
KAPITEL 1
Pippi f lyttar in i Villa Villekul la

Det lag en gammal förfallen
tradgard och i tradgarden lag ett
gammalt hus, och i huset bodde Pip-
pi Langstrump.
```

**After (cleaned):**
```
Det låg en gammal förfallen trädgård och i trädgården låg ett gammalt hus, och i huset bodde Pippi Långstrump.
```

## Important Notes

1. **Preserve the story**: Don't summarize, keep full text
2. **Fix obvious errors**: But don't change author's style
3. **Identify chapters**: Even if formatting is unclear
4. **Note page numbers**: If visible in OCR, track them
5. **Flag uncertainty**: If unsure about a word, note it with [?]
