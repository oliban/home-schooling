# Interactive Läsförståelse from Book Images

Interactive wrapper for generating reading comprehension questions from a zip file of book page images.
This skill handles OCR processing and user interaction, then delegates to the `generate-reading` skill for question generation.

## Invocation

```
/läsförståelse path/to/book.zip
```

## Workflow

### Step 1: Validate Input

Extract and validate the zip file path from the user's command:
- Ensure path is provided
- Verify file exists
- Check it has `.zip` extension

### Step 2: Gather Parameters Interactively

Use `AskUserQuestion` to gather:

1. **Book title**: For naming output files (e.g., "Harry Potter")
2. **Grade level (årskurs)**: 1-9
3. **Questions per chapter**: How many questions to generate per chapter (suggest 5 as default)
4. **LGR objectives**:
   - Default/Recommended: "mixed" (naturally cover different codes based on content)
   - Alternative: User can specify specific codes (e.g., "SV-LITERAL, SV-INFERENCE, SV-CHARACTER")

### Step 3: Run OCR Processing

Execute the OCR script:

```bash
cd backend && npx tsx src/process-zip-ocr.ts [zip-path]
```

This will:
- Extract and process images from the zip
- Run Tesseract OCR with Swedish language pack
- Detect chapter boundaries
- Output to `backend/best-frames/chapters/chapter_XX.txt`

### Step 4: Copy Chapter Text for Reuse

Copy extracted chapter text to `data/generated/` for future reuse:

```bash
cp backend/best-frames/chapters/chapter_01.txt data/generated/{book-name}-chapter1-text.txt
cp backend/best-frames/chapters/chapter_02.txt data/generated/{book-name}-chapter2-text.txt
# ... for all chapters
```

Replace `{book-name}` with slugified book title (lowercase, spaces to hyphens).

### Step 5: Delegate to generate-reading Skill

Now use the existing `generate-reading` skill with these parameters:
- `chapters_dir`: `backend/best-frames/chapters/`
- `book_title`: User-provided book title
- `grade_level`: User-provided grade

**IMPORTANT OVERRIDES:**

1. **Question Count**: Generate the user-specified number of questions per chapter (not the default 5).

   Calculate difficulty distribution:
   - **Årskurs 1-3**: `floor(N * 0.4)` easy, `floor(N * 0.4)` medium, remaining hard
   - **Årskurs 4-6**: `floor(N * 0.2)` easy, `floor(N * 0.6)` medium, remaining hard
   - **Årskurs 7-9**: `0` easy, `floor(N * 0.6)` medium, remaining hard

   Examples:
   - 8 questions, årskurs 3: 3 easy, 3 medium, 2 hard
   - 10 questions, årskurs 5: 2 easy, 6 medium, 2 hard

2. **LGR Objectives**:
   - If user chose "mixed": Naturally cover different LGR codes based on content (don't force all 5 codes)
   - If user specified codes: Focus questions on those specific codes, distribute evenly

The `generate-reading` skill will handle:
- Reading all chapter text files
- Generating questions following LGR 22 curriculum
- Creating batch format JSON output
- Saving to `data/generated/{book-name}-reading.json`

## Example Usage

```
User: /läsförståelse ../books/harry-potter-kap1.zip

[Interactive prompts]
- Book title? Harry Potter och de vises sten
- Grade level? 4
- Questions per chapter? 8
- LGR objectives? mixed

[OCR processing runs]
[Questions generated via generate-reading skill]
[Output saved to data/generated/harry-potter-och-de-vises-sten-reading.json]
```

## Notes

- This is a wrapper skill - all question generation logic lives in `generate-reading.md`
- The wrapper only handles: input validation, interactive prompts, OCR execution, delegation
- Output format, validation rules, and question quality guidelines come from `generate-reading` skill
