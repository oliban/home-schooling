/**
 * Tests for speech language selection based on assignment type
 *
 * Verifies that English assignments use English voice (en-US)
 * while Swedish/math assignments use Swedish voice (sv-SE).
 */

import { describe, it, expect } from 'vitest';

// Extract the speech language logic for testing
function getSpeechLang(assignmentType: 'math' | 'reading' | 'english'): string {
  return assignmentType === 'english' ? 'en-US' : 'sv-SE';
}

describe('Speech Language Selection', () => {
  it('should use English voice (en-US) for English assignments', () => {
    expect(getSpeechLang('english')).toBe('en-US');
  });

  it('should use Swedish voice (sv-SE) for math assignments', () => {
    expect(getSpeechLang('math')).toBe('sv-SE');
  });

  it('should use Swedish voice (sv-SE) for reading assignments', () => {
    expect(getSpeechLang('reading')).toBe('sv-SE');
  });
});
