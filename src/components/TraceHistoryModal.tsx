'use client';

import React from 'react';
import { TraceHistoryItem } from '@/types/analysis';
import { History, X, Copy, Check, Trash2, ArrowUpRight } from 'lucide-react';

interface TraceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: TraceHistoryItem[];
  onClear: () => void;
  onSelectHistoryItem?: (item: TraceHistoryItem) => void;
}

export default function TraceHistoryModal({
  isOpen,
  onClose,
  history,
  onClear,
  onSelectHistoryItem,
}: TraceHistoryModalProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyResult = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative max-w-2xl w-full bg-[#0b101c] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#18233a] bg-[#080d16]">
          <div className="flex items-center space-x-2 text-cyan-300 font-cyber text-base font-bold">
            <History className="w-5 h-5 text-cyan-400" />
            <span>SESSION TRANSFORMATION HISTORY ({history.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            {history.length > 0 && (
              <button
                onClick={onClear}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs font-mono text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs flex-1">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-sm">
              No transformations logged in this session yet.
            </div>
          ) : (
            history.map(item => (
              <div
                key={item.id}
                className="bg-[#080d17] border border-[#18243b] hover:border-cyan-500/40 rounded-xl p-3.5 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[#10192e] text-cyan-300 font-bold border border-[#1d2d4f] text-[11px]">
                      {item.tool}
                    </span>
                    <span className="text-slate-200 font-bold">
                      {item.operation}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="space-y-1 my-2 bg-[#050810] p-2.5 rounded border border-[#141e30]">
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-500">Input:</span>
                    <span className="text-cyan-200 truncate max-w-xs">{item.inputSummary}</span>
                  </div>
                  {item.params && (
                    <div className="flex justify-between text-slate-400">
                      <span className="text-slate-500">Params:</span>
                      <span className="text-teal-300 truncate max-w-xs">{item.params}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300 font-bold pt-1 border-t border-[#101726]">
                    <span className="text-slate-500">Result:</span>
                    <span className="text-emerald-400 truncate max-w-xs">{item.resultSummary}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => copyResult(item.resultSummary, item.id)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#11192b] hover:bg-[#19243d] border border-[#1f2e4d] text-slate-300"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy Result</span>
                  </button>
                  {onSelectHistoryItem && (
                    <button
                      onClick={() => {
                        onSelectHistoryItem(item);
                        onClose();
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#11192b] hover:bg-[#19243d] border border-[#1f2e4d] text-cyan-300"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Re-load</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
