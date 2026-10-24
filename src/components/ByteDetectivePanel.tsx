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
  FileCheck2,
  Activity,
  Layers,
  Sparkles,
  Info,
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
  initialInput = '4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00',
  onOpenInCyberChef,
}: ByteDetectivePanelProps) {
  const [rawInput, setRawInput] = useState<string>(initialInput);
  const [format, setFormat] = useState<InputFormat>('auto');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'grid' | 'hex' | 'binary' | 'decimal' | 'utf8'>('grid');
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
        return;
      }
      if (data.action !== 'none') {
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

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const all = new Uint8Array(reader.result as ArrayBuffer);
      const truncated = all.length > MAX_FILE_BYTES;
      const bytes = truncated ? all.slice(0, MAX_FILE_BYTES) : all;
      const hex = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      setFormat('hex');
      setRawInput(hex);
      setFileNotice(
        truncated
          ? `Showing the first ${MAX_FILE_BYTES.toLocaleString()} bytes of ${file.name} (${all.length.toLocaleString()} bytes).`
          : null
      );

      onLogHistory({
        tool: 'Byte Detective',
        operation: 'Inspect Uploaded File',
        inputSummary: truncated
          ? `${file.name} (first 64 KB of ${file.size} bytes)`
          : `${file.name} (${file.size} bytes)`,
        params: 'Format: Raw Binary File',
        resultSummary: `${bytes.length} bytes loaded into Byte Detective`,
        restoreTab: 'byte-detective',
        restore: { input: hex, format: 'hex' },
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
    e.target.value = '';
  };

  const loadSample = (name: string, data: string, fmt: InputFormat) => {
    setFormat(fmt);
    setRawInput(data);
    setFileNotice(null);
    onLogHistory({
      tool: 'Byte Detective',
      operation: `Load Sample: ${name}`,
      inputSummary: data.length > 48 ? data.slice(0, 48) + '…' : data,
      params: `Format: ${fmt}`,
      resultSummary: `Analyzed ${name}`,
      restoreTab: 'byte-detective',
      restore: { input: data, format: fmt },
    });
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
        <div
          className={`relative rounded-lg ${dragOver ? 'ring-2 ring-cyan-400' : ''}`}
          onDragOver={e => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) readFile(file);
          }}
        >
          <textarea
            value={rawInput}
            onChange={e => {
              setRawInput(e.target.value);
              setFileNotice(null);
            }}
            placeholder="Paste hexadecimal bytes, or drop a file here (first 64 KB)..."
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

        {/* Quick Samples Bar */}
        <div className="mt-3 pt-3 border-t border-[#162035] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Quick Samples:</span>
          </span>
          <button
            onClick={() => loadSample('DOS/PE Executable', '4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00', 'hex')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-cyan-300"
          >
            PE Header (4D 5A)
          </button>
          <button
            onClick={() => loadSample('PNG Image', '89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52', 'hex')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-cyan-300"
          >
            PNG Header
          </button>
          <button
            onClick={() => loadSample('ELF Binary', '7F 45 4C 46 02 01 01 00 00 00 00 00 00 00 00 00', 'hex')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-cyan-300"
          >
            ELF Header
          </button>
          <button
            onClick={() => loadSample('ASCII Text', '48 65 6C 6C 6F 20 57 6F 72 6C 64 21', 'hex')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-cyan-300"
          >
            "Hello World!"
          </button>
          <button
            onClick={() => loadSample('Shellcode NOP Sled', '90 90 90 90 90 90 31 C0 50 68 2F 2F 73 68 68 2F', 'hex')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-cyan-300"
          >
            NOP Sled
          </button>
          {onSend && (
            <SendToBar
              from="byte-detective"
              parcel={{ hex: analysis.hexString, text: analysis.utf8String }}
              onSend={onSend}
              disabled={analysis.totalBytes === 0}
            />
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-[#1a253e] bg-[#070b14] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              disabled={analysis.totalBytes === 0 || analystBusy}
              onClick={askOpenModel}
              className="px-3 py-1.5 rounded text-xs font-mono bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 disabled:opacity-40"
            >
              {analystBusy ? 'Asking the model…' : 'Ask the open model'}
            </button>
            <span className="text-[11px] font-mono text-slate-500">
              {analystModel ? analystModel : 'openai-gpt-oss-20b'} · summary only
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
            Sends entropy, signatures, and a short preview to DigitalOcean. The access key stays on the server. The labs still do the math.
          </p>
          {analystNote && (
            <p className="text-xs font-mono text-slate-200 leading-relaxed">{analystNote}</p>
          )}
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Bytes */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3.5">
          <div className="text-slate-400 text-xs font-mono mb-1">Total Byte Count</div>
          <div className="text-2xl font-bold font-cyber text-cyan-400">
            {analysis.totalBytes}
            <span className="text-xs text-slate-500 font-normal ml-1.5">bytes</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {analysis.totalBytes * 8} total bits
          </div>
        </div>

        {/* Shannon Entropy */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3.5">
          <div className="text-slate-400 text-xs font-mono mb-1 flex items-center justify-between">
            <span>Entropy</span>
            <span className="text-[10px] text-slate-500">Max: 8.0</span>
          </div>
          <div className="text-2xl font-bold font-cyber text-emerald-400">
            {analysis.entropy}
          </div>
          <div className="text-[11px] font-mono mt-0.5">
            {analysis.totalBytes < 16 ? (
              <span className="text-slate-400">Need 16+ bytes to classify</span>
            ) : analysis.entropy > 7.3 ? (
              <span className="text-amber-400 font-semibold">High (Encrypted/Compressed)</span>
            ) : analysis.entropy < 2.5 ? (
              <span className="text-teal-400">Low (Repetitive/Sparse)</span>
            ) : (
              <span className="text-slate-400">Medium (Structured/Text)</span>
            )}
          </div>
        </div>

        {/* UTF-8 Validity */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3.5">
          <div className="text-slate-400 text-xs font-mono mb-1">UTF-8 Encoding</div>
          <div className="flex items-center space-x-1.5 mt-1">
            {analysis.isValidUtf8 ? (
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                VALID UTF-8
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                NON-UTF-8 / BINARY
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {analysis.isValidUtf8 ? 'Clean string decode' : 'Byte sequence contains raw binary'}
          </div>
        </div>

        {/* Detected Signatures Count */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3.5">
          <div className="text-slate-400 text-xs font-mono mb-1">File Signatures</div>
          <div className="text-2xl font-bold font-cyber text-teal-400">
            {analysis.signatures.length}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {analysis.signatures.length > 0 ? (
              <span className="text-teal-300 font-semibold">
                {analysis.signatures[0].name.split(' ')[0]} match
              </span>
            ) : (
              'No header signature match'
            )}
          </div>
        </div>
      </div>

      {/* Signature Detection Findings Alert (with forensic disclaimer) */}
      {analysis.signatures.length > 0 && (
        <div className="space-y-3">
          {analysis.signatures.map((sig, idx) => (
            <div
              key={idx}
              className="bg-[#0c1424] border border-cyan-500/40 rounded-xl p-4 shadow-neon-cyan"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1a2846] pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="font-bold text-cyan-300 font-cyber text-sm sm:text-base">
                    {sig.name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#131f38] text-xs font-mono text-cyan-300 border border-cyan-500/30">
                    {sig.extension}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                  <span>Offset: 0x{sig.offset.toString(16).toUpperCase()}</span>
                  <span className="text-slate-600">•</span>
                  <span>Magic: {sig.matchedHex}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mb-2 leading-relaxed">
                {sig.description}
              </p>

              {/* Forensic Disclaimer */}
              <div className="bg-[#070b14] border border-amber-900/50 rounded-lg p-2.5 text-xs text-amber-300/90 font-mono flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{sig.disclaimer}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detected Patterns */}
      {analysis.patterns.length > 0 && (
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Layers className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-teal-300">
              Heuristic Pattern Detections ({analysis.patterns.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.patterns.map((p, idx) => (
              <div
                key={idx}
                className="bg-[#070c16] border border-[#18243b] rounded-lg p-3 text-xs font-mono"
              >
                <div className="font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>{p.title}</span>
                  {p.offsetRange && (
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
                      [+0x{p.offsetRange[0].toString(16)} .. +0x{p.offsetRange[1].toString(16)}]
                    </span>
                  )}
                </div>
                <p className="text-slate-400 leading-relaxed">{p.description}</p>
                {p.details && (
                  <pre className="mt-2 p-2 bg-[#05080f] rounded text-[11px] text-cyan-300/90 overflow-x-auto border border-[#141d30]">
                    {p.details}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
