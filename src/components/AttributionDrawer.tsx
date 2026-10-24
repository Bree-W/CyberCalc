'use client';

import React from 'react';
import { X } from 'lucide-react';
import { aperiSolve, cyberChef, dcode } from '@/integrations/index.ts';

interface AttributionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const tools = [cyberChef, aperiSolve, dcode];

export default function AttributionDrawer({ isOpen, onClose }: AttributionDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        data-testid="attribution-drawer"
        className="h-full w-full max-w-md overflow-y-auto border-l border-[#1a253e] bg-[#0b101c] p-5 shadow-xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-cyber text-lg text-cyan-300">Third-party tools</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#23314f] p-1 text-slate-400 hover:text-slate-200"
            aria-label="Close attribution"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 font-mono text-xs text-slate-400">
          Versions below match THIRD_PARTY_NOTICES.md. CyberCalc wraps these tools. It does not copy their source.
        </p>
        <ul className="space-y-3">
          {tools.map(tool => (
            <li key={tool.id} className="rounded-lg border border-[#1a253e] bg-[#070b14] p-3">
              <div className="font-mono text-sm text-slate-100">{tool.name}</div>
              <div className="mt-1 font-mono text-xs text-cyan-300">{tool.license}</div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{tool.version}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">{tool.kind}</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-[11px] leading-relaxed text-slate-500">
          Aperi&apos;Solve&apos;s version is pyproject.toml 3.7.12 at 9084bad. The upstream .env.example value PROJECT_VERSION=3.1.3 is stale and is not the version.
        </p>
      </aside>
    </div>
  );
}
