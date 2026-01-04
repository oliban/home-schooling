Process the zip file at path: $ARGUMENTS

This zip file contains images of book pages. Follow these steps:

1. **Validate the zip file exists** at the given path

2. **Ask the user interactively** using AskUserQuestion for:
   - Book title (for naming output files)
   - Grade level (årskurs 1-9)
   - How many questions per chapter (suggest 5 as default)
   - LGR objectives: suggest "mixed" (natural mix based on content) but allow manual specification of codes like "SV-LITERAL, SV-INFERENCE, SV-CHARACTER"

3. **Run OCR processing**:
   ```bash
   cd backend && npx tsx src/process-zip-ocr.ts "[zip-path]"
   ```

4. **Copy chapter text** to data/generated/ for reuse:
   ```bash
   cp backend/best-frames/chapters/chapter_XX.txt data/generated/{book-name}-chapter{N}-text.txt
   ```

5. **Use the generate-reading skill** to create questions with these overrides:
   - Generate the user-specified number of questions (not the default 5)
   - Difficulty distribution for the question count N:
     - Årskurs 1-3: floor(N * 0.4) easy, floor(N * 0.4) medium, rest hard
     - Årskurs 4-6: floor(N * 0.2) easy, floor(N * 0.6) medium, rest hard
     - Årskurs 7-9: 0 easy, floor(N * 0.6) medium, rest hard
   - Use mixed LGR objectives or the user-specified codes

6. **Save output** to `data/generated/{book-name}-reading.json`
