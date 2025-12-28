# Generate Themed Reading Stories with Comprehension Questions

You are creating AI-generated short stories with reading comprehension questions for Swedish children.
This skill is for when you DON'T have a book - you'll create original fiction based on themes.

## When to Use This Skill

Use `generate-themed-reading` when:
- User wants reading comprehension questions but has NO book
- User specifies themes (e.g., "pokemon äventyr", "zebror och magi")
- User wants customized, AI-generated content

Use `generate-reading` (the OTHER skill) when:
- User has an actual book (Harry Potter, Robin Hood, etc.)
- Text has been extracted via OCR

## Input Required

The user will specify:
- **grade_level**: 1-9 (årskurs)
- **total_problems**: Total number of questions across all stories
- **objectives**: LGR22 codes to cover (any combination of: SV-LITERAL, SV-INFERENCE, SV-MAIN-IDEA, SV-CHARACTER, SV-VOCABULARY)
- **themes**: List of theme strings (e.g., ["pokemon äventyr", "zebror och magi", "katter och magi"])
- **story_count**: How many separate stories to generate
- **questions_per_story**: Questions per story (total_problems = story_count × questions_per_story)

## Invocation Examples

```
Use generate-themed-reading skill for årskurs 6, 12 problems covering: SV-VOCABULARY, SV-MAIN-IDEA, SV-CHARACTER, SV-INFERENCE, themes: pokemon äventyr, zebror och magi, katter och magi, 3 stories, 4 questions per story
```

```
Use generate-themed-reading skill for årskurs 4, 10 problems covering: SV-LITERAL, SV-INFERENCE, themes: djur i skogen, rymden, 2 stories, 5 questions per story
```

```
Use generate-themed-reading skill for årskurs 3, 8 problems covering: SV-LITERAL, SV-VOCABULARY, SV-CHARACTER, themes: prinsessan och draken, 1 story, 8 questions per story
```

## Output Format (JSON)

Batch format with multiple packages (one per story/theme):

```json
{
  "batch": {
    "grade_level": 6,
    "global": true
  },
  "packages": [
    {
      "package": {
        "name": "Pokemon Äventyr",
        "grade_level": 6,
        "assignment_type": "reading",
        "description": "En kort berättelse om Pikachus mod",
        "story_text": "Det var en kylig höstmorgon när Pikachu och Ash vandrade genom Viridian-skogen...",
        "global": true
      },
      "problems": [
        {
          "question_text": "Var hittade Pikachu och Ash den lilla Eevee?",
          "correct_answer": "B",
          "answer_type": "multiple_choice",
          "options": [
            "A: I en grotta djupt inne i skogen",
            "B: Bakom en stor ek, fastnade i ett gammalt nät",
            "C: Uppe i ett träd där den hade klättrat upp",
            "D: Vid en å där den försökte dricka vatten"
          ],
          "difficulty": "easy",
          "lgr22_codes": ["SV-LITERAL"]
        },
        {
          "question_text": "Vad betyder ordet 'förtvivlat' när texten beskriver Eevees tjut?",
          "correct_answer": "C",
          "answer_type": "multiple_choice",
          "options": [
            "A: Ett glatt och upprött läte som visar glädje",
            "B: Ett tyst och knappt hörbart läte",
            "C: Ett hopplöst och desperat läte som visar nöd",
            "D: Ett argt och hotfullt läte som varnar fiender"
          ],
          "difficulty": "medium",
          "lgr22_codes": ["SV-VOCABULARY"]
        },
        {
          "question_text": "Vad visar Pikachus sätt att hjälpa Eevee om dess karaktär?",
          "correct_answer": "C",
          "answer_type": "multiple_choice",
          "options": [
            "A: Pikachu föredrar att alltid använda sin starkaste attack först",
            "B: Pikachu är rädd för att närma sig andra Pokemon",
            "C: Pikachu är empatisk och kan anpassa sitt sätt att hjälpa efter situationen",
            "D: Pikachu bryr sig bara om Pokemon som redan är dess vänner"
          ],
          "difficulty": "medium",
          "lgr22_codes": ["SV-CHARACTER"]
        },
        {
          "question_text": "Vilket huvudbudskap förmedlar berättelsen?",
          "correct_answer": "C",
          "answer_type": "multiple_choice",
          "options": [
            "A: Elektriska attacker är alltid det bästa sättet att lösa problem",
            "B: Man ska undvika rädda djur eftersom de kan vara farliga",
            "C: Medkänsla och tålamod kan vara kraftfullare än fysisk styrka",
            "D: Det är viktigt att samla bär för att ha tillräckligt med mat"
          ],
          "difficulty": "hard",
          "lgr22_codes": ["SV-MAIN-IDEA"]
        }
      ]
    }
  ]
}
```

## Story Requirements

### Length
- **150-250 words** in Swedish
- Approximately 10-15 sentences
- Long enough to support comprehension questions, short enough to keep attention

### Story Structure
- **Beginning**: Introduce character(s) and setting
- **Middle**: Present a problem, challenge, or interesting event
- **End**: Resolution or meaningful conclusion
- **Theme/Message**: Implicit lesson or insight (for SV-MAIN-IDEA questions)

### Content Guidelines
- **Age-appropriate**: Match vocabulary and concepts to årskurs
- **Engaging**: Use the theme creatively, add conflict/tension, interesting characters
- **Question-compatible**: Include elements needed for all question types:
  - Specific details (for SV-LITERAL)
  - Context-rich vocabulary (for SV-VOCABULARY)
  - Character motivations/feelings (for SV-CHARACTER)
  - Situations requiring inference (for SV-INFERENCE)
  - Clear theme or message (for SV-MAIN-IDEA)

### Grade-Level Story Complexity

**Årskurs 1-3** (Ages 7-9):
- Simple sentence structure (mostly subject-verb-object)
- Common vocabulary with 1-2 "challenge words"
- Clear, linear plot
- Obvious character emotions and motivations
- Concrete themes (friendship, helping others, trying your best)

**Årskurs 4-6** (Ages 10-12):
- Mix of simple and compound sentences
- Richer vocabulary, more descriptive language
- Plot with minor complexity (problem and solution)
- Subtle character development
- Abstract themes (courage, perseverance, understanding differences)

**Årskurs 7-9** (Ages 13-15):
- Complex sentence structures
- Advanced vocabulary
- Multi-layered plot or subtle conflict
- Nuanced character psychology
- Complex themes (identity, morality, societal issues)

## Question Distribution

### Difficulty Mix by Grade Level

**Årskurs 1-3**:
- Easy: 40%
- Medium: 40%
- Hard: 20%

**Årskurs 4-6**:
- Easy: 20%
- Medium: 60%
- Hard: 20%

**Årskurs 7-9**:
- Easy: 0%
- Medium: 60%
- Hard: 40%

### LGR22 Objective Distribution

Distribute the specified objectives evenly across questions:
- If 4 objectives and 4 questions: one objective per question
- If 3 objectives and 6 questions: use each objective twice
- If 5 objectives and 8 questions: prioritize the most important objectives
- Ensure variety - don't cluster the same objective together

## LGR22 Reading Objective Codes

### SV-LITERAL
Direct text comprehension - facts and details

**Question types:**
- Vem/Vad/Var/När questions: "Vem träffade Harry på tåget?"
- Sequence: "Vad hände först/sedan/sist?"
- Explicit details: "Vad hade Tommy med sig?"

**Difficulty**: Usually easy or medium

### SV-VOCABULARY
Word meaning in context

**Question types:**
- "Vad betyder ordet '[ord]' i texten?"
- "Vilket ord har samma betydelse som '[ord]'?"
- Understanding expressions or figurative language

**Requirements:**
- Choose a word that's challenging but deducible from context
- Wrong options should be plausible meanings
- Context in the story must support the correct answer

**Difficulty**: Usually medium

### SV-INFERENCE
Drawing conclusions from text

**Question types:**
- "Varför tror du att...?"
- "Vad kan vi förstå av...?"
- "Vad hände troligtvis...?"
- Cause and effect not explicitly stated

**Difficulty**: Usually medium or hard

### SV-CHARACTER
Character understanding and motivation

**Question types:**
- "Varför kände sig [karaktär]...?"
- "Vad visar detta om [karaktärs] personlighet?"
- "Hur förändrades [karaktär] under berättelsen?"

**Requirements:**
- Story must show character's actions, thoughts, or emotions
- Answer requires understanding motivation, not just facts

**Difficulty**: Usually medium

### SV-MAIN-IDEA
Main idea, theme, or message

**Question types:**
- "Vad handlar berättelsen egentligen om?"
- "Vilket budskap förmedlar berättelsen?"
- "Vilket tema utforskas?"

**Requirements:**
- Theme must be present but implicit (not directly stated)
- Requires synthesis of the whole story
- Wrong options should be partial/literal interpretations

**Difficulty**: Usually hard

## Question Requirements (Validation)

Every question MUST have:
- **question_text**: Non-empty string in Swedish (mandatory)
- **correct_answer**: Letter A/B/C/D (mandatory)
- **answer_type**: "multiple_choice" (mandatory for reading)
- **options**: Array of exactly 4 options with "A:", "B:", "C:", "D:" prefixes (mandatory)
- **difficulty**: "easy", "medium", or "hard" (mandatory)
- **lgr22_codes**: Array with at least one valid code (mandatory)

## Option Balance (CRITICAL)

**All options must be similar in length and detail level.**

The correct answer should NOT stand out by being:
- Noticeably longer or more detailed
- The only option with specific details
- More "complete" sounding than others

**BAD example** (correct answer B is obviously longer):
```
A: Han var arg
B: Han var rädd för vad breven representerade och ville hindra Harry från att få kontakt med avsändaren
C: Han var trött
D: Han var förvirrad
```

**GOOD example** (all options similar length):
```
A: Han var mest irriterad över allt praktiskt besvär breven orsakade
B: Han var livrädd för brevens avsändare och vad kontakt skulle innebära
C: Han var orolig för att Harry skulle bli besviken på brevens innehåll
D: Han ville skydda Harry från människor som kunde vara farliga för honom
```

## Distractor Strategy

Good distractors (wrong answers) are:
- Related to the story but incorrect
- Common misconceptions a child might have
- Partially correct statements (true detail but wrong conclusion)
- Details from other parts of the story (tests careful reading)

Avoid:
- Obviously silly or impossible answers
- Completely unrelated to the story
- Options that could also be correct (ambiguity)

## Workflow Steps

1. **Parse the user's request** - Extract grade level, objectives, themes, story count, questions per story

2. **Generate stories** - For each theme:
   - Create a 150-250 word story appropriate for the grade level
   - Ensure the story supports the required question types
   - Include the theme creatively

3. **Create questions** - For each story:
   - Generate the specified number of questions
   - Distribute the objectives across questions
   - Follow difficulty distribution for the grade level
   - Ensure all validation requirements are met
   - Balance option lengths

4. **Assemble JSON** - Create batch format with all packages

5. **Save output** - Save to `data/generated/themed-reading-arskurs{grade}-{YYYY-MM-DD}-{timestamp}.json`
   - Use format: `themed-reading-arskurs{grade}-{YYYY-MM-DD}-{HHMMSS}.json`
   - Example: `themed-reading-arskurs3-2025-12-28-143022.json`
   - This prevents overwriting if multiple runs happen on the same day

## Example Complete Package

See the Pokemon Äventyr example in the Output Format section above for a complete working example.

## Tips for High-Quality Stories

- **Hook the reader**: Start with action, dialogue, or intriguing situation
- **Show, don't tell**: Use character actions and dialogue to reveal personality
- **Sensory details**: Include sights, sounds, feelings to make it vivid
- **Age-appropriate conflict**: Challenges kids can relate to
- **Satisfying ending**: Resolution that ties to the theme
- **Vocabulary balance**: Mostly familiar words + a few challenges
- **Swedish language**: Natural Swedish phrasing, idioms when appropriate

## Common Mistakes to Avoid

1. ❌ Story too short (< 150 words) - Won't support enough questions
2. ❌ Story too long (> 300 words) - Loses attention, hard to read on screen
3. ❌ Correct answer stands out (longer, more detailed)
4. ❌ Questions reference details not in the story
5. ❌ Theme too obvious (defeats SV-MAIN-IDEA purpose)
6. ❌ Vocabulary question about a word that's too easy or not in story
7. ❌ Multiple objectives could apply to same question (be specific)
8. ❌ Forgetting to include story_text in the package object

## Validation Checklist

Before saving output, verify:
- ✅ All stories are 150-250 words
- ✅ story_text is in the package object (not just description)
- ✅ Total questions = story_count × questions_per_story
- ✅ All specified objectives are covered
- ✅ Difficulty distribution matches grade level
- ✅ Every question has all required fields
- ✅ All options are similar length
- ✅ LGR22 codes are valid (SV-LITERAL, SV-INFERENCE, SV-MAIN-IDEA, SV-CHARACTER, SV-VOCABULARY)
- ✅ assignment_type is "reading" (NOT "math")
- ✅ Saved to data/generated/ directory
