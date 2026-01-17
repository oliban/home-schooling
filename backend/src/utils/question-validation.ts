/**
 * Question validation utilities
 */

/**
 * Check if a question is answerable (mirrors frontend isQuestionAnswerable)
 * A question is unanswerable if it's multiple_choice with invalid options:
 * - NULL options
 * - empty array []
 * - less than 2 options
 */
export function isAnswerableQuestion(answerType: string | null, options: string | null): boolean {
  if (answerType === 'multiple_choice') {
    if (!options) return false;
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) && parsed.length >= 2;
    } catch {
      return false;
    }
  }
  return true;
}
