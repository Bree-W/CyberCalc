'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Terminal, XCircle } from 'lucide-react';

interface FatalShutdownModalProps {
  isOpen: boolean;
  onRestore: () => void;
  expressionTriggered?: string;
}

export default function FatalShutdownModal({
  isOpen,
  onRestore,
  expressionTriggered = 'x / 0',
}: FatalShutdownModalProps) {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [tabCloseAttempted, setTabCloseAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLogLines([]);
      setTabCloseAttempted(false);
      return;
    }

    const messages = [
      `[!] EXCEPTION DETECTED: Arithmetic singularity in expression "${expressionTriggered}"`,
      `[CRITICAL] CPU TRAP #0: DIVIDE-BY-ZERO ERROR (0x00000000)`,
      `[QUANTUM] Spacetime fabric coherence: 0.000%`,
      `[KERNEL] Memory dump initiated at register RIP = 0xDEADBEEFCAFEBABE`,
      `[SYSTEM] Reality division failure: attempting immediate browser termination...`,
      `[SECURITY] Executing window.close() to abort runtime...`,
    ];

    let idx = 0;

    const interval = setInterval(() => {
      if (idx < messages.length) {
        setLogLines(prev => [...prev, messages[idx]]);
        idx++;
      } else {
        clearInterval(interval);
        setTabCloseAttempted(true);
        // Attempt browser tab close
        try {
          window.close();
        } catch {
          // Window close handled gracefully
        }
      }
    }, 400);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, expressionTriggered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 text-red-500 font-mono p-4 overflow-hidden animate-reality-collapse">
      {/* Glitch overlay */}
      <div className="absolute inset-0 bg-red-950/20 pointer-events-none mix-blend-color-dodge" />
      <div className="absolute inset-0 scanlines-overlay opacity-60" />

      <div className="relative max-w-2xl w-full bg-[#0a0505] border-2 border-red-600/80 rounded-lg p-6 shadow-[0_0_50px_rgba(255,0,0,0.5)] z-10">
        {/* Header Warning */}
        <div className="flex items-center space-x-3 pb-4 border-b border-red-800/60 mb-4 text-red-400">
          <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-red-500 glow-text-rose">
              FATAL ERROR: REALITY DIVISION FAILURE
            </h1>
            <p className="text-xs text-red-400/80">SYSTEM INTEGRITY COMPROMISED // SINGULARITY BREACH</p>
          </div>
        </div>

        {/* Console logs */}
        <div className="bg-black/80 rounded border border-red-900/60 p-4 mb-5 h-64 overflow-y-auto text-xs sm:text-sm font-mono space-y-2">
          <div className="flex items-center space-x-2 text-red-400 border-b border-red-950 pb-1 mb-2">
            <Terminal className="w-4 h-4" />
            <span>CORE_DUMP_STREAM // PID: 0x00000000</span>
          </div>
          {logLines.map((line, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-red-600 mr-2">&gt;</span>
              <span className={line.includes('CRITICAL') || line.includes('FATAL') ? 'text-red-400 font-bold' : 'text-red-500/90'}>
                {line}
              </span>
            </div>
          ))}

          {tabCloseAttempted && (
            <div className="pt-2 text-amber-400 border-t border-red-900/40 text-xs">
              <p className="font-semibold text-amber-300">
                [BROWSER RESTRICTION NOTICE]:
              </p>
              <p className="text-amber-400/80 mt-0.5">
                Modern browsers restrict scripts from closing windows not opened via script (<code className="bg-black/60 px-1 text-amber-200">window.close()</code> ignored by browser sandbox).
              </p>
              <p className="text-red-400 mt-1">
                Emergency containment field engaged. CyberCalc is isolated.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-red-900/60">
          <div className="text-xs text-red-400/70 text-center sm:text-left">
            Easter Egg triggered: Division by zero is mathematically undefined.
          </div>
          <button
            onClick={onRestore}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-500/80 text-red-200 hover:text-white rounded transition shadow-[0_0_15px_rgba(255,50,50,0.4)] text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4 animate-spin text-red-300" />
            <span>[ INITIATE EMERGENCY REBOOT ]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
