# Home Schooling - Educational Portal for Kids

A gamified educational platform for children based on the Swedish curriculum (LGR 22), featuring math exercises and reading comprehension with a collectible reward system.

## Features

- **Math Exercises**: Grade-specific math problems (grades 1-9)
- **Reading Comprehension**: AI-generated questions from text passages
- **Coin Rewards**: Earn coins for correct answers with streak bonuses
- **Collectibles Shop**: 120 unique "brainrot" ASCII art characters to collect
- **Progressive Unlocking**: New shop items unlock daily
- **Text-to-Speech**: Swedish voice for questions, Italian voice for character names
- **Multi-language**: Swedish and English UI support

## Tech Stack

**Backend:**
- Node.js with Express
- SQLite (better-sqlite3)
- JWT authentication
- TypeScript

**Frontend:**
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- TypeScript

## Project Structure

```
homeschooling/
├── backend/
│   ├── src/
│   │   ├── data/           # Database, schema, seeds
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth middleware
│   │   └── types/          # TypeScript types
│   └── dist/               # Compiled output
├── frontend/
│   ├── app/                # Next.js pages
│   │   ├── child/          # Child dashboard, assignments, collection
│   │   ├── parent/         # Parent dashboard, child management
│   │   └── login/          # Login page
│   ├── components/         # Reusable components
│   ├── lib/                # API client, language context
│   └── messages/           # i18n translations (sv.json, en.json)
└── data/
    └── homeschooling.db    # SQLite database
```

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

1. **Clone and install dependencies:**

```bash
cd homeschooling

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

2. **Start the backend:**

```bash
cd backend
npm run dev
```

The API runs on `http://localhost:6001`

3. **Start the frontend:**

```bash
cd frontend
npm run dev
```

The app runs on `http://localhost:3000`

## Usage

### Parent Flow

1. Register at `/login` (parent tab)
2. Note your 4-digit family code
3. Add children from the parent dashboard
4. Set a 4-digit PIN for each child
5. Create assignments (math or reading)

### Child Flow

1. Go to `/login`
2. Enter family code (4 digits)
3. Select your name and enter PIN
4. Complete assignments to earn coins
5. Spend coins in the collectibles shop

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register parent |
| `/api/auth/login` | POST | Parent login |
| `/api/auth/child-login` | POST | Child login with PIN |
| `/api/auth/children/:familyCode` | GET | Get children for family |
| `/api/children` | GET/POST | List/create children |
| `/api/children/:id` | GET/PUT/DELETE | Manage child |
| `/api/assignments` | GET/POST | List/create assignments |
| `/api/assignments/:id` | GET | Get assignment with questions |
| `/api/assignments/:id/submit` | POST | Submit answer |
| `/api/collectibles` | GET | List collectibles (with unlock limits) |
| `/api/collectibles/:id/buy` | POST | Purchase collectible |

## Database Schema

Main tables:
- `parents` - Parent accounts with family codes
- `children` - Child profiles linked to parents
- `child_coins` - Coin balances and streaks
- `assignments` - Math and reading assignments
- `math_problems` / `reading_questions` - Assignment questions
- `collectibles` - 120 ASCII art characters
- `child_collectibles` - Owned collectibles

## Environment Variables

**Backend:**
```
PORT=6001
JWT_SECRET=your-secret-key
DATABASE_PATH=/path/to/homeschooling.db  # Optional, defaults to ./data/homeschooling.db
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=http://localhost:6001/api
```

## Collectibles System

- **120 unique characters** with Italian-style names
- **Rarities**: Common (50), Rare (35), Epic (25), Legendary (10)
- **Prices**: 100-150 (Common), 200-350 (Rare), 400-600 (Epic), 800-2000 (Legendary)
- **Progressive unlocking**: Starts with 3 visible, +1 per day on login
- **Voice**: Click character art to hear name in Italian

## Coin Rewards

- Base reward: 50 coins per correct answer
- Streak bonus: +5 coins per consecutive correct answer (up to +25)
- Example: 5 correct in a row = 50 + 25 = 75 coins

## License

Private project.
