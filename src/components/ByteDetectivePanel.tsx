'use client';

import React, { useState, useRef } from 'react';
import { InputFormat, ByteAnalysisResult } from '@/types/analysis';
import { analyzeByteSequence } from '@/lib/byte-analysis';
import ByteGrid from './ByteGrid';
import {
  Binary,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface ByteDetectivePanelProps {
  onLogHistory: (item: {
    tool: 'Byte Detective';
    operation: string;
    inputSummary: string;
    params?: string;
    resultSummary: string;
  }) => void;
  initialInput?: string;
}

export default function ByteDetectivePanel({
  onLogHistory,
  initialInput = '',
}: ByteDetectivePanelProps) {
  const [rawInput, setRawInput] = useState<string>(initialInput);
  const [format, setFormat] = useState<InputFormat>('auto');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'grid' | 'hex' | 'binary' | 'decimal' | 'utf8'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute byte analysis
  const analysis: ByteAnalysisResult = React.useMemo(() => {
    return analyzeByteSequence(rawInput, format);
  }, [rawInput, format]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      // Format as hex string with spaces
      const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      setFormat('hex');
      setRawInput(hex);

      onLogHistory({
        tool: 'Byte Detective',
        operation: 'Inspect Uploaded File',
        inputSummary: `${file.name} (${file.size} bytes)`,
        params: 'Format: Raw Binary File',
        resultSummary: `${bytes.length} bytes loaded into Byte Detective`,
      });
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Input & Settings Card */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <Binary className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
              BYTE DETECTIVE INPUT
            </h2>
          </div>

          {/* Format selector buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-[#070b13] p-1 rounded-lg border border-[#18233a] text-xs font-mono">
            {(
              [
                { id: 'auto', label: 'Auto-Detect' },
                { id: 'hex', label: 'Hex' },
                { id: 'binary', label: 'Binary' },
                { id: 'decimal', label: 'Decimal' },
                { id: 'text', label: 'Text (UTF-8)' },
                { id: 'base64', label: 'Base64' },
              ] as const
            ).map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  format === f.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Paste hexadecimal bytes (e.g. 48 65 6c 6c 6f or 4D 5A), binary (01001000), decimal numbers, or plain text..."
            rows={4}
            className="w-full bg-[#070b14] border border-[#1a2640] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-3 font-mono text-xs sm:text-sm text-cyan-200 placeholder:text-slate-600 outline-none resize-y"
          />

          {/* Quick Clear or Upload within input */}
          <div className="absolute right-2 bottom-3 flex items-center space-x-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 px-2 py-1 bg-[#121a2d]/80 hover:bg-[#1b2640] border border-[#233355] text-slate-300 hover:text-white rounded text-xs font-mono transition"
              title="Upload any file to inspect raw bytes"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Load File</span>
            </button>
          </div>
        </div>

        {/* Ambiguity or Format Warning Notice */}
        {analysis.parseWarning && (
          <div className="mt-2 flex items-start space-x-2 text-xs font-mono text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{analysis.parseWarning}</span>
          </div>
        )}

      </div>

      {/* Main Byte Inspection Workbench */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[#182338]">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold font-cyber text-slate-200 text-sm">
              DATA REPRESENTATION &amp; HEXDUMP
            </span>
          </div>

          {/* View Tab Selector */}
          <div className="flex items-center space-x-1 text-xs font-mono bg-[#070a12] p-1 rounded-lg border border-[#182236]">
            {(
              [
                { id: 'grid', label: 'Interactive Grid' },
                { id: 'hex', label: 'Hex String' },
                { id: 'binary', label: 'Binary Stream' },
                { id: 'decimal', label: 'Decimal Array' },
                { id: 'utf8', label: 'Decoded Text' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveViewTab(tab.id)}
                className={`px-2.5 py-1 rounded transition ${
                  activeViewTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on Active View Tab */}
        {activeViewTab === 'grid' && (
          <ByteGrid bytes={analysis.byteDetails} bytesPerRow={16} />
        )}

        {activeViewTab === 'hex' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Hexadecimal Stream ({analysis.totalBytes} bytes)
              </span>
              <button
                onClick={() => copyToClipboard(analysis.hexString, 'hex-stream')}
                className="flex items-center space-x-1 text-xs font-mono px-2 py-1 bg-[#121a2c] hover:bg-[#1a2640] rounded text-slate-300 border border-[#213050]"
              >
                {copiedKey === 'hex-stream' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Hex</span>
              </button>
            </div>
            <textarea
              readOnly
              value={analysis.hexString}
              rows={6}
              className="w-full bg-[#070a12] border border-[#162136] rounded-lg p-3 font-mono text-xs sm:text-sm text-cyan-300 outline-none"
            />
          </div>
        )}

        {activeViewTab === 'binary' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Binary Stream ({analysis.totalBytes * 8} bits)
              </span>
              <button
                onClick={() => copyToClipboard(analysis.binaryString, 'bin-stream')}
                className="flex items-center space-x-1 text-xs font-mono px-2 py-1 bg-[#121a2c] hover:bg-[#1a2640] rounded text-slate-300 border border-[#213050]"
              >
                {copiedKey === 'bin-stream' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Binary</span>
              </button>
            </div>
            <textarea
              readOnly
              value={analysis.binaryString}
              rows={6}
              className="w-full bg-[#070a12] border border-[#162136] rounded-lg p-3 font-mono text-xs sm:text-sm text-cyan-300 outline-none"
            />
          </div>
        )}

        {activeViewTab === 'decimal' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Decimal Byte Array ({analysis.decimalList.length} items)
              </span>
              <button
                onClick={() => copyToClipboard(`[${analysis.decimalList.join(', ')}]`, 'dec-array')}
                className="flex items-center space-x-1 text-xs font-mono px-2 py-1 bg-[#121a2c] hover:bg-[#1a2640] rounded text-slate-300 border border-[#213050]"
              >
                {copiedKey === 'dec-array' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Array</span>
              </button>
            </div>
            <textarea
              readOnly
              value={analysis.decimalList.join(', ')}
              rows={6}
              className="w-full bg-[#070a12] border border-[#162136] rounded-lg p-3 font-mono text-xs sm:text-sm text-emerald-300 outline-none"
            />
          </div>
        )}

        {activeViewTab === 'utf8' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Decoded UTF-8 Text ({analysis.isValidUtf8 ? 'Valid String' : 'Contains Binary Replacements'})
              </span>
              <button
                onClick={() => copyToClipboard(analysis.utf8String, 'utf8-text')}
                className="flex items-center space-x-1 text-xs font-mono px-2 py-1 bg-[#121a2c] hover:bg-[#1a2640] rounded text-slate-300 border border-[#213050]"
              >
                {copiedKey === 'utf8-text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Text</span>
              </button>
            </div>
            <textarea
              readOnly
              value={analysis.utf8String}
              rows={6}
              className="w-full bg-[#070a12] border border-[#162136] rounded-lg p-3 font-mono text-xs sm:text-sm text-purple-200 outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
