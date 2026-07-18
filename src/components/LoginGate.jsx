"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';

const SESSION_KEY = 'merch_tracker_authed';

export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated this session
    const isAuthed = sessionStorage.getItem(SESSION_KEY) === 'true';
    setAuthed(isAuthed);
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;

    if (!correctPassword) {
      // No password set — allow access (dev mode)
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthed(true);
      return;
    }

    if (password === correctPassword) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Try again.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 600);
    }
  };

  if (loading) return null;
  if (authed) return children;

  return (
    <div className="min-h-screen bg-[#f8f6f0] flex items-center justify-center px-4">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#c05c3b]/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#b45309]/6 rounded-full blur-3xl" />
      </div>

      <div
        className={`relative w-full max-w-sm transition-all duration-300 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
      >
        {/* Card */}
        <div className="glass-card rounded-3xl p-8 border border-[#e2d6c1] shadow-2xl">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c05c3b] to-[#b45309] shadow-lg shadow-[#c05c3b]/25 mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black font-heading text-[#23201c] tracking-tight">
              Merch Tracker
            </h1>
            <p className="text-sm text-[#8c8273] mt-1 font-medium">
              Private access — enter password to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a89f91] pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                className="w-full bg-white border border-[#ded5c2] rounded-2xl pl-10 pr-11 py-3 text-sm text-[#23201c] font-medium placeholder-[#b4a997] focus:outline-none focus:border-[#c05c3b] focus:ring-2 focus:ring-[#c05c3b]/15 shadow-inner transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a89f91] hover:text-[#5c5549] transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!password}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#c05c3b] to-[#b45309] hover:from-[#ab4e31] hover:to-[#994607] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-[#c05c3b]/20 transition active:scale-[0.98]"
            >
              Enter
            </button>
          </form>
        </div>


      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
