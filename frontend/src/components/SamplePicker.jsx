import React from 'react';
import { Sparkles, BookCheck } from 'lucide-react';
import { SAMPLE_QUESTIONS } from '../utils/sampleData';

export default function SamplePicker({ onSelectSample, disabled }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Quick Load Sample Questions
            </h2>
            <p className="text-[11px] text-slate-500">
              Select an ICAI Foundation subject question & sample answer to evaluate instantly
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {SAMPLE_QUESTIONS.map((sample, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectSample(sample)}
            className="flex flex-col text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-300 hover:shadow-sm transition-all group disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-slate-200 font-mono">
                {sample.subject}
              </span>
              <span className="text-[10px] text-slate-500 font-medium font-mono">
                {sample.max_marks} Marks
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900 line-clamp-1">
              {sample.title}
            </p>
            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic">
              "{sample.question}"
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
