import React, { useState } from 'react';
import { Key, X, Check, Eye, EyeOff, ShieldAlert } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveKey, serverConfigured }) {
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveKey(keyInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setKeyInput('');
    onSaveKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Google Gemini API Settings</h3>
              <p className="text-xs text-slate-300">Configure Gemini 2.0 Flash for CA Evaluation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {serverConfigured ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-start space-x-2.5">
              <div className="p-1 bg-emerald-100 rounded-md text-emerald-700 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold">Backend Key Configured:</span> An API key is detected in the backend <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">.env</code>. You do not need to provide one here unless you want to override it.
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 flex items-start space-x-2.5">
              <div className="p-1 bg-amber-100 rounded-md text-amber-700 mt-0.5">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold">API Key Required:</span> No key is set in <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">backend/.env</code>. Enter your Google Gemini API key below to enable evaluations.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Google Gemini API Key (AI Studio)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Get your key from Google AI Studio. Stored locally in your browser and sent only to your local backend.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {keyInput && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear Key
              </button>
            )}
            <div className="flex space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
