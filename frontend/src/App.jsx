import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SamplePicker from './components/SamplePicker';
import EvaluationForm from './components/EvaluationForm';
import ResultCard from './components/ResultCard';
import ApiKeyModal from './components/ApiKeyModal';
import AuthModal from './components/AuthModal';
import HistoryView from './components/HistoryView';
import { AlertCircle, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { API_BASE_URL } from './config/api';

const DEFAULT_FORM_DATA = {
  subject: 'Business Laws',
  question: 'State the essential elements of a valid contract as per Section 10 of the Indian Contract Act, 1872.',
  max_marks: 5,
  student_answer: `According to the Indian Contract Act 1872, an agreement becomes a valid contract if it satisfies certain essentials:
1. Offer and Acceptance: There must be a lawful offer by one party and lawful acceptance by another.
2. Consideration: Quid pro quo (something in return) is required.
3. Capacity to contract: The parties must be majors, of sound mind, and not disqualified by law.
4. Intention to create legal relationship: Parties must intend to create legal obligations (e.g. Balfour v Balfour).`
};

export default function App() {
  const [activeView, setActiveView] = useState('evaluator'); // 'evaluator' | 'history'
  const [evalMode, setEvalMode] = useState('text'); // 'text' | 'image'
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [questionImages, setQuestionImages] = useState([]);
  const [answerImages, setAnswerImages] = useState([]);

  // Auth State
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('ca_evaluator_jwt_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ca_evaluator_user_info');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ca_evaluator_gemini_key') || '');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [serverHasKey, setServerHasKey] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [evaluationsList, setEvaluationsList] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  // Check token validity on mount
  useEffect(() => {
    if (authToken) {
      fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
        .then((res) => {
          if (!res.ok) {
            handleLogout();
          } else {
            return res.json();
          }
        })
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('ca_evaluator_user_info', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          // Token verification failed or server offline
        });
    }
  }, [authToken]);

  const handleAuthSuccess = (token, userPayload) => {
    setAuthToken(token);
    setUser(userPayload);
    localStorage.setItem('ca_evaluator_jwt_token', token);
    localStorage.setItem('ca_evaluator_user_info', JSON.stringify(userPayload));
    setErrorMessage('');
  };

  const handleLogout = () => {
    setAuthToken('');
    setUser(null);
    localStorage.removeItem('ca_evaluator_jwt_token');
    localStorage.removeItem('ca_evaluator_user_info');
  };

  // Check backend health
  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setIsServerConnected(true);
        setServerHasKey(data.gemini_configured ?? false);
      } else {
        setIsServerConnected(false);
      }
    } catch (err) {
      console.warn('Backend not responding at /api/health:', err);
      setIsServerConnected(false);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSaveKey = (newKey) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem('ca_evaluator_gemini_key', newKey);
    } else {
      localStorage.removeItem('ca_evaluator_gemini_key');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'max_marks' ? (value === '' ? '' : Math.max(1, parseInt(value, 10) || 1)) : value
    }));
  };

  const handleResetForm = () => {
    setFormData({
      subject: 'Business Laws',
      question: '',
      max_marks: 5,
      student_answer: ''
    });
    setQuestionImages([]);
    setAnswerImages([]);
    setEvaluationResult(null);
    setEvaluationsList(null);
    setErrorMessage('');
    setErrorDetails('');
  };

  const handleSelectSample = (sample) => {
    setEvalMode('text');
    setFormData({
      subject: sample.subject,
      question: sample.question,
      max_marks: sample.max_marks,
      student_answer: sample.student_answer
    });
    setEvaluationResult(null);
    setEvaluationsList(null);
    setErrorMessage('');
    setErrorDetails('');
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setErrorDetails('');
    setEvaluationResult(null);
    setEvaluationsList(null);

    // Authentication Guard
    if (!authToken || !user) {
      setErrorMessage('Please log in or create an account to evaluate test answers.');
      setAuthModalTab('login');
      setIsAuthModalOpen(true);
      return;
    }

    const isImageMode = evalMode === 'image';

    // Validation
    if (isImageMode) {
      if (answerImages.length === 0) {
        setErrorMessage("Please upload at least one handwritten answer sheet image.");
        return;
      }
      if (questionImages.length === 0 && !formData.question.trim()) {
        setErrorMessage("Please upload question paper image(s) or type the question text.");
        return;
      }
    } else {
      if (!formData.question.trim()) {
        setErrorMessage('Please provide the exam question.');
        return;
      }
      if (!formData.student_answer.trim()) {
        setErrorMessage("Please provide the student's answer.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };

      if (apiKey && apiKey.trim() !== '') {
        headers['x-gemini-api-key'] = apiKey.trim();
      }

      const endpoint = isImageMode ? `${API_BASE_URL}/api/evaluate-image` : `${API_BASE_URL}/api/evaluate`;
      const bodyData = isImageMode
        ? {
            subject: formData.subject,
            max_marks: Number(formData.max_marks) || 5,
            question_text: formData.question.trim(),
            question_images: questionImages.map((img) => ({ data: img.data, mimeType: img.mimeType })),
            answer_images: answerImages.map((img) => ({ data: img.data, mimeType: img.mimeType }))
          }
        : {
            subject: formData.subject,
            question: formData.question.trim(),
            max_marks: Number(formData.max_marks) || 5,
            student_answer: formData.student_answer.trim()
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'MISSING_API_KEY') {
          setIsKeyModalOpen(true);
        }
        if (data.code === 'UNAUTHORIZED' || data.code === 'INVALID_TOKEN') {
          handleLogout();
          setIsAuthModalOpen(true);
        }
        throw new Error(data.error || 'Failed to evaluate response.');
      }

      if (data.success && (data.evaluation || data.evaluations)) {
        setEvaluationResult(data.evaluation);
        setEvaluationsList(data.evaluations || null);
        
        // Smooth scroll to results
        setTimeout(() => {
          document.getElementById('evaluation-results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error('Received unexpected response structure from server.');
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
      setErrorMessage(err.message || 'An error occurred during evaluation.');
      if (err.details) {
        setErrorDetails(err.details);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isKeyActive = Boolean(serverHasKey || (apiKey && apiKey.trim().length > 5));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <Header
        activeView={activeView}
        onViewChange={(view) => {
          if (view === 'history' && (!user || !authToken)) {
            setAuthModalTab('login');
            setIsAuthModalOpen(true);
            setErrorMessage('Please log in or create an account to view your evaluation history.');
          } else {
            setActiveView(view);
          }
        }}
        user={user}
        onOpenAuthModal={(tab = 'login') => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        isKeyConfigured={isKeyActive}
        isServerConnected={isServerConnected}
        isCheckingHealth={isCheckingHealth}
        onCheckHealth={checkHealth}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {activeView === 'history' ? (
          <HistoryView
            authToken={authToken}
            onBackToEvaluator={() => setActiveView('evaluator')}
          />
        ) : (
          <>
            {/* Sample Quick Selector */}
            <SamplePicker
              onSelectSample={handleSelectSample}
              disabled={isLoading}
            />

            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3 shadow-sm animate-in fade-in">
                <div className="p-1 bg-rose-100 rounded-md text-rose-700 mt-0.5 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-rose-900 font-sans">Evaluation Notice / Error</h3>
                  <p className="text-xs text-rose-800 mt-0.5">{errorMessage}</p>
                  {errorDetails && (
                    <pre className="mt-2 p-2 bg-rose-100/60 rounded text-[11px] font-mono text-rose-950 overflow-x-auto">
                      {errorDetails}
                    </pre>
                  )}
                </div>
                {errorMessage.toLowerCase().includes('log in') ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0"
                  >
                    Log In Now
                  </button>
                ) : errorMessage.toLowerCase().includes('api key') && (
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0"
                  >
                    Set API Key
                  </button>
                )}
              </div>
            )}

            {/* Evaluation Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form (7 cols on lg) */}
              <div className="lg:col-span-7 space-y-6">
                <EvaluationForm
                  evalMode={evalMode}
                  onEvalModeChange={setEvalMode}
                  formData={formData}
                  onChange={handleFormChange}
                  onReset={handleResetForm}
                  onSubmit={handleSubmitEvaluation}
                  questionImages={questionImages}
                  onQuestionImagesChange={setQuestionImages}
                  answerImages={answerImages}
                  onAnswerImagesChange={setAnswerImages}
                  isLoading={isLoading}
                />

                {/* ICAI Evaluation Guidelines Note */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>How This Evaluator Grades</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed text-[11px]">
                    <li><strong className="text-slate-700">Business Laws:</strong> Verifies statutory provisions, section references, and legal reasoning structure.</li>
                    <li><strong className="text-slate-700">Accounting:</strong> Checks accounting principles, classifications, journal entries, and working notes.</li>
                    <li><strong className="text-slate-700">Quantitative Aptitude:</strong> Checks step-by-step methods and awards method marks even if calculation errors occur in later steps.</li>
                    <li><strong className="text-slate-700">Business Economics:</strong> Evaluates theoretical accuracy, assumptions, graph logic, and exceptions per ICAI material.</li>
                    <li><strong className="text-slate-700">Handwriting & OCR:</strong> Multimodal Gemini reads handwritten sheets & tags locations. Ambiguous text is flagged with [unclear].</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Result Card or Empty State (5 cols on lg) */}
              <div className="lg:col-span-5 space-y-6">
                {evaluationResult || evaluationsList ? (
                  <ResultCard
                    result={evaluationResult}
                    evaluations={evaluationsList}
                    maxMarks={formData.max_marks}
                    subject={formData.subject}
                    answerImages={answerImages}
                  />
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[380px]">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h3 className="text-sm font-bold text-slate-800">No Evaluation Generated Yet</h3>
                      <p className="text-xs text-slate-500">
                        Provide typed inputs or upload handwritten answer sheet images on the left, then click <strong className="text-indigo-600">"Evaluate"</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CA Test Evaluator • Powered by Google Gemini Multimodal API</span>
          <span className="font-mono text-[11px]">ICAI Foundation Papers 1, 2, 3 & 4</span>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        serverConfigured={serverHasKey}
      />

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialTab={authModalTab}
      />
    </div>
  );
}
