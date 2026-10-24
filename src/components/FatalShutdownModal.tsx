'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, Terminal } from 'lucide-react';

type ShutdownStage = 'shutdown' | 'explanation';

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
  const [stage, setStage] = useState<ShutdownStage>('shutdown');

  useEffect(() => {
    if (!isOpen) {
      setLogLines([]);
      setStage('shutdown');
      return;
    }

    setLogLines([]);
    setStage('shutdown');

    const messages = [
      `[!] EXCEPTION DETECTED: Arithmetic singularity in expression "${expressionTriggered}"`,
      `[CRITICAL] CPU TRAP #0: DIVIDE-BY-ZERO ERROR (0x00000000)`,
      `[QUANTUM] Spacetime fabric coherence: 0.000%`,
      `[KERNEL] Memory dump initiated at register RIP = 0xDEADBEEFCAFEBABE`,
      `[SYSTEM] Simulating shutdown...`,
      `[SYSTEM] Shutdown simulation complete. The application is still running.`,
    ];

    let idx = 0;
    let returnTimeout: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      if (idx < messages.length) {
        setLogLines(prev => [...prev, messages[idx]]);
        idx++;
      } else {
        clearInterval(interval);
        setStage('explanation');
        returnTimeout = setTimeout(onRestore, 6000);
      }
    }, 400);

    return () => {
      clearInterval(interval);
      if (returnTimeout) clearTimeout(returnTimeout);
    };
  }, [isOpen, expressionTriggered, onRestore]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-2xl max-h-[80vh] overflow-y-auto text-red-500 font-mono">
      <div className="relative w-full bg-[#0a0505]/95 border-2 border-red-600/80 rounded-lg p-6 shadow-2xl">
        <div className="flex items-center space-x-3 pb-4 border-b border-red-800/60 mb-4 text-red-400">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-red-500">
              {stage === 'shutdown' ? 'FAKE SHUTDOWN SIMULATION' : 'ERROR: DIVISION BY ZERO'}
            </h1>
            <p className="text-xs text-red-400/80">
              {stage === 'shutdown'
                ? 'SIMULATION ONLY // THE APP WILL NOT SHUT DOWN'
                : 'The calculator and website are still running normally.'}
            </p>
          </div>
        </div>

        {stage === 'shutdown' ? (
          <div className="bg-black/80 rounded border border-red-900/60 p-4 mb-5 max-h-64 overflow-y-auto text-xs sm:text-sm font-mono space-y-2">
            <div className="flex items-center space-x-2 text-red-400 border-b border-red-950 pb-1 mb-2">
              <Terminal className="w-4 h-4" />
              <span>FAKE_SHUTDOWN_LOG</span>
            </div>
            {logLines.map((line, i) => (
              <div key={i} className="leading-relaxed">
                <span className="text-red-600 mr-2">&gt;</span>
                <span className="text-red-400">{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/80 rounded border border-red-900/60 p-4 mb-5 text-sm space-y-3">
            <p className="text-red-300">
              The expression <code className="text-amber-300">{expressionTriggered}</code> has no defined result because it divides by zero.
            </p>
            <p className="text-slate-200">
              Division asks for a number <span className="text-cyan-300">q</span> such that
              {' '}<span className="text-cyan-300">dividend = divisor × q</span>.
              When the divisor is zero, <span className="text-cyan-300">0 × q = 0</span> for every
              number <span className="text-cyan-300">q</span>. So a nonzero dividend has no solution;
              for <span className="text-cyan-300">0 ÷ 0</span>, every number would be a solution,
              so there is no unique answer. Therefore, division by zero is undefined.
            </p>
            <p className="text-amber-300/90 text-xs">
              Returning to the calculator automatically…
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-red-900/60">
          <p className="text-xs text-red-400/70">
            {stage === 'shutdown' ? 'This is only a visual easter egg.' : 'Your calculator is ready to use.'}
          </p>
          <button
            onClick={onRestore}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-500/80 text-red-200 hover:text-white rounded transition text-sm font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return to calculator</span>
          </button>
        </div>
      </div>
    </div>
  );
}
