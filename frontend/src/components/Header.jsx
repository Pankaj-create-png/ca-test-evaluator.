import React from 'react';
import { Award, Key, CheckCircle2, AlertCircle, RefreshCw, User, LogOut, LogIn, History, PenTool } from 'lucide-react';
import { CA_SUBJECTS } from '../utils/sampleData';

export default function Header({
  activeView = 'evaluator',
  onViewChange,
  user,
  onOpenAuthModal,
  onLogout,
  onOpenKeyModal,
  isKeyConfigured,
  isServerConnected,
  isCheckingHealth,
  onCheckHealth
}) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Logo & Title & Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    CA Test Evaluator
                    <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      ICAI Foundation
                    </span>
                  </h1>
                </div>
                <p className="text-xs text-slate-400">
                  Automated step-by-step grading per official ICAI marking pattern & study modules
                </p>
              </div>
            </div>

            {/* Navigation Mode Tabs */}
            <div className="flex items-center space-x-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onViewChange && onViewChange('evaluator')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'evaluator'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Evaluator</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange && onViewChange('history')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'history'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>My History</span>
              </button>
            </div>
          </div>

          {/* Controls, User Profile & Badges */}
          <div className="flex items-center flex-wrap gap-2.5">
            
            {/* User Auth Profile Status */}
            {user ? (
              <div className="flex items-center space-x-2 bg-indigo-950/60 border border-indigo-800/80 pl-2.5 pr-1.5 py-1 rounded-xl">
                <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="text-[10px] text-slate-400 block leading-none font-medium">Logged in as</span>
                  <span className="font-bold text-indigo-200 truncate max-w-[120px] block">{user.name || user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Log out of account"
                  className="ml-1 p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 border border-indigo-400/30 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In / Sign Up</span>
              </button>
            )}

            {/* Backend Health Status */}
            <button
              onClick={onCheckHealth}
              title="Click to recheck backend connectivity"
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isServerConnected
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
              }`}
            >
              {isCheckingHealth ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ) : isServerConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{isServerConnected ? 'Backend Connected' : 'Backend Offline'}</span>
            </button>

            {/* API Key Modal Button */}
            <button
              onClick={onOpenKeyModal}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isKeyConfigured
                  ? 'bg-indigo-950/40 text-indigo-200 border-indigo-800/60 hover:bg-indigo-900/50'
                  : 'bg-amber-950/50 text-amber-300 border-amber-700/60 hover:bg-amber-900/60 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isKeyConfigured ? 'Gemini Key Active' : 'Set Gemini Key'}</span>
            </button>
          </div>
        </div>

        {/* Paper Quick Chips */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300 shrink-0">Papers Supported:</span>
          {CA_SUBJECTS.map((sub) => (
            <span
              key={sub.id}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50 shrink-0"
            >
              <span>{sub.icon}</span>
              <span>{sub.name}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
