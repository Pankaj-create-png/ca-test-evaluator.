import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  MessageSquare,
  Copy,
  Check,
  MapPin,
  FileSearch,
  PenTool,
  HelpCircle
} from 'lucide-react';
import AnnotatedImageCanvas from './AnnotatedImageCanvas';

export default function ResultCard({ result, evaluations, maxMarks, subject, answerImages = [] }) {
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Determine evaluation items
  const allEvaluations = Array.isArray(evaluations) && evaluations.length > 0
    ? evaluations
    : (result?.evaluations && Array.isArray(result.evaluations) && result.evaluations.length > 0)
    ? result.evaluations
    : (result ? [result] : []);

  const isFullTest = result?.eval_type === 'full_test';
  const hasMultipleQuestions = allEvaluations.length > 1 || isFullTest;
  const currentResult = allEvaluations[activeQIndex] || allEvaluations[0] || result;

  if (!currentResult) return null;

  // Single Question Metrics
  const marksAwarded = Number(currentResult.marks_awarded) || 0;
  const max = Number(currentResult.max_marks || maxMarks) || 5;
  const percentage = Math.round((marksAwarded / max) * 100);
  const isUnclear = Boolean(currentResult.unclear_handwriting);

  // Overall Paper Total Metrics across all questions (uncapped total)
  const totalEarned = (result && typeof result.marks_awarded === 'number' && hasMultipleQuestions)
    ? result.marks_awarded
    : allEvaluations.reduce((sum, q) => sum + (Number(q.marks_awarded) || 0), 0);

  const totalPossible = (result && typeof result.max_marks === 'number' && hasMultipleQuestions)
    ? result.max_marks
    : allEvaluations.reduce((sum, q) => sum + (Number(q.max_marks) || 0), 0);

  const overallPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const unclearCount = allEvaluations.filter((q) => q.unclear_handwriting).length;

  const targetPercentage = hasMultipleQuestions ? overallPercentage : percentage;

  // Status color logic
  let gradeColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let barColor = 'bg-emerald-500';
  let gradeText = 'Exemplary Answer';

  if (!hasMultipleQuestions && isUnclear) {
    gradeColor = 'text-amber-700 bg-amber-50 border-amber-300';
    barColor = 'bg-amber-500';
    gradeText = 'Unclear Handwriting Flagged';
  } else if (targetPercentage < 40) {
    gradeColor = 'text-rose-600 bg-rose-50 border-rose-200';
    barColor = 'bg-rose-500';
    gradeText = 'Needs Significant Revision (Below Passing)';
  } else if (targetPercentage < 60) {
    gradeColor = 'text-amber-600 bg-amber-50 border-amber-200';
    barColor = 'bg-amber-500';
    gradeText = 'Passing Grade - Partial Credit';
  } else if (targetPercentage < 80) {
    gradeColor = 'text-blue-600 bg-blue-50 border-blue-200';
    barColor = 'bg-blue-500';
    gradeText = 'Good Understanding';
  }

  const handleCopy = () => {
    let textToCopy = `ICAI CA Evaluation Summary:\nSubject: ${subject}\n`;
    if (hasMultipleQuestions) {
      textToCopy += `Overall Score: ${totalEarned} / ${totalPossible} (${overallPercentage}%)\nQuestions Evaluated: ${allEvaluations.length}\n\n`;
      allEvaluations.forEach((q, i) => {
        textToCopy += `--- ${q.question_number || `Q${i + 1}`} (${q.marks_awarded}/${q.max_marks}) ---\n`;
        textToCopy += `Feedback: ${q.feedback || 'N/A'}\n\n`;
      });
    } else {
      textToCopy += `${currentResult.question_number ? `Question: ${currentResult.question_number}\n` : ''}`;
      textToCopy += `Score: ${marksAwarded} / ${max} (${percentage}%)\n`;
      textToCopy += `ICAI Reference: ${currentResult.icai_reference || 'N/A'}\n`;
      textToCopy += `Feedback: ${currentResult.feedback || 'N/A'}\n`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="evaluation-results" className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* Top Banner with Score */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {subject}
              </span>
              <span className="text-xs text-slate-300">
                • {hasMultipleQuestions ? 'Full Test Paper Evaluation' : 'Official ICAI Marking Assessment'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              {hasMultipleQuestions ? 'Full Test Evaluation Report' : 'Evaluation Report'}
            </h2>
          </div>

          {/* Copy Report Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-colors border border-white/10 self-start sm:self-auto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>
        </div>

        {/* Multi-Question Selector Tabs if multiple questions returned */}
        {hasMultipleQuestions && (
          <div className="mt-4 flex items-center space-x-1.5 overflow-x-auto pb-1">
            {allEvaluations.map((q, idx) => {
              const qNum = q.question_number || `Q${idx + 1}`;
              const qEarned = Number(q.marks_awarded) || 0;
              const qMax = Number(q.max_marks) || 5;
              const qUnclear = Boolean(q.unclear_handwriting);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 ${
                    activeQIndex === idx
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  <span>{qNum}</span>
                  <span className="font-mono text-[11px]">({qEarned}/{qMax})</span>
                  {qUnclear && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unclear Handwriting"></span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Score Metric Card (Overall Test Summary if Multi-Q, or Single Q metric) */}
        <div className="mt-5 p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="sm:col-span-2">
            <div className="flex items-baseline space-x-2 flex-wrap gap-y-1">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {hasMultipleQuestions ? totalEarned : marksAwarded}
              </span>
              <span className="text-lg font-semibold text-slate-400">
                / {hasMultipleQuestions ? totalPossible : max} Marks
              </span>
              <span className={`ml-2 text-xs font-bold px-2.5 py-0.5 rounded-full border ${gradeColor}`}>
                {targetPercentage}% {hasMultipleQuestions ? 'Total Score' : 'Score'}
              </span>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-2.5 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(Math.max(targetPercentage, 5), 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-700 sm:pl-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              {hasMultipleQuestions ? 'Full Paper Verdict' : 'Assessment Verdict'}
            </p>
            <p className="text-xs font-medium text-slate-200 mt-0.5">{gradeText}</p>
            {hasMultipleQuestions && (
              <p className="text-[10px] text-slate-400 mt-1">
                {allEvaluations.length} Questions Evaluated
                {unclearCount > 0 ? ` • ${unclearCount} Flagged` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Active Question Info Banner when multi-question view */}
        {hasMultipleQuestions && currentResult && (
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
                <FileSearch className="w-3.5 h-3.5 text-purple-700" />
                <span>Selected Breakdown: {currentResult.question_number || `Q${activeQIndex + 1}`}</span>
              </span>
              <span className="text-xs font-bold text-purple-950 font-mono">
                {marksAwarded} / {max} Marks
              </span>
            </div>
            {currentResult.question_text && (
              <p className="text-xs text-purple-950 font-medium leading-relaxed">
                "{currentResult.question_text}"
              </p>
            )}
          </div>
        )}

        {/* Annotated Canvas Answer Sheet Viewer (If Answer Sheet Images Uploaded) */}
        {answerImages && answerImages.length > 0 && (
          <AnnotatedImageCanvas
            answerImages={answerImages}
            evaluations={allEvaluations}
            activeQuestionIndex={activeQIndex}
          />
        )}

        {/* Answer Location Badge (If Image Evaluation) */}
        {currentResult.location && (currentResult.location.page || currentResult.location.position) && (
          <div className="p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 block">
                  Answer Location in Uploaded Sheet
                </span>
                <span className="text-xs font-bold text-indigo-950">
                  Page {currentResult.location.page || 1}
                  {currentResult.location.position ? ` • ${currentResult.location.position}` : ''}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-1 bg-white border border-indigo-200 text-indigo-800 rounded-md">
              Annotated Reference
            </span>
          </div>
        )}

        {/* Unclear Handwriting Warning Banner */}
        {isUnclear && (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start space-x-3 shadow-xs">
            <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg shrink-0 mt-0.5">
              <PenTool className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                Unclear / Illegible Handwriting Detected
              </h3>
              <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                Could not confidently read this answer - please retype it in the text form Column instead.
              </p>
            </div>
          </div>
        )}

        {/* Transcribed Handwriting snippet (If present) */}
        {currentResult.handwriting_transcription && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <FileSearch className="w-3.5 h-3.5 text-indigo-600" />
                <span>Extracted Handwriting Transcription</span>
              </span>
              <span className="text-[10px] text-slate-400">AI OCR</span>
            </div>
            <p className="text-xs text-slate-800 font-mono bg-white p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
              {currentResult.handwriting_transcription}
            </p>
          </div>
        )}
        
        {/* ICAI Reference Box */}
        {currentResult.icai_reference && (
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-start space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 mt-0.5 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                ICAI Study Material Reference
              </h3>
              <p className="text-xs text-indigo-950 mt-1 font-medium leading-relaxed">
                {currentResult.icai_reference}
              </p>
            </div>
          </div>
        )}

        {/* Correct Points List */}
        <div>
          <div className="flex items-center space-x-2 mb-2.5">
            <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Awarded Points & Valid Steps ({currentResult.correct_points?.length || 0})
            </h3>
          </div>

          {currentResult.correct_points && currentResult.correct_points.length > 0 ? (
            <ul className="space-y-2">
              {currentResult.correct_points.map((pt, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-xs text-emerald-950 font-medium flex items-start space-x-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-200/70 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-50 border border-slate-200">
              No matching valid concepts or points found in the provided answer.
            </p>
          )}
        </div>

        {/* Missing Points List */}
        <div>
          <div className="flex items-center space-x-2 mb-2.5">
            <div className="p-1 bg-amber-100 text-amber-700 rounded-md">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Missing Concepts / Scope for Marks ({currentResult.missing_points?.length || 0})
            </h3>
          </div>

          {currentResult.missing_points && currentResult.missing_points.length > 0 ? (
            <ul className="space-y-2">
              {currentResult.missing_points.map((pt, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs text-amber-950 font-medium flex items-start space-x-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-200/70 text-amber-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    !
                  </span>
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-700 italic p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              Great job! All essential ICAI study material key points were covered.
            </p>
          )}
        </div>

        {/* Incorrect Points (if any) */}
        {currentResult.incorrect_points && currentResult.incorrect_points.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2.5">
              <div className="p-1 bg-rose-100 text-rose-700 rounded-md">
                <XCircle className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Conceptual / Calculation Errors Flagged ({currentResult.incorrect_points.length})
              </h3>
            </div>

            <ul className="space-y-2">
              {currentResult.incorrect_points.map((pt, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-950 font-medium flex items-start space-x-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ✕
                  </span>
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Examiner's Feedback */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex items-start space-x-3.5 shadow-sm">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg shrink-0 mt-0.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              ICAI Examiner's Feedback & Recommendation
            </h3>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed font-normal">
              {currentResult.feedback || 'Answer evaluated per official ICAI suggested answer rubrics.'}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
