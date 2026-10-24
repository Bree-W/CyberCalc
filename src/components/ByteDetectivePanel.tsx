'use client';

import React, { useState, useRef } from 'react';
import { InputFormat, ByteAnalysisResult, HistoryEntry, WorkbenchLoad } from '@/types/analysis';
import { AnalystAction, buildAnalystSummary } from '@/lib/analyst';
import { analyzeByteSequence } from '@/lib/byte-analysis';
import ByteGrid from './ByteGrid';
import type { ChefRecipeId } from '@/integrations/cyberchef.ts';
import { SendTarget, ToolParcel } from '@/lib/send-to';
import SendToBar from './SendToBar';
import { useWorkbenchLoad, useWorkbenchReset } from './useWorkbenchLoad';
import {
  Binary,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  Activity,
} from 'lucide-react';

const MAX_FILE_BYTES = 64 * 1024;
const INPUT_FORMATS: InputFormat[] = ['auto', 'hex', 'binary', 'decimal', 'text', 'base64'];

interface ByteDetectivePanelProps {
  onLogHistory: (item: HistoryEntry) => void;
  onSend?: (target: SendTarget, parcel: ToolParcel) => void;
  onApplyAnalyst?: (action: Exclude<AnalystAction, 'none' | 'decode-base64'>, hex: string, text: string) => void;
  loadRequest?: WorkbenchLoad | null;
  resetId?: number;
  initialInput?: string;
  onOpenInCyberChef?: (handoff: { recipe: ChefRecipeId; bytes: Uint8Array }) => void;
}

export default function ByteDetectivePanel({
  onLogHistory,
  onSend,
  onApplyAnalyst,
  loadRequest,
  resetId = 0,
  initialInput = '',
  onOpenInCyberChef,
}: ByteDetectivePanelProps) {
  const [rawInput, setRawInput] = useState<string>(initialInput);
  const [format, setFormat] = useState<InputFormat>('auto');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'grid' | 'hex' | 'binary' | 'decimal' | 'utf8'>('grid');
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [analystBusy, setAnalystBusy] = useState(false);
  const [analystNote, setAnalystNote] = useState<string | null>(null);
  const [analystModel, setAnalystModel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useWorkbenchLoad(loadRequest, 'byte-detective', payload => {
    if (payload.input != null) setRawInput(payload.input);
    if (INPUT_FORMATS.includes(payload.format as InputFormat)) {
      setFormat(payload.format as InputFormat);
    }
    setFileNotice(null);
  });

  useWorkbenchReset(resetId, () => {
    setRawInput('');
    setFormat('auto');
    setFileNotice(null);
    setAnalystNote(null);
    setAnalystModel(null);
  });

  const analysis: ByteAnalysisResult = React.useMemo(() => {
    return analyzeByteSequence(rawInput, format);
  }, [rawInput, format]);

  const askOpenModel = async () => {
    if (analysis.totalBytes === 0 || analystBusy) return;
    setAnalystBusy(true);
    setAnalystNote(null);
    try {
      const summary = buildAnalystSummary(analysis);
      const response = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      const data = (await response.json()) as {
        error?: string;
        explanation?: string;
        action?: AnalystAction;
        model?: string;
      };
      if (!response.ok || !data.explanation || !data.action) {
        setAnalystNote(data.error || 'The model request failed.');
        return;
      }
      setAnalystModel(data.model || null);
      setAnalystNote(data.explanation);
      onLogHistory({
        tool: 'Byte Detective',
        operation: `Open model: ${data.action}`,
        inputSummary: summary.hexPreview.slice(0, 48),
        params: data.model,
        resultSummary: data.explanation,
        restoreTab: 'byte-detective',
        restore: { input: rawInput, format },
      });
      if (data.action === 'decode-base64') {
        const text = analysis.utf8String.trim();
        if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length >= 8) {
          setFormat('base64');
          setRawInput(text);
        }
      } else if (data.action !== 'none') {
        const hex = analysis.hexString.split(/\s+/).slice(0, 1024).join(' ');
        onApplyAnalyst?.(data.action, hex, analysis.utf8String.trim().slice(0, 200));
      }
    } catch {
      setAnalystNote('The model request could not be completed.');
    } finally {
      setAnalystBusy(false);
    }
  };

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
      const allBytes = new Uint8Array(reader.result as ArrayBuffer);
      const bytes = allBytes.slice(0, MAX_FILE_BYTES);
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      setFormat('hex');
      setRawInput(hex);
      setFileNotice(allBytes.length > MAX_FILE_BYTES
        ? `Showing the first ${MAX_FILE_BYTES.toLocaleString()} bytes of ${file.name} (${allBytes.length.toLocaleString()} bytes).`
        : null);
      onLogHistory({
        tool: 'Byte Detective',
        operation: 'Inspect Uploaded File',
        inputSummary: `${file.name} (${file.size} bytes)`,
        params: 'Format: Raw Binary File',
        resultSummary: `${bytes.length} bytes loaded into Byte Detective`,
        restoreTab: 'byte-detective',
        restore: { input: hex, format: 'hex' },
      });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
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
        {(analysis.parseWarning || fileNotice) && (
          <div className="mt-2 flex items-start space-x-2 text-xs font-mono text-amber-300 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{[fileNotice, analysis.parseWarning].filter(Boolean).join(' ')}</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500">Samples</span>
          {(
            [
              ['PE header', '4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00', 'hex'],
              ['Base64', 'SGVsbG8gV29ybGQhIQ==', 'base64'],
              ['Single-byte XOR', '1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736', 'hex'],
            ] as const
          ).map(([label, input, nextFormat]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setFormat(nextFormat);
                setRawInput(input);
                setFileNotice(null);
                onLogHistory({
                  tool: 'Byte Detective',
                  operation: `Sample: ${label}`,
                  inputSummary: input.slice(0, 80),
                  resultSummary: 'Loaded sample',
                  restoreTab: 'byte-detective',
                  restore: { input, format: nextFormat },
                });
              }}
              className="rounded border border-[#202d4a] bg-[#101726] px-2 py-0.5 font-mono text-[11px] text-cyan-300 hover:bg-[#18233a]"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#162035] pt-3">
          {onSend && (
            <SendToBar
              from="byte-detective"
              parcel={{ hex: analysis.hexString, text: analysis.utf8String }}
              onSend={onSend}
              disabled={analysis.totalBytes === 0}
            />
          )}
          <button
            disabled={analysis.totalBytes === 0 || analystBusy}
            onClick={askOpenModel}
            className="ml-auto border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-mono text-cyan-200 disabled:opacity-40"
          >
            {analystBusy ? 'Asking the model…' : 'Ask the open model'}
          </button>
          <p className="w-full text-[11px] font-mono text-slate-500">
            Optional: sends a short analysis summary to DigitalOcean only when you choose this.
            {analystModel ? ` Model: ${analystModel}.` : ''}
          </p>
          {analystNote && <p role="status" className="w-full text-xs font-mono text-slate-200">{analystNote}</p>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500">CyberChef:</span>
          {(
            [
              ['from-hex', 'From Hex'],
              ['magic', 'Magic'],
              ['to-base64', 'To Base64'],
            ] as const
          ).map(([recipe, label]) => (
            <button
              key={recipe}
              type="button"
              data-testid={`chef-${recipe}`}
              onClick={() => {
                if (!onOpenInCyberChef) return;
                const bytes = recipe === 'from-hex'
                  ? new TextEncoder().encode(analysis.hexString || rawInput)
                  : analysis.bytes;
                onOpenInCyberChef({ recipe, bytes });
                onLogHistory({
                  tool: 'Byte Detective',
                  operation: `Open in CyberChef (${label})`,
                  inputSummary: rawInput.slice(0, 80),
                  resultSummary: 'Opened Chef',
                });
              }}
              className="rounded border border-[#202d4a] bg-[#101726] px-2 py-0.5 font-mono text-[11px] text-emerald-300"
            >
              {label}
            </button>
          ))}
        </div>

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
