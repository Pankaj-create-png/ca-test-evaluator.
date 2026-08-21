import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery, getQuery } from '../db/database.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ca_evaluator_jwt_secret_key_2026';

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }

    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check existing user
    const existingUser = await getQuery('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await runQuery(
      'INSERT INTO users (name, email, hashed_password) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, hashedPassword]
    );

    const userId = result.lastID;

    // Create JWT Token
    const userPayload = { id: userId, name: cleanName, email: cleanEmail };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userPayload
    });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Failed to create user account. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Please enter your email address.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = await getQuery('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.hashed_password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const userPayload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userPayload
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current user payload
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;
