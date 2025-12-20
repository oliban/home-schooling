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

Output is saved to `backend/best-frames/ocr_output.txt`.

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
Save generated reading question JSON files to `data/generated/`

---

## Input Required
- **raw_text**: The OCR output from all pages (or from `ocr_output.txt` after video processing)
- **book_title**: Name of the book

## Output Format (JSON)

```json
{
  "book_title": "Pippi Långstrump",
  "author": "Astrid Lindgren",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Pippi flyttar in i Villa Villekulla",
      "cleaned_text": "Det låg en gammal förfallen trädgård...",
      "page_start": 5,
      "page_end": 18
    },
    {
      "chapter_number": 2,
      "title": "Pippi är sakletare och råkar i slagsmål",
      "cleaned_text": "Nästa morgon vaknade Tommy och Annika...",
      "page_start": 19,
      "page_end": 32
    }
  ]
}
```

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
