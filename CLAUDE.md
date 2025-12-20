# Teacher Portal - Educational Assignment Platform

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
