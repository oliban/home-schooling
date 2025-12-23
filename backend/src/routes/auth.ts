import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../data/database.js';
import { redis, cacheHits, cacheMisses } from '../index.js';
import { generateParentToken, generateChildToken } from '../middleware/auth.js';
import type { Parent, Child, RegisterRequest, LoginRequest, ChildLoginRequest } from '../types/index.js';

const router = Router();

// Cache TTL in seconds
const CHILDREN_CACHE_TTL = 300; // 5 minutes

// Cache key generator for children list by family code
function getChildrenCacheKey(familyCode: string): string {
  return `auth:children:${familyCode}`;
}

// Invalidate children cache for a family code
export async function invalidateChildrenCache(familyCode: string): Promise<void> {
  try {
    await redis.del(getChildrenCacheKey(familyCode));
  } catch (err) {
    // Log but don't fail the operation if cache invalidation fails
    console.error('Cache invalidation error:', err instanceof Error ? err.message : err);
  }
}

// Generate unique 4-digit family code
function generateFamilyCode(): string {
  const db = getDb();
  let code: string;
  let attempts = 0;

  do {
    code = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
    const existing = db.get<{ family_code: string }>('SELECT family_code FROM parents WHERE family_code = ?', [code]);
    if (!existing) break;
    attempts++;
  } while (attempts < 100);

  return code;
}

// Register parent
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body as RegisterRequest;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();

    // Check if email exists
    const existing = db.get<Parent>('SELECT id FROM parents WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const familyCode = generateFamilyCode();

    db.run(
      'INSERT INTO parents (id, email, password_hash, name, family_code) VALUES (?, ?, ?, ?, ?)',
      [id, email.toLowerCase(), passwordHash, name, familyCode]
    );

    const token = generateParentToken({ id, email: email.toLowerCase() });

    res.status(201).json({
      token,
      user: { id, email: email.toLowerCase(), name, familyCode }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login parent
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const parent = db.get<Parent>(
      'SELECT * FROM parents WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!parent) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, parent.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateParentToken({ id: parent.id, email: parent.email });

    res.json({
      token,
      user: { id: parent.id, email: parent.email, name: parent.name, familyCode: (parent as Parent & { family_code: string }).family_code }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Child login with PIN
router.post('/child-login', async (req, res) => {
  try {
    const { childId, pin } = req.body as ChildLoginRequest;

    if (!childId || !pin) {
      return res.status(400).json({ error: 'Child ID and PIN are required' });
    }

    const db = getDb();
    const child = db.get<Child>(
      'SELECT * FROM children WHERE id = ?',
      [childId]
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    if (!child.pin_hash) {
      return res.status(400).json({ error: 'PIN not set for this child' });
    }

    const validPin = await bcrypt.compare(pin, child.pin_hash);
    if (!validPin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = generateChildToken({ id: child.id, parent_id: child.parent_id });

    // Get coins and shop unlock info
    const coins = db.get<{ balance: number; current_streak: number }>(
      'SELECT balance, current_streak FROM child_coins WHERE child_id = ?',
      [child.id]
    );

    // Check if this is a new day login - unlock more shop items
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const childData = db.get<{ last_login_date: string | null; unlocked_shop_items: number; new_item_unlocked_today: number }>(
      'SELECT last_login_date, unlocked_shop_items, new_item_unlocked_today FROM children WHERE id = ?',
      [child.id]
    );

    let newItemUnlocked = false;
    let unlockedShopItems = childData?.unlocked_shop_items || 3;

    if (childData?.last_login_date !== today) {
      // New day - unlock another shop item
      unlockedShopItems = (childData?.unlocked_shop_items || 3) + 1;
      newItemUnlocked = true;

      db.run(
        `UPDATE children SET
          last_login_date = ?,
          unlocked_shop_items = ?,
          new_item_unlocked_today = 1
        WHERE id = ?`,
        [today, unlockedShopItems, child.id]
      );
    }

    res.json({
      token,
      child: {
        id: child.id,
        name: child.name,
        grade_level: child.grade_level,
        coins: coins?.balance || 0,
        streak: coins?.current_streak || 0,
        unlockedShopItems,
        newItemUnlocked: newItemUnlocked || (childData?.new_item_unlocked_today === 1)
      }
    });
  } catch (error) {
    console.error('Child login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get children for parent (for login screen) - uses family_code (4-digit)
router.get('/children/:familyCode', async (req, res) => {
  try {
    const { familyCode } = req.params;
    const cacheKey = getChildrenCacheKey(familyCode);

    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        cacheHits.inc({ cache_type: 'children' });
        return res.json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      // Log cache error but continue to database
      console.error('Cache read error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

    // Cache miss - fetch from database
    cacheMisses.inc({ cache_type: 'children' });

    const db = getDb();

    // Look up parent by family_code
    const parent = db.get<{ id: string }>('SELECT id FROM parents WHERE family_code = ?', [familyCode]);
    if (!parent) {
      return res.status(404).json({ error: 'Family code not found' });
    }

    const children = db.all<Pick<Child, 'id' | 'name'>>(
      'SELECT id, name FROM children WHERE parent_id = ?',
      [parent.id]
    );

    // Store in cache
    try {
      await redis.setex(cacheKey, CHILDREN_CACHE_TTL, JSON.stringify(children));
    } catch (cacheErr) {
      // Log cache write error but don't fail the request
      console.error('Cache write error:', cacheErr instanceof Error ? cacheErr.message : cacheErr);
    }

    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to get children' });
  }
});

export default router;
