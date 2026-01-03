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

**IMPORTANT**: Vary narrative structure across stories to avoid repetitive patterns. Don't make every story a problem-solution moral lesson.

**Structure Options** (rotate between these):

1. **Problem-Solution**: Character faces challenge → tries different approaches → overcomes it (use sparingly)
2. **Discovery/Wonder**: Character explores something new → makes observations → gains understanding or appreciation
3. **Humorous Misunderstanding**: Character misinterprets something → funny situations ensue → confusion cleared up (or not!)
4. **Unexpected Adventure**: Normal situation → surprising event → exciting developments → surprising conclusion
5. **Slice-of-Life**: Everyday activity shown in interesting detail → small moments → gentle conclusion (no big lesson)
6. **Mystery/Curiosity**: Something unusual → investigation → surprising explanation
7. **Fantasy/Imagination**: Magical or impossible scenario → creative developments → open or whimsical ending

**Ending Variety**:
- Not every story needs a moral lesson or neat resolution
- Some can end with wonder, laughter, surprise, or just a moment
- Twist endings are engaging for comprehension questions
- Open-ended conclusions work well

**Theme/Message**:
- Only include explicit moral lessons in ~30% of stories
- Other stories can have implicit themes or just be entertaining/interesting
- Humor, wonder, and fun are valuable without always teaching a lesson

### Content Guidelines
- **Age-appropriate**: Match vocabulary and concepts to årskurs
- **Engaging**: Use the theme creatively, add conflict/tension, interesting characters
- **Question-compatible**: Include elements needed for all question types:
  - Specific details (for SV-LITERAL)
  - Context-rich vocabulary (for SV-VOCABULARY)
  - Character motivations/feelings (for SV-CHARACTER)
  - Situations requiring inference (for SV-INFERENCE)
  - Clear theme or message (for SV-MAIN-IDEA)

### Maximizing Story Variety

**Character Diversity** (rotate these across stories):
- Human children (various ages, personalities, interests)
- Animals as protagonists (realistic or talking)
- Fantasy creatures (dragons, trolls, magical beings)
- Anthropomorphized objects (talking toys, vehicles, household items)
- Mix of character types in one story
- Different personality types: curious, cautious, silly, clever, grumpy, enthusiastic

**Tone/Genre Variety**:
- **Funny/Silly**: Absurd situations, playful language, unexpected humor
- **Exciting/Action**: Fast-paced events, adventures, narrow escapes
- **Mysterious**: Puzzles to solve, secrets to uncover, clues to follow
- **Magical/Fantastical**: Impossible things happen, imagination rules
- **Realistic/Relatable**: Everyday moments made interesting
- **Spooky-lite**: Mildly mysterious or eerie (age-appropriate, not scary)

**Setting Variety**:
- Nature: forest, beach, mountains, underwater, garden, park
- Urban: city, school, store, library, museum
- Home: different rooms, backyard, basement, attic
- Fantastical: space, magical lands, inside toys/games, miniature worlds
- Seasonal: emphasize different seasons and weather

**Avoid Repetitive Patterns**:
- Don't make every protagonist learn a lesson
- Don't always use sibling dynamics
- Don't always have an adult give wisdom at the end
- Don't always make characters succeed through perseverance
- Vary whether conflicts are internal (feelings) or external (events)
- Mix solo protagonists with groups/pairs

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
   - **CRITICAL**: When generating multiple stories in one batch, ensure MAXIMUM VARIETY:
     - Use different narrative structures (problem-solution, discovery, humor, mystery, etc.)
     - Use different character types (kids, animals, fantasy creatures, objects)
     - Use different tones (funny, exciting, mysterious, realistic, magical)
     - Mix up protagonist dynamics (solo, siblings, friends, groups, etc.)
     - Vary endings (resolution, surprise, wonder, humor, open-ended)
     - Only ~1 out of 3 stories should have an explicit moral lesson

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
- **Age-appropriate conflict**: Challenges kids can relate to (but not always a moral lesson!)
- **Varied endings**: Sometimes neat resolution, sometimes surprise, sometimes wonder, sometimes just a moment
- **Vocabulary balance**: Mostly familiar words + a few challenges
- **Swedish language**: Natural Swedish phrasing, idioms when appropriate
- **Embrace different tones**: Funny stories can be just funny, mysterious stories just mysterious - not everything needs to be wholesome
- **Mix character types**: Rotate between human kids, animals, fantasy creatures, objects
- **Vary narrative voice**: Some playful, some matter-of-fact, some mysterious, some excited

## Common Mistakes to Avoid

1. ❌ Story too short (< 150 words) - Won't support enough questions
2. ❌ Story too long (> 300 words) - Loses attention, hard to read on screen
3. ❌ Correct answer stands out (longer, more detailed)
4. ❌ Questions reference details not in the story
5. ❌ Theme too obvious (defeats SV-MAIN-IDEA purpose)
6. ❌ Vocabulary question about a word that's too easy or not in story
7. ❌ Multiple objectives could apply to same question (be specific)
8. ❌ Forgetting to include story_text in the package object
9. ❌ **ALL STORIES FOLLOW THE SAME PATTERN** - This is the biggest problem! Vary structure, characters, tone, and endings
10. ❌ Every story has a moral lesson - Let stories be fun, mysterious, or silly without always teaching something
11. ❌ All protagonists are children with siblings - Use animals, fantasy creatures, solo characters, groups, different dynamics
12. ❌ Every story is wholesome - Kids enjoy humor, mystery, and adventure too

## Validation Checklist

Before saving output, verify:

**Technical Requirements:**
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

**Variety Requirements** (when generating multiple stories):
- ✅ Stories use DIFFERENT narrative structures (not all problem-solution)
- ✅ Stories have DIFFERENT character types (mix of kids, animals, fantasy, objects)
- ✅ Stories have DIFFERENT tones (funny, mysterious, exciting, realistic, magical)
- ✅ Stories have DIFFERENT endings (not all neat moral lessons)
- ✅ Maximum 1 out of 3 stories has an explicit moral lesson
- ✅ Not all protagonists are children with siblings
- ✅ At least one story should be primarily fun/entertaining without a teaching moment

## Hybrid Generation Workflow (Recommended for Production)

For best quality/cost ratio with maximum story variety, use the **parallel-selection** hybrid approach.

### When to Use Hybrid
- Generating 2+ stories for production use
- When story variety is critical (avoiding repetitive patterns)
- When you want highest quality at reasonable cost

### Why Hybrid is Especially Good for Themed Reading

1. **Variety guarantee** - Each Haiku agent gets a DIFFERENT structure assignment
2. **Best-of-N stories** - Opus can select the most engaging stories from candidates
3. **Question polish** - Opus fixes option balance issues Haiku often creates
4. **Cost efficient** - 54% cheaper than pure Opus with equal or better quality

### Workflow Steps (Be Verbose!)

**Step 1: Parallel Haiku Generation with Structure Assignments**

📢 Tell the user: *"Launching 3 Haiku agents in parallel with different story structures..."*

Launch 3 Haiku agents simultaneously, each with a DIFFERENT structure assignment:
```
Agent 1: Structure = "problem-solution" or "humorous misunderstanding"
         Tone = funny/silly
         Characters = animals or fantasy creatures

Agent 2: Structure = "mystery/discovery" or "unexpected adventure"
         Tone = exciting/mysterious
         Characters = human children or mixed

Agent 3: Structure = "slice-of-life" or "fantasy/imagination"
         Tone = magical/wonder
         Characters = different from agents 1 & 2
```

Each agent generates: story (150-250 words) + questions for their assigned theme(s).

📢 When agents complete, tell the user:
```
✓ All 3 Haiku batches complete
✓ Generated 3 candidate story packages
✓ Batch 1: Humorous animal story + 4 questions
✓ Batch 2: Mystery adventure story + 4 questions
✓ Batch 3: Magical fantasy story + 4 questions
✓ Total: 9 candidate stories with 36 questions (if 3 themes × 3 agents)
```

**Step 2: Opus Selection & Polish**

📢 Tell the user: *"Now using Opus to select best stories and polish questions..."*

Pass all candidates to Opus with selection criteria:
- **Story selection**: Pick most engaging, well-written stories
- **Variety check**: Ensure selected stories have different structures/tones
- **Question review**: Fix option balance, verify answers match story
- **Swedish quality**: Natural phrasing, age-appropriate vocabulary
- **LGR22 balance**: Ensure objective distribution across questions

📢 When selection completes, report to user:
```
Selection complete:
✓ Selected 3 stories from 9 candidates
✓ Story variety achieved:
  - Story 1: Humorous misunderstanding (funny tone)
  - Story 2: Mystery discovery (exciting tone)
  - Story 3: Fantasy adventure (magical tone)
✓ Excluded 6 stories:
  - 2 too similar to other stories
  - 2 stories too short (<150 words)
  - 1 theme not well integrated
  - 1 less engaging narrative
✓ Fixed questions:
  - Balanced option lengths on 4 questions
  - Corrected 1 answer that didn't match story
✓ Question distribution: 4 per story, all objectives covered
```

**Step 3: Save with Metadata**

📢 Tell the user: *"Saving final output..."*

Save directly to `/data/generated/` without asking permission.

📢 When done, show summary:
```
✓ Saved: /data/generated/themed-reading-arskurs6-2026-01-03-143022.json

Final Content:
| Story | Theme | Structure | Tone | Questions |
|-------|-------|-----------|------|-----------|
| 1 | Pokemon | Humorous | Funny | 4 |
| 2 | Zebror | Mystery | Exciting | 4 |
| 3 | Katter | Fantasy | Magical | 4 |

Question Types:
| Code         | Count |
|--------------|-------|
| SV-LITERAL   |   3   |
| SV-VOCABULARY|   3   |
| SV-CHARACTER |   3   |
| SV-MAIN-IDEA |   3   |

Cost: $0.04 (Haiku) + $0.08 (Opus) = $0.12 total
Time: ~12 seconds
```

### Performance Comparison

| Approach | Time | Cost | Story Quality | Variety | Overall |
|----------|------|------|---------------|---------|---------|
| Pure Opus | ~10s | $0.26 | ★★★★★ | ★★★★☆ | A |
| Pure Haiku | ~4s | $0.014 | ★★★☆☆ | ★★☆☆☆ | C |
| **Hybrid** | ~12s | $0.12 | ★★★★☆ | ★★★★★ | **A** |

### Example Prompt for Haiku Agents

```
Generate a Swedish short story (150-250 words) with comprehension questions.

Grade: Årskurs [N]
Theme: [THEME]
Questions: [N] questions

**ASSIGNED STRUCTURE**: [problem-solution | mystery | humorous | fantasy | slice-of-life]
**ASSIGNED TONE**: [funny | exciting | mysterious | magical | realistic]
**ASSIGNED CHARACTERS**: [animals | fantasy creatures | human children | objects]

Output JSON format:
{
  "batch": [1|2|3],
  "package": {
    "name": "[Theme name]",
    "story_text": "...",
    "description": "..."
  },
  "problems": [{ ... }]
}

Rules:
- Story MUST follow assigned structure and tone
- 150-250 words exactly
- All options similar length
- Include story_text in package
```

### Example Prompt for Opus Selection

```
Review [N] themed reading packages. Select best [M] based on:

1. Story quality: Engaging, well-written, appropriate length
2. Story variety: Different structures, tones, character types
3. Theme integration: Theme used creatively, not forced
4. Question quality: Options balanced, answers correct
5. LGR22 coverage: All objectives represented

Exclude packages where:
- Story is too short (<150 words) or too long (>300 words)
- Story structure is too similar to another selected story
- Correct answers are obviously longer than distractors
- Questions don't match story content

Output final JSON with selected packages and metadata.
```

## Description Guidelines

**IMPORTANT:** Package descriptions should be human-readable for parents.
- ✅ "En rolig berättelse om Pikachus äventyr i skogen"
- ❌ "AI-generated story with Haiku+Opus hybrid approach"

Never include model names (Haiku, Opus, Claude) in descriptions visible to parents.

## Metadata Format

Include generation metadata in output for tracking:
```json
"metadata": {
  "generated_at": "YYYY-MM-DD",
  "generation_method": "parallel-selection",
  "models": {
    "generation": "claude-haiku-4-5",
    "selection": "claude-opus-4-5"
  },
  "candidates_generated": 9,
  "candidates_selected": 3,
  "story_structures": ["humorous", "mystery", "fantasy"]
}
```
