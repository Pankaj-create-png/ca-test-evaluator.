import React, { useState, useEffect } from 'react';
import {
  History,
  Award,
  BookOpen,
  Calendar,
  FileText,
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  Trash2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import ResultCard from './ResultCard';

export default function HistoryView({ authToken, onBackToEvaluator }) {
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/history', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load evaluation history.');
      }

      setHistoryData(data);
    } catch (err) {
      console.error('Fetch history error:', err);
      setError(err.message || 'An error occurred while loading history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchHistory();
    }
  }, [authToken]);

  const handleDeleteResult = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this evaluation result?')) return;

    try {
      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryData((prev) => {
          if (!prev) return null;
          const updatedResults = prev.results.filter((r) => r.id !== id);
          return { ...prev, results: updatedResults };
        });
        if (selectedResult && selectedResult.id === id) {
          setSelectedResult(null);
        }
      } else {
        alert(data.error || 'Failed to delete record.');
      }
    } catch (err) {
      console.error('Delete history item failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Loading your evaluation history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-900">Failed to Load History</h3>
            <p className="text-xs text-rose-800 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchHistory}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const results = historyData?.results || [];
  const stats = historyData?.stats || { total_tests: 0, avg_percentage: 0, subject_stats: [] };

  // Filter results by search query
  const filteredResults = results.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.subject && r.subject.toLowerCase().includes(q)) ||
      (r.question && r.question.toLowerCase().includes(q)) ||
      (r.feedback && r.feedback.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Evaluation History</h2>
            <p className="text-xs text-slate-500">
              Review all past CA Foundation test assessments & examiner feedback
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToEvaluator}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>New Evaluation</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Stat Card 1: Total Tests */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 block font-mono">
              {stats.total_tests}
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tests Evaluated
            </span>
          </div>
        </div>

        {/* Stat Card 2: Average Score % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            stats.avg_percentage >= 60 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 block font-mono">
              {stats.avg_percentage}%
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Average Grade
            </span>
          </div>
        </div>

        {/* Stat Card 3: Subject Breakdown Overview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Subjects Practiced ({stats.subject_stats?.length || 0})
            </span>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 text-[11px]">
              {stats.subject_stats && stats.subject_stats.length > 0 ? (
                stats.subject_stats.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold shrink-0 border border-slate-200"
                  >
                    {s.subject}: <strong className="text-indigo-600">{s.avg_percentage}%</strong> ({s.count})
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic">No tests recorded yet</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Past Evaluation Cards or Selected Result View */}
      {selectedResult ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => setSelectedResult(null)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Past Tests</span>
          </button>

          {/* Full Result Report View */}
          <ResultCard
            result={selectedResult}
            evaluations={selectedResult.evaluations || [selectedResult]}
            maxMarks={selectedResult.max_marks}
            subject={selectedResult.subject}
            answerImages={
              Array.isArray(selectedResult.image_paths) && selectedResult.image_paths.length > 0
                ? selectedResult.image_paths.map((p, idx) => ({ id: idx, data: p }))
                : []
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past evaluations by subject or question..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredResults.length} of {results.length} evaluations
            </span>
          </div>

          {/* Past Evaluation Cards List */}
          {filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResults.map((item) => {
                const percentage = item.percentage || 0;
                const isImage = item.eval_type === 'image';
                const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                let gradeBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (percentage < 40) gradeBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                else if (percentage < 60) gradeBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedResult(item)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    {/* Top Row: Subject Badge & Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.subject}
                        </span>
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {isImage ? <ImageIcon className="w-3 h-3 text-indigo-600" /> : <FileText className="w-3 h-3 text-slate-600" />}
                          <span>{isImage ? 'Handwritten Image' : 'Typed Answer'}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteResult(item.id, e)}
                        title="Delete test result"
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Question Snippet */}
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                        {item.question || 'CA Foundation Answer Evaluation'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                        "{item.feedback || 'Answer evaluated per ICAI rubrics.'}"
                      </p>
                    </div>

                    {/* Bottom Row: Score Badge & Date */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-extrabold text-slate-900 font-mono">
                          {item.marks_awarded} <span className="text-xs text-slate-400 font-normal">/ {item.max_marks}</span>
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${gradeBadgeColor}`}>
                          {percentage}%
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px]">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-xs space-y-1">
                <h3 className="text-sm font-bold text-slate-800">No Past Evaluations Found</h3>
                <p className="text-xs text-slate-500">
                  {searchQuery ? 'No results matched your search query.' : 'Complete your first CA exam answer evaluation to see it saved here automatically.'}
                </p>
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-300"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
