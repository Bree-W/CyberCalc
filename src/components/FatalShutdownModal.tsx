'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

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
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(onRestore, 10000);
    return () => clearTimeout(timeout);
  }, [isOpen, onRestore]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="division-error-title"
        className="w-full max-w-lg border-2 border-white bg-[#f0f0f0] font-sans text-sm text-black shadow-2xl"
      >
        <div className="flex items-center justify-between bg-[#0a246a] px-3 py-2 text-white">
          <span className="font-semibold">CyberCalc Script Error</span>
          <button
            type="button"
            onClick={onRestore}
            aria-label="Close error dialog"
            className="flex h-6 w-7 items-center justify-center border border-white/70 bg-[#c75050] font-bold text-white hover:bg-[#a93636]"
          >
            ×
          </button>
        </div>

        <div className="flex gap-4 p-5 sm:p-6">
          <AlertTriangle aria-hidden="true" className="mt-1 h-10 w-10 shrink-0 text-[#d49b00]" />
          <div className="space-y-3">
            <h1 id="division-error-title" className="text-base font-bold">
              Divided By Zero Error
            </h1>
            <p>
              The expression <code className="break-all font-mono">{expressionTriggered}</code> has no defined result.
            </p>
            <p>
              Division asks for a number <strong>q</strong> such that{' '}
              <strong>divisor × q = dividend</strong>. If the divisor is zero,{' '}
              <strong>0 × q = 0</strong> for every q. A nonzero dividend therefore has no
              solution; for <strong>0 ÷ 0</strong>, every q would work, so there is no
              unique answer. That is why division by zero is undefined.
            </p>
            <p className="text-xs text-[#555]">
              This is a simulated calculator error. The website is still running.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#c8c8c8] bg-[#e5e5e5] px-4 py-3">
          <span className="mr-auto text-xs text-[#555]">Returning to the calculator shortly…</span>
          <button
            type="button"
            onClick={onRestore}
            className="min-w-20 border border-[#555] bg-[#e1e1e1] px-4 py-1.5 font-semibold shadow-[inset_1px_1px_white] hover:bg-white focus:outline focus:outline-2 focus:outline-[#0a246a]"
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}
