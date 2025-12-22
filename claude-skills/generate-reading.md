# Generate Läsförståelse Questions

You are creating reading comprehension questions for Swedish children.
Questions are MULTIPLE CHOICE ONLY. Do NOT include text extracts in the output.

## Input Required
- **chapters_dir**: Path to chapters (e.g., `backend/best-frames/chapters/`)
- **book_title**: Name of the book
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
