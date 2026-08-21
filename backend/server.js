import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import evaluateRouter from './routes/evaluate.js';
import evaluateImageRouter from './routes/evaluateImage.js';
import authRouter from './routes/auth.js';
import historyRouter from './routes/history.js';
import { authenticateToken } from './middleware/authMiddleware.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-gemini-api-key', 'x-anthropic-api-key']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploaded result images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health-check endpoint
app.get('/api/health', (req, res) => {
  const isConfigured = Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim() !== '')
  );

  res.json({
    status: 'ok',
    app: 'CA Test Evaluator API',
    version: '1.0.0',
    gemini_configured: isConfigured,
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    timestamp: new Date().toISOString()
  });
});

// API Auth & History Routes
app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);

// Protected Evaluation API Routes
app.post('/api/evaluate', authenticateToken);
app.use('/api', evaluateRouter);

app.post('/api/evaluate-image', authenticateToken);
app.use('/api', evaluateImageRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
app.listen(PORT, () => {
  const isConfigured = Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') ||
    (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim() !== '')
  );
  console.log(`===========================================`);
  console.log(`  CA Test Evaluator Backend running on port ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Evaluate API: http://localhost:${PORT}/api/evaluate`);
  console.log(`  Model: ${process.env.GEMINI_MODEL || 'gemini-3.6-flash'}`);
  console.log(`  Gemini Key: ${isConfigured ? 'Configured in .env' : 'Not set in .env (can pass via UI/Header)'}`);
  console.log(`===========================================`);
});
