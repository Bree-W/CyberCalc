'use client';

import React from 'react';
import { ShieldCheck, History, Sparkles, Terminal, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenSamples: () => void;
  onReset: () => void;
  historyCount: number;
}

export default function Header({
  onOpenHistory,
  onOpenSamples,
  onReset,
  historyCount,
}: HeaderProps) {
  return (
    <header className="border-b border-[#1a233a] bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-neon-cyan">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-wider font-cyber bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                CYBERCALC
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-widest font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                v1.0 workbench
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block tracking-wide">
              Decode it. Transform it. Understand it.
            </p>
          </div>
        </div>

        {/* Right side controls & privacy indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Privacy status badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0d1424] border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local labs / opt-in model</span>
          </div>

          {/* Quick samples button */}
          <button
            onClick={onOpenSamples}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] border border-cyan-500/30 text-cyan-300 text-xs font-mono transition"
            title="Load sample CTF & forensic byte sequences"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Samples</span>
          </button>

          {/* History drawer button */}
          <button
            onClick={onOpenHistory}
            className="relative flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] border border-[#23314f] text-slate-300 text-xs font-mono transition"
            title="View session transformation history"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded bg-[#101726] hover:bg-[#1b253b] border border-[#23314f] text-slate-400 hover:text-slate-200 transition"
            title="Clear all inputs and reset workbench"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
