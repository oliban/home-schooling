# Generate Läsförståelse Questions

You are creating reading comprehension questions for Swedish children.
Questions are MULTIPLE CHOICE ONLY. Do NOT include text extracts in the output.

## Workflow Options

### Option 1: Reuse Existing Text (Recommended for multiple question sets)

If you already have extracted text from a previous OCR run:

1. **Check for existing text**: Look in `data/generated/` for files like `{book-name}-chapter{N}-text.txt`
2. **Read the text file**: Use the existing text directly
3. **Generate new questions**: Create questions based on the saved text
4. **Save questions**: Save to `data/generated/{book-name}-chapter{N}-reading-v{N}.json`

**Example:**
```bash
# Check if text already exists
ls data/generated/harry-potter-chapter6-text.txt

# If it exists, just read it and generate new questions
# No need to run OCR again!
```

### Option 2: New OCR Run (For first-time processing)

If processing a new chapter/book:

1. **Run OCR**: Use `process-zip-ocr.ts` or `test-video-ocr.ts` (see process-book skill)
2. **Copy text to data/generated**: Save chapter text for future reuse
   ```bash
   cp backend/best-frames/chapters/chapter_01.txt data/generated/{book-name}-chapter{N}-text.txt
   ```
3. **Generate questions**: Create questions from the chapter text
4. **Save everything**: Both text and questions are now saved in `data/generated/`

**IMPORTANT**: Always save a copy of the chapter text to `data/generated/` after OCR so it can be reused for generating multiple question sets without re-running OCR.

## Input Required
- **text_file** OR **chapters_dir**: Path to saved text file (e.g., `data/generated/harry-potter-chapter6-text.txt`) OR path to chapters directory (e.g., `backend/best-frames/chapters/`)
- **book_title**: Name of the book
- **chapter_number**: Chapter number (for naming output files)
- **grade_level**: 1-9 (årskurs)

## Output Format (JSON)

### Batch Format (all chapters in one file)

Use this format when generating reading questions for an entire book:

```json
{
  "batch": {
    "grade_level": 3,
    "global": true
  },
  "packages": [
    {
      "package": {
        "name": "Robin Hood - Kapitel 1: De Fredlösa",
        "grade_level": 3,
        "category_id": null,
        "assignment_type": "reading",
        "description": "Läsförståelse om hur Robin Hood blev fredlös",
        "global": true
      },
      "problems": [
        {
          "question_text": "Varför blev Robin Hood fredlös?",
          "correct_answer": "B",
          "answer_type": "multiple_choice",
          "options": [
            "A: Han stal pengar från kungen",
            "B: Han dödade en av kungens hjortar",
            "C: Han vägrade betala skatt",
            "D: Han hjälpte en fånge att fly"
          ],
          "difficulty": "easy",
          "lgr22_codes": ["SV-LITERAL"]
        }
      ]
    },
    {
      "package": {
        "name": "Robin Hood - Kapitel 2: Lille John",
        "grade_level": 3,
        "category_id": null,
        "assignment_type": "reading",
        "description": "Läsförståelse om när Robin möter Lille John",
        "global": true
      },
      "problems": [
        {
          "question_text": "Hur träffade Robin Hood Lille John?",
          "correct_answer": "C",
          "answer_type": "multiple_choice",
          "options": [
            "A: De möttes på ett värdshus",
            "B: Lille John var en av kungens soldater",
            "C: De slogs på en bro över en bäck",
            "D: Lille John kom till skogen för att gömma sig"
          ],
          "difficulty": "medium",
          "lgr22_codes": ["SV-LITERAL"]
        }
      ]
    }
  ]
}
```

**IMPORTANT**: The `batch` wrapper is required by the frontend. It contains:
- `grade_level`: The default grade level for all packages
- `global`: Whether packages should be visible to all parents (true for book content)

**Save to:** `data/generated/{book-name}-reading.json`

**Package fields:**
- `name`: Descriptive name (book + chapter)
- `grade_level`: 1-9 (årskurs)
- `category_id`: null (for reading)
- `assignment_type`: "reading" (REQUIRED - ensures it appears in reading category, not math)
- `description`: Brief description of the chapter content
- `global`: true = visible to all parents

**Problem fields:**
- `question_text`: The question in Swedish
- `correct_answer`: Letter (A, B, C, or D)
- `answer_type`: Always "multiple_choice" for reading
- `options`: Array of 4 options with "A:", "B:", "C:", "D:" prefixes
- `difficulty`: "easy", "medium", or "hard"
- `lgr22_codes`: Array of reading objective codes (see reference below)

**Output location:** Save generated JSON files to `data/generated/`. **Save directly without asking for permission** - just inform the user when the file is saved.

## Always Generate Exactly 5 Questions

Mix difficulties based on grade level:
- **Årskurs 1-3**: 2 easy, 2 medium, 1 hard
- **Årskurs 4-6**: 1 easy, 3 medium, 1 hard
- **Årskurs 7-9**: 0 easy, 3 medium, 2 hard

## Question Types by Grade Level

### Årskurs 1-3 (Ages 7-9)
Focus on literal comprehension:
- **Who**: Vem gjorde...? Vilka var med?
- **What**: Vad hände? Vad gjorde [karaktär]?
- **Where**: Var utspelar sig berättelsen?
- **Sequence**: Vad hände först/sen/sist?
- **Simple inference**: Varför tror du att...?

**Example questions:**
- Vem träffade Pippi i skogen?
- Vad hade Tommy med sig?
- Var bodde familjen?

### Årskurs 4-6 (Ages 10-12)
Add interpretive comprehension:
- **Why**: Varför agerade karaktären så?
- **Inference**: Vad kan man förstå av...?
- **Character motivation**: Varför kände sig [karaktär] ledsen?
- **Theme hints**: Vad handlar kapitlet egentligen om?
- **Predictions**: Vad tror du händer härnäst?

**Example questions:**
- Varför valde Emil att gömma sig?
- Vad säger detta om Emils personlighet?
- Hur kände sig mamma när hon hittade Emil?

### Årskurs 7-9 (Ages 13-15)
Include critical analysis:
- **Theme identification**: Vilket tema utforskas?
- **Author's purpose**: Varför skrev författaren så?
- **Compare/contrast**: Hur skiljer sig...?
- **Symbolism**: Vad kan [objekt] symbolisera?
- **Critical evaluation**: Håller du med om...?

**Example questions:**
- Vilket tema utforskar författaren i detta kapitel?
- Varför valde författaren att berätta ur detta perspektiv?
- Hur utvecklas relationen mellan karaktärerna?

## REQUIRED FIELDS (Validation)

**The import will FAIL if these fields are missing or empty:**

Every problem MUST have:
- `question_text`: Non-empty string (the question in Swedish)
- `correct_answer`: Non-empty string (A, B, C, or D)
- `answer_type`: "multiple_choice" (required for reading)
- `options`: Array with at least 2 items (usually 4: A, B, C, D)

### Multiple Choice Format (CRITICAL)

For ALL reading questions, you MUST follow this exact format:

```json
{
  "answer_type": "multiple_choice",
  "options": ["A: Han var arg", "B: Han var ledsen", "C: Han var glad", "D: Han var rädd"],
  "correct_answer": "B"
}
```

**VALIDATION RULES:**

1. **`correct_answer` must be ONLY the letter** (A, B, C, or D), NOT the full text
   - ✅ CORRECT: `"correct_answer": "C"`
   - ❌ WRONG: `"correct_answer": "C: Han var glad"`
   - ❌ WRONG: `"correct_answer": "Han var glad"`

2. **The letter in `correct_answer` must match an option**
   - If options are A, B, C, D → correct_answer must be one of A, B, C, D
   - The import will reject problems where the answer doesn't match any option

3. **Self-check before generating**: For each question, verify:
   - The correct answer letter matches the option with the correct content
   - Example: If the answer is "Han var ledsen" and it's option B, then `correct_answer: "B"`

**Example of VALID problem:**
```json
{
  "question_text": "Vem träffade Pippi i skogen?",
  "correct_answer": "B",
  "answer_type": "multiple_choice",
  "options": [
    "A: En björn",
    "B: Tommy och Annika",
    "C: Hennes pappa",
    "D: En polis"
  ],
  "difficulty": "easy",
  "lgr22_codes": ["SV-LITERAL"]
}
```

**Example of INVALID problem (will be rejected):**
```json
{
  "question_text": "Vem träffade Pippi?",
  "correct_answer": "B",
  "answer_type": "multiple_choice"
}
```
This is invalid because `options` array is missing!

## Important Guidelines

1. **No text extracts**: The child has already read the chapter
2. **All Swedish**: Write everything in Swedish
3. **4 options always**: Label A, B, C, D
4. **One correct answer**: Make it unambiguous
5. **Plausible distractors**: Wrong answers should be believable
6. **Based on actual content**: Only ask about what's in the chapter

## Distractor Strategy

Good distractors are:
- Related to the text but incorrect
- Common misconceptions
- Partially correct statements
- Events from other chapters (if student didn't read carefully)

Avoid:
- Obviously silly answers
- Completely unrelated options
- Multiple correct answers

## Option Balance (IMPORTANT)

**All options must be similar in length and detail level.** The correct answer should NOT stand out by being:
- Noticeably longer or more detailed than other options
- The only option with specific details
- More "complete" sounding than the others

**BAD example (correct answer B is obviously longer):**
```
A: Han var arg
B: Han var rädd för vad breven representerade och ville hindra Harry från att få kontakt med avsändaren
C: Han var trött
D: Han var förvirrad
```

**GOOD example (all options similar length):**
```
A: Han var mest irriterad över allt praktiskt besvär breven orsakade
B: Han var livrädd för brevens avsändare och vad kontakt skulle innebära
C: Han var orolig för att Harry skulle bli besviken på brevens innehåll
D: Han ville skydda Harry från människor som kunde vara farliga för honom
```

**Rule of thumb:** If you can identify the correct answer just by looking at option lengths, rewrite the options.

## LGR 22 Reading Objective Codes

**REQUIRED:** Every question MUST include at least one objective code in `lgr22_codes`.

### Available Codes

| Code | Description | Use For |
|------|-------------|---------|
| SV-LITERAL | Direkt textförståelse - fakta och detaljer | Who/What/Where/When questions, sequence questions |
| SV-INFERENCE | Inferens och slutledning | Why/How questions, drawing conclusions |
| SV-MAIN-IDEA | Huvudtanke och budskap | Theme identification, main message, summary questions |
| SV-CHARACTER | Karaktärsförståelse och motiv | Character motivation, feelings, personality traits |
| SV-VOCABULARY | Ordförståelse i kontext | Word meaning questions, understanding expressions |

### Question Type to Code Mapping

| Question Type | Example | Code |
|---------------|---------|------|
| Vem/Vad/Var/När | "Vem träffade Harry på tåget?" | SV-LITERAL |
| Sekvens | "Vad hände först?" | SV-LITERAL |
| Varför/Hur | "Varför blev hon arg?" | SV-INFERENCE |
| Tema/Budskap | "Vad handlar kapitlet om?" | SV-MAIN-IDEA |
| Karaktär | "Varför kände sig Harry ledsen?" | SV-CHARACTER |
| Ordförståelse | "Vad betyder 'förbluffad' i texten?" | SV-VOCABULARY |

### Examples

```json
// Literal comprehension question
{
  "question_text": "Var bodde Harry innan han fick sitt brev?",
  "lgr22_codes": ["SV-LITERAL"]
}

// Inference question
{
  "question_text": "Varför behandlade familjen Dursley Harry så illa?",
  "lgr22_codes": ["SV-INFERENCE"]
}

// Character understanding question
{
  "question_text": "Hur förändrades Harrys känslor under kapitlet?",
  "lgr22_codes": ["SV-CHARACTER", "SV-INFERENCE"]
}

// Main idea question
{
  "question_text": "Vilket budskap förmedlar kapitlet om vänskap?",
  "lgr22_codes": ["SV-MAIN-IDEA"]
}
```

**Note:** Some questions may cover multiple skills. For example, understanding why a character felt a certain way involves both SV-CHARACTER and SV-INFERENCE.

## Hybrid Generation Workflow (Recommended for Production)

For best quality/cost ratio, use the **parallel-selection** hybrid approach:

### When to Use Hybrid
- Generating questions for longer chapters
- When you want variety in question types
- When curriculum code balance matters
- For production-quality content

### Workflow Steps (Be Verbose!)

**Step 1: Parallel Haiku Generation**

📢 Tell the user: *"Launching 2-3 Haiku agents in parallel to generate candidate questions..."*

Launch agents simultaneously (single message, multiple Task tool calls):
```
Agent 1: Focus on SV-LITERAL + SV-VOCABULARY (factual questions) - 5 questions
Agent 2: Focus on SV-INFERENCE + SV-CHARACTER (interpretive questions) - 5 questions
Agent 3: Focus on SV-MAIN-IDEA + mixed (thematic questions) - 5 questions
```

📢 When agents complete, tell the user:
```
✓ All Haiku batches complete
✓ Generated 15 candidate questions total
✓ Batch 1: 5 literal/vocabulary questions
✓ Batch 2: 5 inference/character questions
✓ Batch 3: 5 main-idea/mixed questions
```

**Step 2: Opus Selection**

📢 Tell the user: *"Now using Opus to review all 15 candidates and select the best 5..."*

Pass all candidates to Opus with explicit selection criteria:
- Select best 5 questions
- Ensure code balance (mix of literal, inference, character, main-idea)
- Difficulty distribution per grade level
- Verify answers match actual chapter content
- Check option balance (no obviously longer correct answers)
- Swedish language quality

📢 When selection completes, report to user:
```
Selection complete:
✓ Selected 5 questions from 15 candidates
✓ Excluded 10 questions:
  - 2 had obviously longer correct answers
  - 1 asked about content not in chapter
  - 1 had ambiguous correct answer
  - 6 duplicates/less engaging
✓ Fixed option lengths on question 3
✓ Distribution: 2 literal, 1 inference, 1 character, 1 main-idea
```

**Step 3: Save with Metadata**

📢 Tell the user: *"Saving final output..."*

Save directly to `/data/generated/` without asking permission.

📢 When done, show summary:
```
✓ Saved: /data/generated/harry-potter-chapter6-reading.json

Final Question Types:
| Code         | Count | Difficulty |
|--------------|-------|------------|
| SV-LITERAL   |   2   | easy, medium |
| SV-INFERENCE |   1   | medium |
| SV-CHARACTER |   1   | medium |
| SV-MAIN-IDEA |   1   | hard |

Cost: $0.018 (Haiku) + $0.025 (Opus) = $0.043 total
Time: ~7 seconds
```

Include generation metadata in output:
```json
"metadata": {
  "generated_at": "YYYY-MM-DD",
  "generation_method": "parallel-selection",
  "models": {
    "generation": "claude-haiku-4-5",
    "selection": "claude-opus-4-5"
  },
  "candidates_generated": 15,
  "candidates_selected": 5,
  "chapter_text_file": "data/generated/{book}-chapter{N}-text.txt"
}
```

### Performance Comparison

| Approach | Time | Cost | Quality |
|----------|------|------|---------|
| Pure Opus | ~8s | $0.15 | A- |
| Pure Haiku | ~3s | $0.006 | C+ |
| **Hybrid** | ~7s | $0.04 | **A** |

### Why Hybrid Works for Reading

1. **Haiku strength**: Good at extracting literal facts from text
2. **Haiku weakness**: Struggles with balanced options, may create obviously correct answers
3. **Opus strength**: Excellent at option balancing and verifying text accuracy
4. **Selection benefit**: Can discard questions where correct answer is too obvious

### Common Haiku Issues (What Opus Filters)

- ❌ Correct answer significantly longer than distractors
- ❌ Question about content not in the chapter
- ❌ Ambiguous questions with multiple valid answers
- ❌ Too easy questions (answer obvious without reading)
- ❌ Distractors that are obviously silly

### Example Prompt for Haiku Agents

```
Generate 5 Swedish reading comprehension questions for årskurs [N].

Book: [TITLE]
Chapter: [N]
Chapter text: [paste text or reference file]

Focus on: [SV-LITERAL + SV-VOCABULARY] OR [SV-INFERENCE + SV-CHARACTER]

Output JSON format:
{
  "batch": [1|2|3],
  "problems": [{
    "id": "H[batch]-01",
    "question_text": "...",
    "correct_answer": "A|B|C|D",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "lgr22_codes": ["SV-XXX"],
    "difficulty": "easy|medium|hard"
  }]
}

Rules:
- All options must be similar length
- Only ask about content in the chapter
- 4 options always (A, B, C, D)
```

### Example Prompt for Opus Selection

```
Review [N] reading comprehension questions for [BOOK] chapter [X].

Chapter text reference: [file path or summary]

Select best 5 questions based on:
1. Code balance: mix of SV-LITERAL, SV-INFERENCE, SV-CHARACTER, SV-MAIN-IDEA
2. Difficulty: [distribution based on grade]
3. Option balance: all options similar length
4. Text accuracy: answers must match chapter content
5. Question clarity: unambiguous single correct answer

Exclude questions where:
- Correct answer is obviously longer/more detailed
- Question asks about content not in chapter
- Multiple options could be correct
- Distractors are obviously wrong

Output final JSON with 5 selected questions.
```

## Description Guidelines

**IMPORTANT:** Package descriptions should be human-readable for parents.
- ✅ "Läsförståelse om hur Harry får sitt Hogwartsbrev"
- ❌ "5 questions generated with Haiku+Opus hybrid"

Never include model names (Haiku, Opus, Claude) in descriptions visible to parents.
