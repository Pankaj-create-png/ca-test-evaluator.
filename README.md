# CA Test Evaluator

An automated ICAI CA Foundation answer evaluator powered by Google's Gemini API (`gemini-2.0-flash`), designed to grade student answers strictly according to official ICAI Study Material marking schemes and rubrics.

---

## Supported CA Foundation Subjects
1. **Paper 1: Accounting**
2. **Paper 2: Business Laws**
3. **Paper 3: Quantitative Aptitude** (Business Mathematics, Logical Reasoning & Statistics)
4. **Paper 4: Business Economics**

---

## Tech Stack
- **Frontend**: React 18 + Tailwind CSS + Lucide Icons + Vite (`/frontend`)
- **Backend**: Node.js + Express + Google Gen AI SDK (`@google/genai`, `gemini-2.0-flash`) (`/backend`)

---

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
```

Configure your Google Gemini API Key in `backend/.env`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Start the backend server:
```bash
npm start
# Server runs at http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

---

## API Endpoints

### `GET /api/health`
Checks backend connectivity and API key status.
```json
{
  "status": "ok",
  "app": "CA Test Evaluator API",
  "version": "1.0.0",
  "gemini_configured": true,
  "model": "gemini-2.0-flash",
  "timestamp": "2026-08-19T15:00:00.000Z"
}
```

### `POST /api/evaluate`
Accepts a JSON payload:
```json
{
  "subject": "Business Laws",
  "question": "State the essential elements of a valid contract as per Section 10 of the Indian Contract Act, 1872.",
  "max_marks": 5,
  "student_answer": "A valid contract needs offer, acceptance, consideration..."
}
```

Headers (optional if `GEMINI_API_KEY` is configured in `backend/.env`):
- `x-gemini-api-key`: `AIzaSy...`

Returns:
```json
{
  "success": true,
  "subject": "Business Laws",
  "max_marks": 5,
  "evaluation": {
    "marks_awarded": 3,
    "correct_points": ["Identified essential elements of offer and acceptance correctly."],
    "missing_points": ["Did not mention free consent (Section 14).", "Did not mention lawful object and consideration (Section 23)."],
    "incorrect_points": [],
    "icai_reference": "ICAI Study Material: Paper 2 Business Laws, Chapter 1 'The Indian Contract Act, 1872', Unit 1 - Essential Elements of a Valid Contract (Section 10).",
    "feedback": "Good understanding of initial formation elements. Ensure all statutory essentials under Section 10 are stated for full marks."
  }
}
```
