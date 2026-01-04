import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../data/database.js';
import { authenticateChild } from '../middleware/auth.js';
import { invalidateAssignmentsCache } from './assignments.js';
import type { Child } from '../types/index.js';

const router = Router();

// Configuration
const MAX_ACTIVE_ADVENTURES = 3;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_GENERATIONS_PER_WINDOW = 3;

// In-memory rate limiting (production should use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Claude client (lazy initialization)
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Theme configuration
interface Theme {
  id: string;
  nameEn: string;
  nameSv: string;
  emoji: string;
  category: 'animals' | 'fantasy' | 'games' | 'nature' | 'space' | 'sports';
}

const THEMES: Theme[] = [
  // Animals (10)
  { id: 'dinosaurs', nameEn: 'Dinosaurs', nameSv: 'Dinosaurier', emoji: '🦕', category: 'animals' },
  { id: 'cats', nameEn: 'Cats', nameSv: 'Katter', emoji: '🐱', category: 'animals' },
  { id: 'dogs', nameEn: 'Dogs', nameSv: 'Hundar', emoji: '🐕', category: 'animals' },
  { id: 'horses', nameEn: 'Horses', nameSv: 'Hästar', emoji: '🐴', category: 'animals' },
  { id: 'pandas', nameEn: 'Pandas', nameSv: 'Pandor', emoji: '🐼', category: 'animals' },
  { id: 'sharks', nameEn: 'Sharks', nameSv: 'Hajar', emoji: '🦈', category: 'animals' },
  { id: 'butterflies', nameEn: 'Butterflies', nameSv: 'Fjärilar', emoji: '🦋', category: 'animals' },
  { id: 'birds', nameEn: 'Birds', nameSv: 'Fåglar', emoji: '🦜', category: 'animals' },
  { id: 'bunnies', nameEn: 'Bunnies', nameSv: 'Kaniner', emoji: '🐰', category: 'animals' },
  { id: 'lions', nameEn: 'Lions', nameSv: 'Lejon', emoji: '🦁', category: 'animals' },

  // Fantasy (10)
  { id: 'dragons', nameEn: 'Dragons', nameSv: 'Drakar', emoji: '🐉', category: 'fantasy' },
  { id: 'unicorns', nameEn: 'Unicorns', nameSv: 'Enhörningar', emoji: '🦄', category: 'fantasy' },
  { id: 'magic', nameEn: 'Magic', nameSv: 'Magi', emoji: '✨', category: 'fantasy' },
  { id: 'superheroes', nameEn: 'Superheroes', nameSv: 'Superhjältar', emoji: '🦸', category: 'fantasy' },
  { id: 'pirates', nameEn: 'Pirates', nameSv: 'Pirater', emoji: '🏴‍☠️', category: 'fantasy' },
  { id: 'robots', nameEn: 'Robots', nameSv: 'Robotar', emoji: '🤖', category: 'fantasy' },
  { id: 'wizards', nameEn: 'Wizards', nameSv: 'Trollkarlar', emoji: '🧙', category: 'fantasy' },
  { id: 'fairies', nameEn: 'Fairies', nameSv: 'Älvor', emoji: '🧚', category: 'fantasy' },
  { id: 'mermaids', nameEn: 'Mermaids', nameSv: 'Sjöjungfrur', emoji: '🧜‍♀️', category: 'fantasy' },
  { id: 'ghosts', nameEn: 'Ghosts', nameSv: 'Spöken', emoji: '👻', category: 'fantasy' },

  // Games (6)
  { id: 'minecraft', nameEn: 'Minecraft', nameSv: 'Minecraft', emoji: '⛏️', category: 'games' },
  { id: 'pokemon', nameEn: 'Pokemon', nameSv: 'Pokemon', emoji: '⚡', category: 'games' },
  { id: 'roblox', nameEn: 'Roblox', nameSv: 'Roblox', emoji: '🎮', category: 'games' },
  { id: 'fortnite', nameEn: 'Fortnite', nameSv: 'Fortnite', emoji: '🎯', category: 'games' },
  { id: 'mario', nameEn: 'Mario', nameSv: 'Mario', emoji: '🍄', category: 'games' },
  { id: 'lego', nameEn: 'LEGO', nameSv: 'LEGO', emoji: '🧱', category: 'games' },

  // Nature (6)
  { id: 'ocean', nameEn: 'Ocean', nameSv: 'Havet', emoji: '🌊', category: 'nature' },
  { id: 'forest', nameEn: 'Forest', nameSv: 'Skogen', emoji: '🌲', category: 'nature' },
  { id: 'space', nameEn: 'Space', nameSv: 'Rymden', emoji: '🚀', category: 'nature' },
  { id: 'jungle', nameEn: 'Jungle', nameSv: 'Djungeln', emoji: '🌴', category: 'nature' },
  { id: 'volcano', nameEn: 'Volcanoes', nameSv: 'Vulkaner', emoji: '🌋', category: 'nature' },
  { id: 'rainbows', nameEn: 'Rainbows', nameSv: 'Regnbågar', emoji: '🌈', category: 'nature' },

  // Sports (6)
  { id: 'soccer', nameEn: 'Soccer', nameSv: 'Fotboll', emoji: '⚽', category: 'sports' },
  { id: 'hockey', nameEn: 'Hockey', nameSv: 'Hockey', emoji: '🏒', category: 'sports' },
  { id: 'swimming', nameEn: 'Swimming', nameSv: 'Simning', emoji: '🏊', category: 'sports' },
  { id: 'skiing', nameEn: 'Skiing', nameSv: 'Skidåkning', emoji: '⛷️', category: 'sports' },
  { id: 'gymnastics', nameEn: 'Gymnastics', nameSv: 'Gymnastik', emoji: '🤸', category: 'sports' },
  { id: 'skateboarding', nameEn: 'Skateboarding', nameSv: 'Skateboard', emoji: '🛹', category: 'sports' },

  // Food & Fun (6)
  { id: 'candy', nameEn: 'Candy', nameSv: 'Godis', emoji: '🍬', category: 'nature' },
  { id: 'ice-cream', nameEn: 'Ice Cream', nameSv: 'Glass', emoji: '🍦', category: 'nature' },
  { id: 'pizza', nameEn: 'Pizza', nameSv: 'Pizza', emoji: '🍕', category: 'nature' },
  { id: 'birthday', nameEn: 'Birthday Party', nameSv: 'Kalas', emoji: '🎂', category: 'nature' },
  { id: 'circus', nameEn: 'Circus', nameSv: 'Cirkus', emoji: '🎪', category: 'nature' },
  { id: 'treasure', nameEn: 'Treasure Hunt', nameSv: 'Skattjakt', emoji: '💎', category: 'fantasy' },
];

interface Size {
  id: 'quick' | 'medium' | 'challenge';
  questionCount: number;
  objectiveCount: number;
  nameEn: string;
  nameSv: string;
}

const SIZES: Size[] = [
  { id: 'quick', questionCount: 3, objectiveCount: 2, nameEn: 'Quick Adventure', nameSv: 'Snabbt äventyr' },
  { id: 'medium', questionCount: 5, objectiveCount: 3, nameEn: 'Medium Adventure', nameSv: 'Mellanstort äventyr' },
  { id: 'challenge', questionCount: 10, objectiveCount: 4, nameEn: 'Challenge', nameSv: 'Utmaning' },
];

// Rate limit check
function checkRateLimit(childId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(childId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(childId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_GENERATIONS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

// Sanitize JSON by escaping control characters only INSIDE string values
function sanitizeJsonString(jsonStr: string): string {
  // Only escape control characters that are inside JSON strings
  // We need to find strings and only sanitize within them
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    // Only sanitize control characters when inside a string
    if (inString && char.charCodeAt(0) < 32) {
      switch (char) {
        case '\n': result += '\\n'; break;
        case '\r': result += '\\r'; break;
        case '\t': result += '\\t'; break;
        default: break; // Remove other control characters
      }
    } else {
      result += char;
    }
  }

  return result;
}

// Types for curriculum data
interface ObjectiveCoverage {
  id: number;
  code: string;
  description: string;
  correctCount: number;
  totalCount: number;
}

interface CategoryCoverage {
  categoryId: string;
  categoryName: string;
  objectives: ObjectiveCoverage[];
}

// Score objectives based on priority (same algorithm as CustomPromptBuilder.tsx)
function scoreObjective(obj: ObjectiveCoverage): number {
  const percentage = obj.totalCount > 0 ? (obj.correctCount / obj.totalCount) * 100 : 0;

  // Priority 1: Never practiced (score: 1000)
  if (obj.totalCount === 0) {
    return 1000;
  }

  // Priority 2: Low practice count (score: 500-700)
  if (obj.totalCount < 15) {
    let score = 500 + (15 - obj.totalCount) * 20;
    if (percentage > 90) {
      score -= 200; // Already doing well, lower priority
    }
    return score;
  }

  // Priority 3: Poor mastery (score: up to 210)
  if (percentage < 70) {
    return (70 - percentage) * 3;
  }

  // Priority 4: Already mastered (score: 0)
  return 0;
}

// Get recommended objectives for a child based on their curriculum progress
function getRecommendedObjectives(
  childId: string,
  gradeLevel: number,
  contentType: 'math' | 'reading',
  count: number
): string[] {
  const db = getDb();

  // Get curriculum objectives for the child's grade level
  const categoryFilter = contentType === 'math'
    ? `AND co.code LIKE 'MA-%'`
    : `AND co.code LIKE 'SV-%'`;

  const objectives = db.all<{
    id: number;
    code: string;
    description: string;
    correct_count: number;
    total_count: number;
  }>(
    `SELECT co.id, co.code, co.description,
            COALESCE(stats.correct_count, 0) as correct_count,
            COALESCE(stats.total_count, 0) as total_count
     FROM curriculum_objectives co
     LEFT JOIN (
       SELECT ecm.objective_id,
              COUNT(DISTINCT CASE
                WHEN aa.id IS NOT NULL AND aa.is_correct = 1 AND COALESCE(aa.hint_purchased, 0) = 0 THEN aa.id
                WHEN mp.id IS NOT NULL AND mp.is_correct = 1 AND COALESCE(mp.hint_purchased, 0) = 0 THEN mp.id
                WHEN rq.id IS NOT NULL AND rq.is_correct = 1 THEN rq.id
              END) as correct_count,
              COUNT(DISTINCT CASE
                WHEN aa.id IS NOT NULL THEN aa.id
                WHEN mp.id IS NOT NULL THEN mp.id
                WHEN rq.id IS NOT NULL THEN rq.id
              END) as total_count
       FROM exercise_curriculum_mapping ecm
       JOIN assignments a ON a.status = 'completed' AND a.child_id = ?
       LEFT JOIN assignment_answers aa ON aa.assignment_id = a.id
         AND ecm.exercise_type = 'package_problem' AND ecm.exercise_id = aa.problem_id
       LEFT JOIN math_problems mp ON mp.assignment_id = a.id
         AND ecm.exercise_type = 'math_problem' AND ecm.exercise_id = mp.id
       LEFT JOIN reading_questions rq ON rq.assignment_id = a.id
         AND ecm.exercise_type = 'reading_question' AND ecm.exercise_id = rq.id
       WHERE (aa.id IS NOT NULL OR mp.id IS NOT NULL OR rq.id IS NOT NULL)
       GROUP BY ecm.objective_id
     ) stats ON stats.objective_id = co.id
     WHERE co.grade_levels LIKE ?
     ${categoryFilter}`,
    [childId, `%"${gradeLevel}"%`]
  );

  // Score and sort objectives
  const scoredObjectives = objectives.map(obj => ({
    code: obj.code,
    score: scoreObjective({
      id: obj.id,
      code: obj.code,
      description: obj.description,
      correctCount: obj.correct_count,
      totalCount: obj.total_count
    })
  }));

  scoredObjectives.sort((a, b) => b.score - a.score);

  // Return top N objective codes
  return scoredObjectives.slice(0, count).map(o => o.code);
}

// Generated content types
interface GeneratedProblem {
  question_text: string;
  correct_answer: string;
  answer_type: 'number' | 'multiple_choice' | 'text';
  options?: string[];
  explanation: string;
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lgr22_codes: string[];
}

interface GeneratedPackage {
  package: {
    name: string;
    description: string;
    story_text?: string;
  };
  problems: GeneratedProblem[];
}

// Generate math content via Claude API
async function generateMathContent(
  gradeLevel: number,
  theme: string,
  questionCount: number,
  objectiveCodes: string[]
): Promise<GeneratedPackage> {
  const client = getAnthropicClient();

  const systemPrompt = `Du är en svensk matematiklärare som skapar uppgifter för grundskolan baserat på LGR 22.
All text MÅSTE vara på svenska. Skapa ${questionCount} matteuppgifter med temat "${theme}".

VIKTIGT: Uppgifterna SKA träna följande LGR22-mål: ${objectiveCodes.join(', ')}
Fördela uppgifterna jämnt över dessa mål.

Svara med JSON i exakt detta format:
{
  "package": {
    "name": "[Kreativt namn på svenska som inkluderar temat]",
    "description": "[Kort beskrivning på svenska]"
  },
  "problems": [
    {
      "question_text": "[Uppgift på svenska - variera mellan korta och längre uppgifter]",
      "correct_answer": "[Bara siffran, inga enheter]",
      "answer_type": "number",
      "explanation": "[Steg-för-steg lösning på svenska]",
      "hint": "[Hjälpsam ledtråd på svenska]",
      "difficulty": "easy|medium|hard",
      "lgr22_codes": ["[EN av koderna: ${objectiveCodes.join(', ')}]"]
    }
  ]
}

Årskurs: ${gradeLevel}
- Använd åldersanpassade tal och begrepp
- Svårighetsfördelning: 40% lätta, 40% medel, 20% svåra
- Variera uppgiftstyper: addition, subtraktion, multiplikation, division, bråk, procent beroende på årskurs
- För Ja/Nej-frågor, använd answer_type: "multiple_choice" med options: ["A: Ja", "B: Nej"]
- Gör uppgifterna roliga och engagerande med temat "${theme}"`;

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: systemPrompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonText = content.text;

  // Try to extract from code block first
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    // Try to find JSON object directly (starts with { ends with })
    const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
      jsonText = jsonObjMatch[0];
    }
  }

  try {
    return JSON.parse(sanitizeJsonString(jsonText.trim()));
  } catch (parseError) {
    console.error('Failed to parse math JSON. Raw response:', content.text.substring(0, 500));
    throw parseError;
  }
}

// Generate reading content via Claude API
async function generateReadingContent(
  gradeLevel: number,
  theme: string,
  questionCount: number,
  objectiveCodes: string[]
): Promise<GeneratedPackage> {
  const client = getAnthropicClient();

  const systemPrompt = `Du är en svensk lärare som skapar läsförståelseuppgifter för grundskolan.
Skapa en kort berättelse (150-250 ord) med temat "${theme}" och ${questionCount} flervalsfrågor.

VIKTIGT: Frågorna SKA träna följande LGR22-mål: ${objectiveCodes.join(', ')}
Förklaring av målen:
- SV-LITERAL: Direkt förståelse (fakta från texten)
- SV-INFERENCE: Dra slutsatser
- SV-MAIN-IDEA: Huvudbudskap/tema
- SV-CHARACTER: Karaktärsförståelse
- SV-VOCABULARY: Ordförståelse i kontext

Svara med JSON i exakt detta format:
{
  "package": {
    "name": "[Kreativ titel på svenska]",
    "description": "[Kort beskrivning på svenska]",
    "story_text": "[Berättelsen på svenska, 150-250 ord. Anpassad för årskurs ${gradeLevel}.]"
  },
  "problems": [
    {
      "question_text": "[Fråga på svenska]",
      "correct_answer": "A",
      "answer_type": "multiple_choice",
      "options": ["A: [Rätt svar]", "B: [Fel alternativ]", "C: [Fel alternativ]", "D: [Fel alternativ]"],
      "explanation": "[Förklaring varför A är rätt]",
      "hint": "[Ledtråd]",
      "difficulty": "easy|medium|hard",
      "lgr22_codes": ["[EN av koderna: ${objectiveCodes.join(', ')}]"]
    }
  ]
}

Årskurs: ${gradeLevel}
- Använd åldersanpassat språk
- Alla alternativ ska ha liknande längd (inget uppenbart längre rätt svar)
- Distraktorer ska vara trovärdiga men tydligt fel
- Svårighetsfördelning: 40% lätta, 40% medel, 20% svåra`;

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: systemPrompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  // Extract JSON from response
  let jsonText = content.text;

  // Try to extract from code block first
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  } else {
    // Try to find JSON object directly (starts with { ends with })
    const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
      jsonText = jsonObjMatch[0];
    }
  }

  try {
    return JSON.parse(sanitizeJsonString(jsonText.trim()));
  } catch (parseError) {
    console.error('Failed to parse reading JSON. Raw response:', content.text.substring(0, 500));
    throw parseError;
  }
}

// GET /api/adventures/themes - Get available themes and sizes
router.get('/themes', authenticateChild, (_req, res) => {
  res.json({ themes: THEMES, sizes: SIZES });
});

// GET /api/adventures/quota - Get child's adventure quota status
router.get('/quota', authenticateChild, (req, res) => {
  try {
    const db = getDb();
    const childId = req.child!.id;

    // Count active adventures (not completed assignments)
    const activeAdventures = db.all<{
      id: string;
      theme: string;
      content_type: string;
      question_count: number;
      assignment_id: string;
      created_at: string;
    }>(
      `SELECT ag.id, ag.theme, ag.content_type, ag.question_count, ag.assignment_id, ag.created_at
       FROM adventure_generations ag
       JOIN assignments a ON ag.assignment_id = a.id
       WHERE ag.child_id = ? AND a.status != 'completed'`,
      [childId]
    );

    const remaining = MAX_ACTIVE_ADVENTURES - activeAdventures.length;

    res.json({
      maxActive: MAX_ACTIVE_ADVENTURES,
      activeCount: activeAdventures.length,
      remaining,
      canCreate: remaining > 0,
      activeAdventures: activeAdventures.map(a => ({
        id: a.id,
        theme: a.theme,
        contentType: a.content_type,
        questionCount: a.question_count,
        assignmentId: a.assignment_id,
        createdAt: a.created_at
      }))
    });
  } catch (error) {
    console.error('Get adventure quota error:', error);
    res.status(500).json({ error: 'Failed to get adventure quota' });
  }
});

// POST /api/adventures/generate - Generate new adventure
router.post('/generate', authenticateChild, async (req, res) => {
  try {
    const db = getDb();
    const childId = req.child!.id;
    const { contentType, themeId, customTheme, sizeId } = req.body as {
      contentType: 'math' | 'reading';
      themeId: string;
      customTheme?: string;
      sizeId: 'quick' | 'medium' | 'challenge';
    };

    // Validate input
    if (!contentType || !['math', 'reading'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid contentType' });
    }
    if (!sizeId || !SIZES.find(s => s.id === sizeId)) {
      return res.status(400).json({ error: 'Invalid sizeId' });
    }

    const theme = THEMES.find(t => t.id === themeId);
    const themeName = customTheme?.trim() || theme?.nameSv || theme?.nameEn;
    if (!themeName) {
      return res.status(400).json({ error: 'Theme or customTheme required' });
    }

    // Rate limit check
    if (!checkRateLimit(childId)) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before generating again.',
        errorCode: 'RATE_LIMITED'
      });
    }

    // Check quota
    const activeCount = db.get<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM adventure_generations ag
       JOIN assignments a ON ag.assignment_id = a.id
       WHERE ag.child_id = ? AND a.status != 'completed'`,
      [childId]
    );

    if (activeCount && activeCount.count >= MAX_ACTIVE_ADVENTURES) {
      return res.status(400).json({
        error: 'Adventure quota exceeded. Complete your active adventures first.',
        errorCode: 'QUOTA_EXCEEDED'
      });
    }

    // Get child info - use parentId from token for reliability
    const parentId = req.child!.parentId;
    const child = db.get<{ id: string; grade_level: number; name: string }>(
      'SELECT id, grade_level, name FROM children WHERE id = ?',
      [childId]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const size = SIZES.find(s => s.id === sizeId)!;

    // Get recommended LGR22 objectives based on child's progress
    const objectiveCodes = getRecommendedObjectives(
      childId,
      child.grade_level,
      contentType,
      size.objectiveCount
    );

    // Fallback objectives if none found
    if (objectiveCodes.length === 0) {
      if (contentType === 'math') {
        objectiveCodes.push('MA-TAL-01', 'MA-TAL-02');
      } else {
        objectiveCodes.push('SV-LITERAL', 'SV-INFERENCE');
      }
    }

    // Generate content via Claude API
    let generated: GeneratedPackage;
    try {
      generated = contentType === 'math'
        ? await generateMathContent(child.grade_level, themeName, size.questionCount, objectiveCodes)
        : await generateReadingContent(child.grade_level, themeName, size.questionCount, objectiveCodes);
    } catch (genError) {
      console.error('Claude API generation error:', genError);
      if (genError instanceof Anthropic.APIError) {
        if (genError.status === 429) {
          return res.status(429).json({
            error: 'Service busy. Please try again in a moment.',
            errorCode: 'RATE_LIMITED'
          });
        }
      }
      return res.status(503).json({
        error: 'Content generation temporarily unavailable. Please try again.',
        errorCode: 'GENERATION_FAILED'
      });
    }

    // Validate generated content
    if (!generated.package || !generated.problems || !Array.isArray(generated.problems)) {
      console.error('Invalid generated content structure:', generated);
      return res.status(503).json({
        error: 'Generated content was invalid. Please try again.',
        errorCode: 'GENERATION_FAILED'
      });
    }

    // Create package, problems, and assignment in a transaction
    const packageId = uuidv4();
    const assignmentId = uuidv4();
    const adventureId = uuidv4();

    db.transaction(() => {
      // Create the package
      const difficultySummary = generated.problems.reduce((acc, p) => {
        const d = p.difficulty || 'medium';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      db.run(
        `INSERT INTO math_packages (id, parent_id, name, grade_level, category_id, assignment_type, problem_count, difficulty_summary, description, story_text, is_global, is_child_generated, generated_for_child_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`,
        [
          packageId,
          parentId,
          generated.package.name,
          child.grade_level,
          null, // category_id - child-generated packages don't have a category
          contentType,
          generated.problems.length,
          JSON.stringify(difficultySummary),
          generated.package.description || null,
          generated.package.story_text || null,
          childId
        ]
      );

      // Create problems and curriculum mappings
      for (let i = 0; i < generated.problems.length; i++) {
        const p = generated.problems[i];
        const problemId = uuidv4();

        db.run(
          `INSERT INTO package_problems (id, package_id, problem_number, question_text, correct_answer, answer_type, options, explanation, hint, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            problemId,
            packageId,
            i + 1,
            p.question_text,
            p.correct_answer,
            p.answer_type || 'number',
            p.options ? JSON.stringify(p.options) : null,
            p.explanation || null,
            p.hint || null,
            p.difficulty || 'medium'
          ]
        );

        // Create curriculum mappings
        if (p.lgr22_codes && Array.isArray(p.lgr22_codes)) {
          for (const code of p.lgr22_codes) {
            const objective = db.get<{ id: number }>(
              'SELECT id FROM curriculum_objectives WHERE code = ?',
              [code]
            );
            if (objective) {
              db.run(
                `INSERT OR IGNORE INTO exercise_curriculum_mapping (exercise_type, exercise_id, objective_id)
                 VALUES (?, ?, ?)`,
                ['package_problem', problemId, objective.id]
              );
            }
          }
        }
      }

      // Create the assignment (child-created, so assigned_by_id is NULL)
      // Set display_order to minimum - 1 to put it at the very top
      // The adventure_generations table tracks that this was child-created
      const minOrder = db.get<{ min_order: number | null }>(
        `SELECT MIN(display_order) as min_order FROM assignments WHERE child_id = ? AND assignment_type = ?`,
        [childId, contentType]
      );
      const newDisplayOrder = (minOrder?.min_order ?? 0) - 1;

      db.run(
        `INSERT INTO assignments (id, parent_id, child_id, assignment_type, title, grade_level, status, package_id, hints_allowed, assigned_by_id, display_order)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 1, NULL, ?)`,
        [
          assignmentId,
          parentId,
          childId,
          contentType,
          generated.package.name,
          child.grade_level,
          packageId,
          newDisplayOrder
        ]
      );

      // Track the adventure generation
      db.run(
        `INSERT INTO adventure_generations (id, child_id, assignment_id, package_id, theme, custom_theme, content_type, question_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          adventureId,
          childId,
          assignmentId,
          packageId,
          themeId || 'custom',
          customTheme || null,
          contentType,
          generated.problems.length
        ]
      );
    });

    // Invalidate caches
    await invalidateAssignmentsCache(parentId, childId);

    res.json({
      success: true,
      adventureId,
      assignmentId,
      title: generated.package.name,
      questionCount: generated.problems.length,
      objectiveCodes
    });
  } catch (error) {
    console.error('Generate adventure error:', error);
    res.status(500).json({
      error: 'Failed to generate adventure',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/adventures/:id - Get adventure details
router.get('/:id', authenticateChild, (req, res) => {
  try {
    const db = getDb();
    const childId = req.child!.id;
    const adventureId = req.params.id;

    const adventure = db.get<{
      id: string;
      theme: string;
      custom_theme: string | null;
      content_type: string;
      question_count: number;
      status: string;
      success_rate: number | null;
      assignment_id: string;
      created_at: string;
      completed_at: string | null;
    }>(
      `SELECT * FROM adventure_generations WHERE id = ? AND child_id = ?`,
      [adventureId, childId]
    );

    if (!adventure) {
      return res.status(404).json({ error: 'Adventure not found' });
    }

    res.json({
      id: adventure.id,
      theme: adventure.theme,
      customTheme: adventure.custom_theme,
      contentType: adventure.content_type,
      questionCount: adventure.question_count,
      status: adventure.status,
      successRate: adventure.success_rate,
      assignmentId: adventure.assignment_id,
      createdAt: adventure.created_at,
      completedAt: adventure.completed_at
    });
  } catch (error) {
    console.error('Get adventure error:', error);
    res.status(500).json({ error: 'Failed to get adventure' });
  }
});

export default router;

// Export for use in assignment completion hook
export function updateAdventureOnCompletion(assignmentId: string, successRate: number): void {
  const db = getDb();
  db.run(
    `UPDATE adventure_generations
     SET status = 'completed', success_rate = ?, completed_at = CURRENT_TIMESTAMP
     WHERE assignment_id = ? AND status = 'active'`,
    [successRate, assignmentId]
  );
}
