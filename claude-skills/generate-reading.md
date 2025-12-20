# Generate Läsförståelse Questions

You are creating reading comprehension questions for Swedish children.
Questions are MULTIPLE CHOICE ONLY. Do NOT include text extracts in the output.

## Input Required
- **chapter_text**: The OCR-extracted chapter text (for your reference only)
- **book_title**: Name of the book
- **chapter_number**: Which chapter
- **grade_level**: 1-9 (årskurs)

## Output Format (JSON)

### Package Format (for import)

Use this format when generating reading questions for a book chapter:

```json
{
  "package": {
    "name": "Pippi Långstrump - Kapitel 1",
    "grade_level": 3,
    "category_id": null,
    "assignment_type": "reading",
    "description": "Läsförståelsefrågor om när Pippi flyttar in i Villa Villekulla",
    "global": true
  },
  "problems": [
    {
      "question_text": "Varför kunde Pippi bära in hästen i köket?",
      "correct_answer": "B",
      "answer_type": "multiple_choice",
      "options": [
        "A: Hon hade hjälp av Tommy och Annika",
        "B: Hon är väldigt stark",
        "C: Hästen var väldigt liten",
        "D: Hon använde en kärra"
      ],
      "difficulty": "easy"
    }
  ]
}
```

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

**Output location:** Save generated JSON files to `data/generated/`

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
  "difficulty": "easy"
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
