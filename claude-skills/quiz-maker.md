# Quiz Maker

You are creating topic-based quizzes for Swedish children. Quizzes are MULTIPLE CHOICE ONLY with context introductions.

## Overview

This skill generates educational quizzes on ANY topic (Buddhism, dinosaurs, space, Vikings, etc.) for Swedish children. It uses web research to gather accurate information and creates grade-appropriate multiple-choice questions.

## Input Required

- **topic** (required): The subject to quiz on (e.g., "Buddhism", "dinosaurier", "rymden", "vikingar")
- **grade_level** (required): 1-9 (årskurs)
- **question_count** (required): Number of questions - must be 3, 5, or 10

## REQUIRED: Grade Level

**IMPORTANT: Before generating any problems, you MUST know the grade level (årskurs 1-9).**

If the user has not specified a grade level, ASK them before proceeding:
- "Vilken årskurs ska quizet vara för? (1-9)"
- "Which grade level should the quiz be for? (1-9)"

Do NOT generate questions without a confirmed grade level.

## Workflow

### Step 1: Research Phase (Parallel)

📢 Tell the user: *"Researching [topic] for grade [X] students..."*

Launch TWO research tasks in parallel:

**Task A: Web Research**
```
Use Task tool with subagent_type="oh-my-claudecode:researcher"

Prompt: Research [TOPIC] for Swedish children in grade [X].
- Find 15-20 interesting, age-appropriate facts
- Focus on key concepts, historical figures, important events
- Ensure factual accuracy from reliable sources
- Note any common misconceptions to avoid
```

**Task B: Curriculum Mapping**
```
Use Task tool with subagent_type="oh-my-claudecode:explore"

Prompt: Search the codebase for LGR22 curriculum objectives related to [TOPIC].
- Check curriculum_objectives table in backend/src/data/
- Look for related subject codes:
  - Religion topics → RE (religionskunskap)
  - Nature/animals → NO-BIO (biologi)
  - History topics → HI (historia)
  - Physics/space → NO-FYS (fysik)
  - Geography → GE (geografi)
  - Society/culture → SH (samhällskunskap)
- Return any matching objective codes, or state "No direct match found"
```

📢 When research completes, summarize:
```
Research complete:
✓ Gathered [N] facts about [topic]
✓ Key concepts: [list 3-5 main themes]
✓ LGR22 mapping: [codes found or "No direct curriculum match - will generate anyway"]
```

### Step 2: Generation Phase (Parallel Haiku)

📢 Tell the user: *"Generating candidate questions with 3 Haiku agents..."*

Launch 3 Haiku agents in parallel (single message, multiple Task tool calls):

```
Agent 1: Generate [N] questions focusing on basic facts and definitions
Agent 2: Generate [N] questions focusing on comparisons and relationships
Agent 3: Generate [N] questions focusing on applications and understanding
```

Where N = question_count (so for 5 questions, each agent generates 5 candidates = 15 total)

📢 When generation completes:
```
✓ All 3 Haiku batches complete
✓ Generated [3×N] candidate questions total
```

### Step 3: Selection Phase (Opus)

📢 Tell the user: *"Using Opus to select the best [question_count] questions..."*

Pass all candidates to Opus with selection criteria:
- Factual accuracy (verified against research)
- Grade appropriateness for target årskurs
- Difficulty balance: ~40% easy, 40% medium, 20% hard
- Option quality (all options similar length, no obvious answers)
- Swedish language quality
- Topic coverage variety

📢 When selection completes:
```
Selection complete:
✓ Selected [N] questions from [3×N] candidates
✓ Excluded [X] questions:
  - [reasons]
✓ Difficulty: [X] easy, [Y] medium, [Z] hard
```

### Step 4: Context Intro Generation

Generate a 2-4 sentence age-appropriate introduction paragraph about the topic in Swedish. This helps children understand what they're about to learn.

**Guidelines by grade:**
- Årskurs 1-3: Simple language, concrete examples, 2-3 sentences
- Årskurs 4-6: More detail, some historical context, 3-4 sentences
- Årskurs 7-9: Can include abstract concepts, broader context, 3-4 sentences

### Step 5: Save Output

📢 Tell the user: *"Saving quiz..."*

Save to `/data/generated/quiz-[topic]-[grade]-[YYYYMMDD].json`

## Output Format (JSON)

```json
{
  "package": {
    "name": "Quiz: Buddhism - Årskurs 4",
    "grade_level": 4,
    "category_id": "quiz",
    "assignment_type": "quiz",
    "description": "Ett quiz om Buddhism för årskurs 4",
    "story_text": "Buddhism är en av världens äldsta religioner. Den grundades för cirka 2500 år sedan i Indien av Siddharta Gautama, som senare kom att kallas Buddha. Buddhister tror på att man kan nå frid genom att följa Buddhas läror om medkänsla och visdom.",
    "global": true
  },
  "problems": [
    {
      "question_text": "Vad heter personen som grundade buddhismen?",
      "correct_answer": "B",
      "answer_type": "multiple_choice",
      "options": [
        "A: Jesus",
        "B: Siddharta Gautama",
        "C: Muhammed",
        "D: Konfucius"
      ],
      "difficulty": "easy",
      "explanation": "Siddharta Gautama, även känd som Buddha, grundade buddhismen för cirka 2500 år sedan i Indien.",
      "lgr22_codes": ["RE-01"],
      "topic": "Buddhism"
    }
  ],
  "metadata": {
    "generated_at": "YYYY-MM-DD",
    "generation_method": "parallel-selection",
    "topic": "Buddhism",
    "models": {
      "research": "claude-sonnet",
      "generation": "claude-haiku-4-5",
      "selection": "claude-opus-4-5"
    },
    "candidates_generated": 15,
    "candidates_selected": 5
  }
}
```

**Package fields:**
- `name`: "Quiz: [Topic] - Årskurs [N]"
- `grade_level`: 1-9 (årskurs)
- `category_id`: "quiz"
- `assignment_type`: "quiz" (REQUIRED - ensures proper categorization)
- `description`: Brief description in Swedish for parents
- `story_text`: Context introduction paragraph (reuses existing field)
- `global`: true = visible to all parents with children in this grade

**Problem fields:**
- `question_text`: The question in Swedish
- `correct_answer`: Letter only (A, B, C, or D)
- `answer_type`: Always "multiple_choice"
- `options`: Array of 4 options with "A:", "B:", "C:", "D:" prefixes
- `difficulty`: "easy", "medium", or "hard"
- `explanation`: REQUIRED - explains the correct answer
- `lgr22_codes`: Array of curriculum codes (or empty if no match)
- `topic`: The quiz topic

## Validation Rules

### Multiple Choice Format (CRITICAL)

**VALIDATION RULES for ALL questions:**

0. **`options` array is REQUIRED**
   - Must have exactly 4 options (A, B, C, D)
   - Without options, the question CANNOT be displayed

1. **`correct_answer` must be ONLY the letter** (A, B, C, or D)
   - ✅ CORRECT: `"correct_answer": "B"`
   - ❌ WRONG: `"correct_answer": "B: Siddharta Gautama"`
   - ❌ WRONG: `"correct_answer": "Siddharta Gautama"`

2. **The letter must match an option**
   - The import will reject problems where the answer doesn't match

3. **Options must start with letter:space format**
   - ✅ CORRECT: `"A: Buddha"`, `"B: Jesus"`
   - ❌ WRONG: `"Buddha"`, `"A) Buddha"`

4. **`explanation` is REQUIRED for every question**
   - Explains why the correct answer is correct
   - Educational value for the child

### Option Balance (IMPORTANT)

**All options must be similar in length and detail level.** The correct answer should NOT stand out by being:
- Noticeably longer or more detailed than other options
- The only option with specific details
- More "complete" sounding than the others

**Rule of thumb:** If you can identify the correct answer just by looking at option lengths, rewrite the options.

### Difficulty Distribution

Aim for this balance regardless of question count:
- ~40% easy (basic recall, definitions)
- ~40% medium (understanding, simple inference)
- ~20% hard (application, analysis)

| Questions | Easy | Medium | Hard |
|-----------|------|--------|------|
| 3 | 1 | 1 | 1 |
| 5 | 2 | 2 | 1 |
| 10 | 4 | 4 | 2 |

## Grade-Appropriate Content Guidelines

### Årskurs 1-3 (Ages 7-9)
- Use simple, concrete language
- Focus on basic facts and definitions
- Avoid abstract concepts
- Use familiar comparisons
- Short question texts

**Example:**
```json
{
  "question_text": "Vad är en dinosaurie?",
  "options": [
    "A: Ett djur som lever idag",
    "B: Ett stort djur som levde för länge sedan",
    "C: En sorts fågel",
    "D: En sorts fisk"
  ],
  "difficulty": "easy"
}
```

### Årskurs 4-6 (Ages 10-12)
- More detailed information
- Can include dates and numbers
- Simple cause-and-effect relationships
- Historical context acceptable

**Example:**
```json
{
  "question_text": "Varför dog dinosaurierna ut för cirka 66 miljoner år sedan?",
  "options": [
    "A: De frös ihjäl under en istid",
    "B: En stor asteroid träffade jorden och förändrade klimatet",
    "C: De jagades av människor",
    "D: De hade inte tillräckligt med mat"
  ],
  "difficulty": "medium"
}
```

### Årskurs 7-9 (Ages 13-15)
- Complex concepts acceptable
- Can include analysis and interpretation
- Scientific terminology allowed
- Multiple factors and perspectives

**Example:**
```json
{
  "question_text": "Vilken vetenskaplig teori förklarar bäst dinosauriernas utdöende?",
  "options": [
    "A: Gradvis klimatförändring över miljontals år",
    "B: Chicxulub-asteroidens nedslag kombinerat med vulkanisk aktivitet",
    "C: Konkurrens med tidiga däggdjur om resurser",
    "D: Spridning av sjukdomar från nya arter"
  ],
  "difficulty": "hard"
}
```

## LGR22 Curriculum Mapping

When mapping topics to curriculum codes, use these subject prefixes:

| Subject | Code Prefix | Topics |
|---------|-------------|--------|
| Religionskunskap | RE | Buddhism, Christianity, Islam, Judaism, etc. |
| Biologi | NO-BIO | Animals, plants, ecosystems, human body |
| Fysik | NO-FYS | Space, forces, energy, matter |
| Kemi | NO-KEM | Elements, reactions, materials |
| Historia | HI | Vikings, ancient civilizations, wars, inventions |
| Geografi | GE | Countries, climate, natural resources |
| Samhällskunskap | SH | Government, rights, society |

**If no direct curriculum match exists:**
- Still generate the quiz
- Leave `lgr22_codes` as empty array `[]` or use closest match
- Note in summary: "No direct LGR22 match - quiz generated for general knowledge"

## Common Topic Mappings

| Topic | Likely LGR22 Subject |
|-------|---------------------|
| Buddhism, Islam, Christianity | RE (Religion) |
| Dinosaurier, djur, växter | NO-BIO (Biology) |
| Rymden, planeter, stjärnor | NO-FYS (Physics) |
| Vikingar, romarriket | HI (History) |
| Länder, kontinenter | GE (Geography) |
| Demokrati, rättigheter | SH (Social studies) |

## Example Prompts for Agents

### Haiku Generation Prompt

```
Generate [N] Swedish quiz questions about [TOPIC] for årskurs [X].

Facts from research:
[paste key facts]

Focus: [basic facts / comparisons / understanding]

Output JSON:
{
  "batch": 1,
  "problems": [{
    "id": "H1-01",
    "question_text": "...",
    "correct_answer": "A|B|C|D",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "difficulty": "easy|medium|hard",
    "explanation": "..."
  }]
}

Rules:
- All text in Swedish
- All options similar length
- Factually accurate based on research
- Age-appropriate for grade [X]
- Include explanation for each question
```

### Opus Selection Prompt

```
Review [N] candidate quiz questions about [TOPIC] for årskurs [X].

Research facts (verify against):
[key facts]

Select best [M] questions based on:
1. Factual accuracy (must match research)
2. Grade appropriateness for årskurs [X]
3. Difficulty balance: ~40% easy, 40% medium, 20% hard
4. Option balance (all similar length)
5. Topic coverage (variety of aspects)
6. Swedish language quality

Exclude questions with:
- Factual errors
- Age-inappropriate content
- Obviously longer correct answers
- Ambiguous wording
- Duplicate concepts

Output final JSON with selected questions.
```

## Important Notes

1. **Always write in Swedish** - all question text, options, explanations
2. **Explanations are REQUIRED** - every question must have one
3. **Save to `/data/generated/`** - use format `quiz-[topic]-[grade]-[YYYYMMDD].json`
4. **Save directly without asking** - just inform user when saved
5. **Context intro uses `story_text` field** - this is reused from reading packages
6. **Never include model names in descriptions** - keep parent-facing text clean
7. **Research first, generate second** - accuracy depends on good research

## Output Location

Save generated JSON files to `data/generated/`. **Save directly without asking for permission** - just inform the user when the file is saved.

Use filename format: `quiz-{topic}-{grade}-{YYYYMMDD}.json`
- Example: `quiz-buddhism-4-20260201.json`
- Example: `quiz-dinosaurier-3-20260201.json`

## Summary Template

After completion, show:
```
✓ Quiz saved: /data/generated/quiz-[topic]-[grade]-[date].json

Quiz: [Topic] - Årskurs [N]
Questions: [count]
Difficulty: [X] easy, [Y] medium, [Z] hard
LGR22 codes: [codes or "General knowledge"]

To import: Use the packages import endpoint or admin UI
```
