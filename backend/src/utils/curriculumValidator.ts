/**
 * Curriculum Code Validator
 *
 * Validates LGR22 curriculum code assignments for generated math problems
 * using Claude Opus for semantic analysis.
 *
 * Descriptions are fetched from the database (extended_description field)
 * to ensure consistency with other LLM touchpoints.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../data/database.js';

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

interface CurriculumCorrection {
  index: number;
  currentCode: string;
  correctCode: string;
  reason: string;
}

// Cache for curriculum descriptions (populated from database)
let cachedDescriptions: Record<string, string> | null = null;

/**
 * Fetches curriculum code descriptions from the database.
 * Uses extended_description if available, falls back to description.
 * Results are cached for the lifetime of the process.
 */
function getCodeDescriptions(): Record<string, string> {
  if (cachedDescriptions) {
    return cachedDescriptions;
  }

  const db = getDb();
  const objectives = db.all<{ code: string; extended_description: string | null; description: string }>(
    `SELECT code, extended_description, description FROM curriculum_objectives WHERE code LIKE 'MA-%'`
  );

  cachedDescriptions = {};
  for (const obj of objectives) {
    cachedDescriptions[obj.code] = obj.extended_description || obj.description;
  }

  return cachedDescriptions;
}

/**
 * Validates curriculum codes for a batch of generated problems using Claude Sonnet.
 * Returns the problems with any necessary corrections applied.
 */
export async function validateCurriculumCodesBatch(
  client: Anthropic,
  problems: GeneratedProblem[],
  gradeLevel: number,
  assignmentType: 'math' | 'reading'
): Promise<GeneratedProblem[]> {
  // Skip validation for reading assignments (those use SV- codes)
  if (assignmentType === 'reading') {
    return problems;
  }

  // Get curriculum descriptions from database
  const descriptions = getCodeDescriptions();

  // Build the validation prompt
  const codesList = Object.entries(descriptions)
    .map(([code, desc]) => `${code}: ${desc}`)
    .join('\n');

  const problemsList = problems.map((p, i) =>
    `${i + 1}. "${p.question_text}" (svar: ${p.correct_answer}) → kod: ${p.lgr22_codes[0] || 'none'}`
  ).join('\n');

  const prompt = `Du är expert på svenska LGR22 läroplanen för matematik.

Granska dessa ${problems.length} matteuppgifter för årskurs ${gradeLevel}.
För varje uppgift, verifiera om tilldelad lgr22-kod matchar det faktiska innehållet.

**VIKTIGA REGLER:**
- MA-SAN-04 (kombinatorik) är ENDAST för uppgifter som frågar "hur många kombinationer/sätt?"
- MA-PRO-06 är för TEXTUPPGIFTER med +, -, ×, ÷ beräkningar
- MA-TAL-06 är för uppgifter med bråkberäkningar (3/4 av något)
- MA-TAL-07 är för uppgifter med procentberäkningar
- MA-GEO-07 är för area/omkrets-BERÄKNINGAR
- MA-GEO-03 är ENDAST för lägesord (ovanför, under, bredvid)
- MA-ALG-02 är ENDAST för visuella mönster (röd, blå, röd, ?)
- Division i textuppgifter = MA-PRO-06, inte MA-TAL-03 (om det inte handlar om "dela lika")

**Tillgängliga koder:**
${codesList}

**Uppgifter att granska:**
${problemsList}

**Svara med JSON-array med ENDAST korrigeringar (tom array om alla är korrekta):**
[{"index": 0, "currentCode": "MA-SAN-04", "correctCode": "MA-PRO-06", "reason": "division, not combinatorics"}]`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.warn('[CurriculumValidator] Unexpected response format, skipping validation');
      return problems;
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // No JSON array found - likely empty or no corrections needed
      console.log('[CurriculumValidator] No corrections needed');
      return problems;
    }

    const corrections: CurriculumCorrection[] = JSON.parse(jsonMatch[0]);

    if (corrections.length === 0) {
      console.log('[CurriculumValidator] All codes validated correctly');
      return problems;
    }

    // Apply corrections
    console.log(`[CurriculumValidator] Applying ${corrections.length} correction(s)`);
    for (const fix of corrections) {
      if (fix.index >= 0 && fix.index < problems.length) {
        console.log(`  Problem ${fix.index + 1}: ${fix.currentCode} → ${fix.correctCode} (${fix.reason})`);
        problems[fix.index].lgr22_codes = [fix.correctCode];
      }
    }

    return problems;
  } catch (error) {
    console.error('[CurriculumValidator] Validation error:', error);
    // On error, return problems unchanged (fail open)
    return problems;
  }
}
