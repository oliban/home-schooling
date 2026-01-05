import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../data/database.js';
import { authenticateChild } from '../middleware/auth.js';
import { invalidateAssignmentsCache } from './assignments.js';
import { validateCurriculumCodesBatch } from '../utils/curriculumValidator.js';
import { scoreObjective } from './curriculum.js';
import type { Child } from '../types/index.js';

const router = Router();

// Expanded curriculum code descriptions with practical examples
// These help Claude understand what each code actually means
const EXPANDED_DESCRIPTIONS: Record<string, string> = {
  // Taluppfattning (Number Sense) - Understanding numbers as CONCEPTS
  'MA-TAL-01': 'Naturliga tal (1, 2, 3...) - förstå vad tal betyder, räkna, jämföra storlek',
  'MA-TAL-02': 'Positionssystemet - förstå ental, tiotal, hundratal (t.ex. 345 = 3 hundratal + 4 tiotal + 5 ental)',
  'MA-TAL-03': 'Del av helhet - förstå vad "hälften", "en tredjedel" betyder visuellt',
  'MA-TAL-04': 'Tal i bråkform - förstå bråk som begrepp (1/2, 3/4), INTE beräkningar med bråk',
  'MA-TAL-05': 'Positionssystemet för decimaltal - förstå tiondelar, hundradelar (0.5 = 5 tiondelar)',
  'MA-TAL-06': 'Bråk och decimaltal - omvandla mellan bråk och decimal (1/4 = 0.25), förstå sambandet',
  'MA-TAL-07': 'Procentform - förstå vad procent betyder (25% = 25 av 100), INTE procentberäkningar i textuppgifter',
  'MA-TAL-08': 'Negativa tal - förstå minustal, tallinjen, jämföra (-5 < -2)',
  'MA-TAL-09': 'Reella tal - rationella och irrationella tal, tallinjen',
  'MA-TAL-10': 'Talsystemets utveckling - historik och samband mellan taltyper',
  'MA-TAL-11': 'Beräkningsmetoder - algoritmer för +, -, ×, ÷ med reella tal',
  'MA-TAL-12': 'Rimlighetsbedömning - uppskatta och kontrollera om svar verkar rimligt',

  // Algebra - Variables, equations, patterns
  'MA-ALG-01': 'Likhetstecknet - förstå att = betyder "lika mycket på båda sidor" (5 + 3 = 4 + 4)',
  'MA-ALG-02': 'Enkla mönster - fortsätt mönstret (röd, blå, röd, blå, ?)',
  'MA-ALG-03': 'Obekanta tal - använda x eller ? för okänt tal (? + 5 = 12)',
  'MA-ALG-04': 'Ekvationslösning - hitta x i enkla ekvationer (x + 5 = 12, 3x = 15)',
  'MA-ALG-05': 'Mönster i talföljder - hitta regeln i sekvenser (2, 4, 6, 8, ? eller 1, 4, 9, 16, ?)',
  'MA-ALG-06': 'Variabelbegreppet - förstå att x kan representera olika värden',
  'MA-ALG-07': 'Algebraiska uttryck - förenkla och räkna med uttryck (2x + 3x = 5x)',
  'MA-ALG-08': 'Avancerad ekvationslösning - ekvationer med parenteser, flera steg',
  'MA-ALG-09': 'Ekvationssystem - lösa två ekvationer med två obekanta',
  'MA-ALG-10': 'Potenser - förstå och räkna med exponenter (2³ = 8)',

  // Geometri - Shapes, measurement
  'MA-GEO-01': 'Grundläggande former - känna igen cirkel, kvadrat, triangel, rektangel',
  'MA-GEO-02': 'Rita geometriska figurer - konstruera enkla former med linjal',
  'MA-GEO-03': 'Lägesord - över, under, bredvid, mellan, framför, bakom',
  'MA-GEO-04': 'Symmetri - spegelsymmetri i bilder och mönster',
  'MA-GEO-05': 'Formers egenskaper - antal sidor, hörn, vinklar i olika former',
  'MA-GEO-06': 'Konstruktion - rita med passare och linjal',
  'MA-GEO-07': 'Area och omkrets - BERÄKNA area (längd × bredd) och omkrets (summa av sidor)',
  'MA-GEO-08': 'Skala - förstå kartskala, förstora/förminska (1:100 betyder 1 cm = 100 cm)',
  'MA-GEO-09': 'Geometriska egenskaper - vinklar, parallella linjer, regelbundna polygoner',
  'MA-GEO-10': 'Avbildning - spegling, rotation, förflyttning av figurer',
  'MA-GEO-11': 'Likformighet - figurer med samma form men olika storlek',
  'MA-GEO-12': 'Volym och area - beräkna volym av lådor, cylindrar; area av sammansatta figurer',
  'MA-GEO-13': 'Pythagoras sats - a² + b² = c² för rätvinkliga trianglar',

  // Sannolikhet och Statistik
  'MA-SAN-01': 'Slumphändelser - förstå slump i tärningskast, kortdragning, myntkast',
  'MA-SAN-02': 'Tabeller och diagram - läsa av enkla stapeldiagram och tabeller',
  'MA-SAN-03': 'Sannolikhet - chansen att något händer (troligt, osannolikt, omöjligt)',
  'MA-SAN-04': 'Kombinatorik - räkna ANTAL KOMBINATIONER (3 tröjor × 4 byxor = 12 kombinationer)',
  'MA-SAN-05': 'Beskriva data - skapa och tolka diagram och tabeller',
  'MA-SAN-06': 'Lägesmått - medelvärde, median, typvärde',
  'MA-SAN-07': 'Beräkna sannolikhet - P(händelse) = gynnsamma / möjliga utfall',
  'MA-SAN-08': 'Avancerad kombinatorik - permutationer, kombinationer',
  'MA-SAN-09': 'Avancerade diagram - linjediagram, cirkeldiagram, histogram',
  'MA-SAN-10': 'Spridningsmått - variationsbredd, standardavvikelse',
  'MA-SAN-11': 'Risk och chans - bedöma sannolikheter i verkliga situationer',

  // Samband och Förändring
  'MA-SAM-01': 'Proportionalitet - dubbelt så mycket kostar dubbelt så mycket',
  'MA-SAM-02': 'Grafer för proportionalitet - räta linjer genom origo',
  'MA-SAM-03': 'Koordinatsystem - placera punkter med (x, y)-koordinater',
  'MA-SAM-04': 'Funktioner - y = 2x + 3, input ger output',
  'MA-SAM-05': 'Funktioners användning - modellera verkliga samband',
  'MA-SAM-06': 'Linjära funktioner - räta linjens ekvation y = kx + m',
  'MA-SAM-07': 'Procentförändring - beräkna ökning/minskning i procent',

  // Problemlösning - ANVÄND DESSA FÖR TEXTUPPGIFTER MED BERÄKNINGAR
  'MA-PRO-01': 'Vardagsproblem åk 1-3 - enkla problem från vardagen',
  'MA-PRO-02': 'Formulera frågor åk 1-3 - skapa egna matematiska frågor',
  'MA-PRO-03': 'Problem med + och - (åk 1-3) - textuppgifter som löses med addition/subtraktion',
  'MA-PRO-04': 'Vardagsproblem åk 4-6 - problem från vardagen, alla räknesätt',
  'MA-PRO-05': 'Formulera frågor åk 4-6 - skapa matematiska frågeställningar',
  'MA-PRO-06': 'Problem med +, -, ×, ÷ (åk 4-6) - TEXTUPPGIFTER som löses med de fyra räknesätten',
  'MA-PRO-07': 'Vardags/yrkesproblem åk 7-9 - komplexa verkliga problem',
  'MA-PRO-08': 'Matematisk modellering - formulera problem med matematiska modeller',
  'MA-PRO-09': 'Avancerad problemlösning - resonemang och argumentation',

  // Svenska/Läsförståelse
  'SV-LITERAL': 'Direkt förståelse - hitta fakta som står explicit i texten',
  'SV-INFERENCE': 'Slutledning - dra slutsatser från ledtrådar i texten',
  'SV-MAIN-IDEA': 'Huvudbudskap - förstå textens tema eller huvudpoäng',
  'SV-CHARACTER': 'Karaktärsförståelse - förstå personers känslor, motiv, egenskaper',
  'SV-VOCABULARY': 'Ordförståelse - förstå ords betydelse från sammanhanget',
};

// Helper to get expanded description for a code
function getExpandedDescription(code: string, fallbackDescription: string): string {
  return EXPANDED_DESCRIPTIONS[code] || fallbackDescription;
}

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

// Get recommended objectives for a child based on their curriculum progress
// Returns both codes and descriptions for use in prompts
interface ObjectiveWithDescription {
  code: string;
  description: string;
}

function getRecommendedObjectives(
  childId: string,
  gradeLevel: number,
  contentType: 'math' | 'reading',
  count: number
): ObjectiveWithDescription[] {
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

  // Score and sort objectives using shared scoring function from curriculum.ts
  const scoredObjectives = objectives.map(obj => ({
    code: obj.code,
    description: obj.description,
    score: scoreObjective(obj.correct_count, obj.total_count)
  }));

  scoredObjectives.sort((a, b) => b.score - a.score);

  // Return top N objectives with both code and description
  return scoredObjectives.slice(0, count).map(o => ({ code: o.code, description: o.description }));
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
  objectives: ObjectiveWithDescription[]
): Promise<GeneratedPackage> {
  const client = getAnthropicClient();

  // Format objectives with EXPANDED descriptions for the prompt
  // Use detailed descriptions that make it clear what each code is for
  const objectivesList = objectives
    .map(o => `- ${o.code}: ${getExpandedDescription(o.code, o.description)}`)
    .join('\n');
  const objectiveCodes = objectives.map(o => o.code);

  const systemPrompt = `Du är en svensk matematiklärare som skapar uppgifter för grundskolan baserat på LGR 22.
All text MÅSTE vara på svenska. Skapa ${questionCount} matteuppgifter med temat "${theme}".

KRITISKT VIKTIGT - ÅRSKURS ${gradeLevel}:
Detta barn går i ÅRSKURS ${gradeLevel}. Du MÅSTE anpassa ALL matematik till vad ett barn i årskurs ${gradeLevel} kan.
- Årskurs 1-2: Endast addition och subtraktion med tal upp till 20. Inga bråk, inga area/omkrets.
- Årskurs 3: Addition, subtraktion, enkel multiplikation (tabellerna 1-5). Tal upp till 100. Inga bråk, ingen area.
- Årskurs 4: Multiplikation och division, alla tabeller. Tal upp till 1000. Introduktion till bråk (1/2, 1/4). Enkel geometri.
- Årskurs 5-6: Bråk, decimaltal, procent, area och omkrets.
Om LGR22-målen nedan verkar för avancerade för årskurs ${gradeLevel}, anpassa dem till enklare nivå eller hoppa över dem.

LGR22-MÅL ATT TRÄNA (med beskrivningar):
${objectivesList}

VIKTIGT FÖR KODVAL: När du väljer lgr22_codes för varje uppgift, MATCHA uppgiftens innehåll med beskrivningen:
- Division/multiplikation/räknesätt → använd MA-PRO-06 (problemlösning med de fyra räknesätten)
- Procent → använd MA-TAL-07 (tal i procentform)
- Bråk/decimaltal → använd MA-TAL-06 (tal i bråkform och decimalform)
- Area/omkrets → använd MA-GEO-07 (metoder för att bestämma omkrets och area)
- Ekvationer → använd MA-ALG-04 (metoder för enkel ekvationslösning)
- Kombinatorik (hur många kombinationer) → använd MA-SAN-04 (enkel kombinatorik)

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
      "lgr22_codes": ["[VÄLJ rätt kod baserat på uppgiftens innehåll från: ${objectiveCodes.join(', ')}]"]
    }
  ]
}

- Svårighetsfördelning: 40% lätta, 40% medel, 20% svåra (men ALLTID inom årskurs ${gradeLevel} nivå!)
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
    const generated: GeneratedPackage = JSON.parse(sanitizeJsonString(jsonText.trim()));

    // Validate curriculum codes using Sonnet
    // This catches common Haiku mistakes like using MA-SAN-04 for division problems
    console.log(`[Adventures] Validating ${generated.problems.length} problem(s) curriculum codes...`);
    generated.problems = await validateCurriculumCodesBatch(
      client,
      generated.problems,
      gradeLevel,
      'math'
    );

    return generated;
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
  objectives: ObjectiveWithDescription[]
): Promise<GeneratedPackage> {
  const client = getAnthropicClient();

  // Format objectives with EXPANDED descriptions for the prompt
  // Use detailed descriptions that make it clear what each code is for
  const objectivesList = objectives
    .map(o => `- ${o.code}: ${getExpandedDescription(o.code, o.description)}`)
    .join('\n');
  const objectiveCodes = objectives.map(o => o.code);

  const systemPrompt = `Du är en svensk lärare som skapar läsförståelseuppgifter för grundskolan.
Skapa en kort berättelse (150-250 ord) med temat "${theme}" och ${questionCount} flervalsfrågor.

KRITISKT VIKTIGT - ÅRSKURS ${gradeLevel}:
Detta barn går i ÅRSKURS ${gradeLevel}. Du MÅSTE anpassa ALLT innehåll till vad ett barn i årskurs ${gradeLevel} kan läsa och förstå.
- Årskurs 1-2: Mycket korta meningar (5-8 ord). Enkla vanliga ord. Inga svåra begrepp. Berättelse max 100 ord.
- Årskurs 3: Korta meningar. Enkelt språk. Konkreta händelser. Berättelse 100-150 ord.
- Årskurs 4: Något längre meningar. Kan ha några svårare ord med kontext. Berättelse 150-200 ord.
- Årskurs 5-6: Mer avancerat språk och längre berättelser tillåtna. Berättelse 200-250 ord.

LGR22-MÅL ATT TRÄNA (med beskrivningar):
${objectivesList}

VIKTIGT FÖR KODVAL: Matcha varje frågas typ med rätt kod:
- Fakta direkt från texten → SV-LITERAL
- Dra slutsatser/tolka → SV-INFERENCE
- Huvudbudskap/tema → SV-MAIN-IDEA
- Karaktärers känslor/motiv → SV-CHARACTER
- Ordförståelse → SV-VOCABULARY

Svara med JSON i exakt detta format:
{
  "package": {
    "name": "[Kreativ titel på svenska]",
    "description": "[Kort beskrivning på svenska]",
    "story_text": "[Berättelsen på svenska, anpassad längd för årskurs ${gradeLevel}]"
  },
  "problems": [
    {
      "question_text": "[Fråga på svenska - enkelt språk för årskurs ${gradeLevel}]",
      "correct_answer": "A",
      "answer_type": "multiple_choice",
      "options": ["A: [Rätt svar]", "B: [Fel alternativ]", "C: [Fel alternativ]", "D: [Fel alternativ]"],
      "explanation": "[Förklaring varför A är rätt]",
      "hint": "[Ledtråd]",
      "difficulty": "easy|medium|hard",
      "lgr22_codes": ["[VÄLJ rätt kod baserat på frågetypen från: ${objectiveCodes.join(', ')}]"]
    }
  ]
}

- Använd åldersanpassat språk för ÅRSKURS ${gradeLevel}
- Alla alternativ ska ha liknande längd (inget uppenbart längre rätt svar)
- Distraktorer ska vara trovärdiga men tydligt fel
- Svårighetsfördelning: 40% lätta, 40% medel, 20% svåra (men ALLTID inom årskurs ${gradeLevel} nivå!)`;

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
    let objectives = getRecommendedObjectives(
      childId,
      child.grade_level,
      contentType,
      size.objectiveCount
    );

    // Fallback objectives if none found
    if (objectives.length === 0) {
      if (contentType === 'math') {
        objectives = [
          { code: 'MA-TAL-01', description: 'Naturliga tal och deras egenskaper' },
          { code: 'MA-TAL-02', description: 'Positionssystemet för naturliga tal' }
        ];
      } else {
        objectives = [
          { code: 'SV-LITERAL', description: 'Direkt förståelse av texten' },
          { code: 'SV-INFERENCE', description: 'Slutledning och tolkning' }
        ];
      }
    }

    // Generate content via Claude API
    let generated: GeneratedPackage;
    try {
      generated = contentType === 'math'
        ? await generateMathContent(child.grade_level, themeName, size.questionCount, objectives)
        : await generateReadingContent(child.grade_level, themeName, size.questionCount, objectives);
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
      objectiveCodes: objectives.map(o => o.code)
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
