# Brainrot-skolan - Educational Assignment Platform

## Overview
A web portal for serving math and reading comprehension (läsförståelse) assignments to children, based on Swedish curriculum LGR 22.

## Architecture
- **Frontend**: Next.js (static) in `/frontend`
- **Backend**: Express.js + better-sqlite3 in `/backend`
- **Deployment**: Docker + Nginx + Fly.io

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Claude Skills Usage

Skills are in `/claude-skills/`. To generate content:

1. **Math problems**: "Use generate-math skill for årskurs 4, category procent, 8 problems"
2. **Reading questions**: "Use generate-reading skill for [book] chapter [n], årskurs [grade]"
3. **Process book OCR**: "Use process-book skill on the OCR output"

## Database
SQLite database at `/data/teacher.db`. Schema in `/backend/src/data/schema.sql`.

## Key Endpoints
- `POST /api/auth/register` - Parent registration
- `POST /api/auth/login` - Parent login
- `POST /api/auth/child-login` - Child PIN login
- `GET /api/children` - List children
- `GET /api/assignments` - List assignments
- `POST /api/assignments/:id/submit` - Submit answers

## Collectibles & Expansion Packs

### How the Shop Works
- Children start with 3 unlocked shop items
- Each daily login unlocks 2 more regular items + 1 LOTR item
- Items are shown in a seeded random order (unique per child)
- `always_visible` items bypass the unlock system

### Adding a New Expansion Pack

1. **Create seed file**: `/backend/src/data/{name}-expansion-seed.ts`
   ```typescript
   export interface MyCollectibleSeed {
     name: string;
     ascii_art: string;
     svg_path: string;
     price: number;
     rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
     expansion_pack: string;
     pronunciation: string;
   }
   export const myCollectibles: MyCollectibleSeed[] = [...]
   ```

2. **Add SVG portraits**: `/frontend/public/portraits/{pack-name}/`

3. **Add seeding in database.ts**: Import and seed like LOTR collectibles

4. **Add unlock counter** (optional): Add `unlocked_{pack}_items` column to children table

5. **Update auth.ts**: Increment the counter on daily login

6. **Update collectibles.ts**: Add filtering logic for the new expansion

### Current Expansions
- **Base set**: 121 Italian brainrot characters (ASCII art)
- **LOTR Italian** (`lotr-italian`): 50 characters with SVG pixel art, 1 unlocked daily

## Development Practices

- **TDD (Test-Driven Development)**: Always write tests first before implementing new features or fixing bugs.
- **Pre-commit hook**: A git hook enforces TDD by rejecting commits with source code changes but no tests. Install with: `./scripts/install-hooks.sh`
- **NEVER bypass hooks**: Never use `--no-verify` or similar flags to bypass git hooks without explicit user permission. If the hook fails, write the required tests.
- **Codebase analysis before writing code**: Before implementing any new function, utility, or component:
  1. Search the codebase for existing similar functionality (use Grep/Glob)
  2. Check for utility functions that already solve the problem
  3. Look for patterns used elsewhere in the codebase
  4. Reuse existing code rather than duplicating functionality
  5. If extending existing code, understand the current implementation first
