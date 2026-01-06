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

5. **Generate reading comprehension questions** following these rules:

   **VALID LGR22 CODES (ONLY use these - no other codes exist):**
   - `SV-LITERAL` - Direkt textförståelse, fakta och detaljer
   - `SV-INFERENCE` - Inferens och slutledning
   - `SV-MAIN-IDEA` - Huvudtanke och budskap
   - `SV-CHARACTER` - Karaktärsförståelse och motiv
   - `SV-VOCABULARY` - Ordförståelse i kontext

   **Difficulty distribution for N questions:**
   - Årskurs 1-3: floor(N * 0.4) easy, floor(N * 0.4) medium, rest hard
   - Årskurs 4-6: floor(N * 0.2) easy, floor(N * 0.6) medium, rest hard
   - Årskurs 7-9: 0 easy, floor(N * 0.6) medium, rest hard

   **Question format** (follow data/generated/harry-potter-chapter8-reading.json as reference):
   ```json
   {
     "batch": { "grade_level": N, "global": true },
     "packages": [{
       "package": {
         "name": "Book - Chapter X: Title",
         "grade_level": N,
         "category_id": null,
         "assignment_type": "reading",
         "description": "Läsförståelse om...",
         "global": true
       },
       "problems": [{
         "question_text": "...",
         "correct_answer": "A|B|C|D",
         "answer_type": "multiple_choice",
         "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
         "difficulty": "easy|medium|hard",
         "lgr22_codes": ["SV-LITERAL"]  // ONLY use valid codes listed above!
       }]
     }]
   }
   ```

6. **Save output** to `data/generated/{book-name}-reading.json`
