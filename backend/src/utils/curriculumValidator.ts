/**
 * Curriculum Code Validator
 *
 * Validates LGR22 curriculum code assignments for generated math problems
 * using Claude Sonnet for semantic analysis.
 */

import Anthropic from '@anthropic-ai/sdk';

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

// Code descriptions for the validator prompt
const CODE_DESCRIPTIONS: Record<string, string> = {
  // Problem-solving codes - for word problems with calculations
  'MA-PRO-03': 'Textuppgifter med +/- (åk 1-3) - word problems solved with addition/subtraction',
  'MA-PRO-06': 'Textuppgifter med +,-,×,÷ (åk 4-6) - word problems solved with the four operations',

  // Number sense codes - for understanding number concepts
  'MA-TAL-03': 'Del av helhet (åk 1-3) - fractions as visual parts (half, third) or fair sharing/division',
  'MA-TAL-06': 'Bråk och decimal (åk 4-6) - calculations WITH fractions/decimals (3/4 of 200)',
  'MA-TAL-07': 'Procent (åk 4-6) - understanding and calculating percentages',

  // Geometry codes
  'MA-GEO-01': 'Grundläggande former (åk 1-3) - recognize shapes: circle, square, triangle',
  'MA-GEO-03': 'Lägesord (åk 1-3) - position words: over, under, beside, between',
  'MA-GEO-07': 'Area/omkrets (åk 4-6) - CALCULATE area (length × width) and perimeter',
  'MA-GEO-08': 'Skala (åk 4-6) - map scale, enlargement/reduction (1:100)',

  // Algebra codes
  'MA-ALG-02': 'Mönster (åk 1-3) - continue patterns (red, blue, red, blue, ?)',
  'MA-ALG-04': 'Ekvationer (åk 4-6) - solve for x (x + 5 = 12, 3x = 15)',
  'MA-ALG-05': 'Talföljder (åk 4-6) - find rule in sequences (2, 4, 6, 8, ?)',

  // Statistics codes
  'MA-SAN-01': 'Slumphändelser (åk 1-3) - understand chance in dice, coins',
  'MA-SAN-04': 'Kombinatorik (åk 4-6) - count COMBINATIONS (3 shirts × 4 pants = 12 outfits)',
  'MA-SAN-06': 'Lägesmått (åk 4-6) - mean, median, mode',
};

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

  // Build the validation prompt
  const codesList = Object.entries(CODE_DESCRIPTIONS)
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
