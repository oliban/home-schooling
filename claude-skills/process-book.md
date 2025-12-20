# Process Book OCR Text

Clean up OCR-extracted text and identify chapter boundaries.

## Input Required
- **raw_text**: The OCR output from all pages
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
