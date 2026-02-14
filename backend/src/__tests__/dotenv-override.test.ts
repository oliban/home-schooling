import { describe, it, expect } from 'vitest';

describe('dotenv override configuration', () => {
  it('should use override: true so .env takes priority over shell env vars', async () => {
    // Read index.ts and verify dotenv is configured with override
    const fs = await import('fs');
    const path = await import('path');
    const indexPath = path.resolve(__dirname, '..', 'index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');

    // Must use dotenv.config with override: true
    expect(content).toContain('dotenv.config({ override: true })');
    // Must not use the simple import that doesn't override
    expect(content).not.toContain("import 'dotenv/config'");
  });
});
