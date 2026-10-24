'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, History, Sparkles, Terminal, RotateCcw } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenSamples: () => void;
  onOpenNotices: () => void;
  onReset: () => void;
  historyCount: number;
}

function StatusDot({ label, up }: { label: string; up: boolean | null }) {
  const text = up === null ? 'checking' : up ? 'up' : 'down';
  const color = up === null ? 'text-slate-400' : up ? 'text-emerald-300' : 'text-amber-300';
  return (
    <span className={color}>
      {label}: {text}
    </span>
  );
}

export default function Header({
  onOpenHistory,
  onOpenSamples,
  onOpenNotices,
  onReset,
  historyCount,
}: HeaderProps) {
  const [health, setHealth] = useState<{ cyberchef: boolean; aperisolve: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/integrations/health', { cache: 'no-store' });
        const data = (await response.json()) as { cyberchef?: boolean; aperisolve?: boolean };
        if (!cancelled) {
          setHealth({ cyberchef: Boolean(data.cyberchef), aperisolve: Boolean(data.aperisolve) });
        }
      } catch {
        if (!cancelled) setHealth({ cyberchef: false, aperisolve: false });
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="border-b border-[#1a233a] bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-neon-cyan">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-wider font-cyber bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                CYBERCALC
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-widest font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                CTF &amp; Forensics Suite
              </span>
            </div>
          </div>
        </div>

        {/* Right side controls & live suite status */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div
            data-testid="tool-status"
            className="hidden lg:flex items-center space-x-3 px-2.5 py-1 rounded bg-[#070b12] border border-[#1a233a] font-mono text-[11px]"
          >
            <StatusDot label="CyberChef" up={health ? health.cyberchef : null} />
            <span className="text-slate-600">·</span>
            <StatusDot label="Aperi'Solve" up={health ? health.aperisolve : null} />
            <span className="text-slate-600">·</span>
            <StatusDot label="Shark PCAP" up={true} />
          </div>

          <button
            type="button"
            onClick={onOpenNotices}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] border border-emerald-500/30 text-emerald-300 text-xs font-mono transition"
            title="Third-party licenses and pinned versions"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Licenses</span>
          </button>

          <button
            onClick={onOpenSamples}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] border border-cyan-500/30 text-cyan-300 text-xs font-mono transition"
            title="Load sample CTF & forensic byte sequences"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Samples</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="relative flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] border border-[#23314f] text-slate-300 text-xs font-mono transition"
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
