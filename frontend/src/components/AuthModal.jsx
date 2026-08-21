import React, { useState } from 'react';
import { X, Lock, Mail, User, LogIn, UserPlus, AlertCircle, Award, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialTab = 'login' }) {
  const [tab, setTab] = useState(initialTab); // 'login' | 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (tab === 'signup' && !formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = tab === 'signup' ? `${API_BASE_URL}/api/auth/signup` : `${API_BASE_URL}/api/auth/login`;
      const bodyData = tab === 'signup'
        ? { name: formData.name.trim(), email: formData.email.trim(), password: formData.password }
        : { email: formData.email.trim(), password: formData.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your details.');
      }

      if (data.token && data.user) {
        setSuccessMessage(tab === 'signup' ? 'Account created successfully!' : 'Logged in successfully!');
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
          onClose();
        }, 500);
      } else {
        throw new Error('Invalid response received from server.');
      }

    } catch (err) {
      console.error('Auth submit error:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-center border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-500 p-0.5 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white">
            {tab === 'login' ? 'Welcome Back' : 'Create Student Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access official ICAI CA exam paper evaluations
          </p>

          {/* Tabs Switcher */}
          <div className="mt-4 grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                tab === 'login'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('signup')}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                tab === 'signup'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Name Input (Signup Only) */}
          {tab === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Rohan Gupta"
                  required={tab === 'signup'}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@ca-foundation.com"
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              <span>{tab === 'login' ? 'Sign In to Account' : 'Create Account & Continue'}</span>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
          {tab === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="text-indigo-400 font-semibold hover:underline"
              >
                Sign up now
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-indigo-400 font-semibold hover:underline"
              >
                Log in here
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
