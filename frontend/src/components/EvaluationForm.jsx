import React from 'react';
import { Play, RotateCcw, FileText, Camera, UploadCloud, Layers } from 'lucide-react';
import { CA_SUBJECTS } from '../utils/sampleData';
import ImageUploadForm from './ImageUploadForm';

export default function EvaluationForm({
  evalMode = 'text',
  onEvalModeChange,
  formData,
  onChange,
  onReset,
  onSubmit,
  questionImages = [],
  onQuestionImagesChange,
  answerImages = [],
  onAnswerImagesChange,
  isLoading
}) {
  const wordCount = formData.student_answer
    ? formData.student_answer.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const charCount = formData.student_answer ? formData.student_answer.length : 0;

  const isImageMode = evalMode === 'image';

  // Validation logic for submit button
  const canSubmit = isImageMode
    ? (answerImages.length > 0 && (questionImages.length > 0 || formData.question.trim().length > 0))
    : (formData.question.trim().length > 0 && formData.student_answer.trim().length > 0);

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Top Header & Mode Toggle Bar */}
      <div className="px-5 py-4 bg-slate-50/90 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              {isImageMode ? <Camera className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {isImageMode ? 'Image-Based Answer Sheet Evaluation' : 'Typed Answer Evaluation'}
              </h2>
              <p className="text-xs text-slate-500">
                {isImageMode
                  ? 'Upload images of question paper & handwritten answer sheet for AI grading'
                  : 'Type or paste the exam question and written student response'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Form</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => !isLoading && onEvalModeChange('text')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              !isImageMode
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Typed Text Answer</span>
          </button>

          <button
            type="button"
            onClick={() => !isLoading && onEvalModeChange('image')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              isImageMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload Handwritten Sheet</span>
            <span className="text-[10px] bg-amber-400 text-amber-950 font-extrabold px-1.5 py-0.5 rounded-md ml-1">
              NEW
            </span>
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        
        {/* Image Upload Component when in Image Mode */}
        {isImageMode && (
          <ImageUploadForm
            questionImages={questionImages}
            onQuestionImagesChange={onQuestionImagesChange}
            answerImages={answerImages}
            onAnswerImagesChange={onAnswerImagesChange}
            isLoading={isLoading}
          />
        )}

        {/* Subject & Max Marks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Subject Dropdown */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>CA Foundation Paper / Subject *</span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">Select Paper</span>
            </label>
            <select
              id="subject-select"
              name="subject"
              value={formData.subject}
              onChange={onChange}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-800 shadow-sm"
              required
            >
              {CA_SUBJECTS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.id})
                </option>
              ))}
            </select>
          </div>

          {/* Max Marks Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Max Marks *</span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">(1 - 25)</span>
            </label>
            <input
              id="max-marks-input"
              type="number"
              name="max_marks"
              min="1"
              max="25"
              step="1"
              value={formData.max_marks}
              onChange={onChange}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-800 text-center shadow-sm"
              required
            />
          </div>
        </div>

        {/* Question Text Area */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
            <span>
              Exam Question {isImageMode ? '(Optional if Question Paper Image Uploaded)' : '*'}
            </span>
            <span className="text-[10px] text-slate-400 font-normal normal-case">
              {isImageMode ? 'Can be extracted from image or typed here' : 'State problem statement'}
            </span>
          </label>
          <textarea
            id="question-textarea"
            name="question"
            rows={isImageMode ? 2 : 3}
            placeholder={
              isImageMode
                ? 'Optional: Type question text if not uploading question paper image...'
                : 'e.g., State the essential elements of a valid contract as per Section 10 of the Indian Contract Act, 1872.'
            }
            value={formData.question}
            onChange={onChange}
            disabled={isLoading}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 shadow-sm placeholder:text-slate-400 resize-y"
            required={!isImageMode && questionImages.length === 0}
          />
        </div>

        {/* Student's Typed Answer (Only in Text Mode) */}
        {!isImageMode && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Student's Written Answer *
              </label>
              <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} chars</span>
              </div>
            </div>
            <textarea
              id="student-answer-textarea"
              name="student_answer"
              rows={8}
              placeholder="Paste or type the student's answer here. For Quantitative Aptitude, include all working steps and formulas. For Business Laws, include applicable sections and reasoning..."
              value={formData.student_answer}
              onChange={onChange}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 shadow-sm placeholder:text-slate-400 font-sans leading-relaxed resize-y font-normal"
              required={!isImageMode}
            />
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            id="evaluate-button"
            type="submit"
            disabled={isLoading || !canSubmit}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>
                  {isImageMode ? 'Reading Images & Evaluating Handwriting...' : 'Evaluating via ICAI Marking Rubric...'}
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {isImageMode ? 'Evaluate Handwritten Answer Sheet' : 'Evaluate Answer'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
