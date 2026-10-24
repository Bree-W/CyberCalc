'use client';

import React, { useRef, useState } from 'react';
import {
  analyzeEndianness,
  compareByteSequences,
  EndianAnalysisResult,
  BinaryDiffResult,
} from '@/lib/endianness';
import { SIGNATURE_DATABASE } from '@/lib/signatures';
import { parseRawInput } from '@/lib/parse-input';
import {
  Boxes,
  ArrowLeftRight,
  GitCompare,
  FileCheck2,
  Copy,
  Check,
  Search,
  Upload,
} from 'lucide-react';

const MAX_DIFF_FILE_SIZE = 1024 * 1024;

interface ReverseEngineeringLabProps {
  onLogHistory: (item: {
    tool: 'Reverse Engineering';
    operation: string;
    inputSummary: string;
    params?: string;
    resultSummary: string;
  }) => void;
}

export default function ReverseEngineeringLab({
  onLogHistory,
}: ReverseEngineeringLabProps) {
  const [activeTab, setActiveTab] = useState<'endianness' | 'diff' | 'signatures'>('endianness');

  // Endianness State
  const [endianInput, setEndianInput] = useState<string>('');

  // Diff State
  const [diffInputA, setDiffInputA] = useState<string>('');
  const [diffInputB, setDiffInputB] = useState<string>('');
  const [diffFileError, setDiffFileError] = useState<string | null>(null);
  const diffFileARef = useRef<HTMLInputElement>(null);
  const diffFileBRef = useRef<HTMLInputElement>(null);

  // Signature Search State
  const [signatureSearch, setSignatureSearch] = useState<string>('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Compute Endianness
  const endianAnalysis: EndianAnalysisResult = React.useMemo(() => {
    const parsed = parseRawInput(endianInput, 'hex');
    return analyzeEndianness(parsed.bytes);
  }, [endianInput]);

  // Compute Diff
  const diffResult: BinaryDiffResult = React.useMemo(() => {
    const bytesA = parseRawInput(diffInputA, 'hex').bytes;
    const bytesB = parseRawInput(diffInputB, 'hex').bytes;
    return compareByteSequences(bytesA, bytesB);
  }, [diffInputA, diffInputB]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDiffFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    sequence: 'A' | 'B',
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size > MAX_DIFF_FILE_SIZE) {
      setDiffFileError('Choose files that are 1 MiB or smaller.');
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(' ');
      if (sequence === 'A') setDiffInputA(hex);
      else setDiffInputB(hex);
      setDiffFileError(null);
      onLogHistory({
        tool: 'Reverse Engineering',
        operation: `Load Binary Diff File ${sequence}`,
        inputSummary: `${file.name} (${file.size} bytes)`,
        params: `Sequence ${sequence}`,
        resultSummary: `Loaded ${bytes.length} bytes for comparison`,
      });
    } catch (error) {
      const reason = error instanceof Error ? ` ${error.message}` : '';
      setDiffFileError(`Could not read "${file.name}".${reason}`);
    }
  };

  const filteredSignatures = SIGNATURE_DATABASE.filter(sig => {
    const q = signatureSearch.trim().toLowerCase();
    const hexQuery = q.replace(/(?:0x|[\s:-])/g, '');
    const magicHex = sig.magic
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    return (
      sig.name.toLowerCase().includes(q) ||
      sig.extension.toLowerCase().includes(q) ||
      sig.description.toLowerCase().includes(q) ||
      magicHex.includes(hexQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0b101c] border border-[#1a253e] p-2 rounded-xl">
        <button
          onClick={() => setActiveTab('endianness')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeTab === 'endianness'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-neon-teal'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Endianness Inspector</span>
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeTab === 'diff'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-neon-teal'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>Binary Diff (Byte Comparison)</span>
        </button>
        <button
          onClick={() => setActiveTab('signatures')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeTab === 'signatures'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-neon-teal'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Magic Bytes Signature Explorer</span>
        </button>
      </div>

      {/* 1. ENDIANNESS INSPECTOR */}
      {activeTab === 'endianness' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <ArrowLeftRight className="w-5 h-5 text-teal-400" />
                <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
                  ENDIANNESS INSPECTOR // BYTE-ORDER ARCHITECTURES
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-400">
                Hexadecimal Bytes (up to 8 bytes for 64-bit inspection):
              </label>
              <input
                type="text"
                value={endianInput}
                onChange={e => setEndianInput(e.target.value)}
                placeholder="Enter hexadecimal bytes to inspect..."
                className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-4 py-3 font-mono text-sm sm:text-base text-teal-300 outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Memory Layout Diagram */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200 mb-3 border-b border-[#18233a] pb-2">
              Physical Memory Address Layout
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
              {endianAnalysis.memoryLayout.map(item => (
                <div
                  key={item.offset}
                  className="bg-[#080d17] border border-[#18243b] rounded-lg p-3 flex flex-col justify-between"
                >
                  <div className="text-[10px] text-slate-500 border-b border-[#141e30] pb-1 mb-1">
                    Address: <span className="text-teal-400 font-bold">base + {item.offset}</span>
                  </div>
                  <div className="text-xl font-bold text-teal-300 my-1">
                    0x{item.byteHex}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Dec: {item.byteDec} ('{item.char}')
                  </div>
                  <div className="mt-2 pt-1 border-t border-[#141e30] text-[9px] space-y-0.5">
                    <div className="text-cyan-400/80 truncate">
                      BE: {item.bigEndianSignificance}
                    </div>
                    <div className="text-emerald-400/80 truncate">
                      LE: {item.littleEndianSignificance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side Endian Comparison */}
          <div className="space-y-4">
            {endianAnalysis.interpretations.map((interp, idx) => (
              <div
                key={idx}
                className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5"
              >
                <div className="flex items-center justify-between border-b border-[#18233a] pb-2 mb-4">
                  <h4 className="font-bold font-cyber text-slate-100 text-sm sm:text-base">
                    {interp.typeLabel}
                  </h4>
                  <span className="text-xs font-mono text-slate-500">
                    {interp.byteLength * 8} bits / {interp.byteLength} bytes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs mb-3">
                  {/* Big-Endian Box */}
                  <div className="bg-[#080d17] border border-cyan-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between text-cyan-400 font-bold text-sm mb-2">
                      <span>BIG-ENDIAN (Network Order / Motorola)</span>
                      <span className="text-[10px] bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                        MSB First
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Byte Sequence: <span className="text-cyan-300 font-bold">0x{interp.bigEndianHex}</span>
                    </div>
                    <div className="space-y-1.5 bg-[#050810] p-3 rounded border border-[#141e30]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Unsigned:</span>
                        <span className="text-slate-200 font-bold">{interp.bigEndianUnsigned}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Signed (two's comp):</span>
                        <span className="text-slate-200 font-bold">{interp.bigEndianSigned}</span>
                      </div>
                      {interp.floatBigEndian !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">IEEE 754 Float:</span>
                          <span className="text-teal-300 font-bold">{interp.floatBigEndian}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Little-Endian Box */}
                  <div className="bg-[#080d17] border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between text-emerald-400 font-bold text-sm mb-2">
                      <span>LITTLE-ENDIAN (x86 / ARM / Windows / Linux)</span>
                      <span className="text-[10px] bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                        LSB First
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Byte Sequence: <span className="text-emerald-300 font-bold">0x{interp.littleEndianHex}</span>
                    </div>
                    <div className="space-y-1.5 bg-[#050810] p-3 rounded border border-[#141e30]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Unsigned:</span>
                        <span className="text-slate-200 font-bold">{interp.littleEndianUnsigned}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Signed (two's comp):</span>
                        <span className="text-slate-200 font-bold">{interp.littleEndianSigned}</span>
                      </div>
                      {interp.floatLittleEndian !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">IEEE 754 Float:</span>
                          <span className="text-teal-300 font-bold">{interp.floatLittleEndian}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-mono leading-relaxed">
                  <span className="text-teal-400 mr-1">&gt;</span>
                  {interp.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. BINARY DIFF (BYTE COMPARISON) */}
      {activeTab === 'diff' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100 mb-4 flex items-center space-x-2">
              <GitCompare className="w-5 h-5 text-teal-400" />
              <span>BINARY DIFF // BYTE SEQUENCE COMPARATOR</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input
                ref={diffFileARef}
                type="file"
                className="hidden"
                onChange={event => handleDiffFile(event, 'A')}
              />
              <button
                type="button"
                onClick={() => diffFileARef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#101726] hover:bg-[#18233a] border border-[#25324b] text-slate-300 text-xs font-mono"
              >
                <Upload className="w-4 h-4" />
                Load file as A
              </button>
              <input
                ref={diffFileBRef}
                type="file"
                className="hidden"
                onChange={event => handleDiffFile(event, 'B')}
              />
              <button
                type="button"
                onClick={() => diffFileBRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#101726] hover:bg-[#18233a] border border-[#25324b] text-slate-300 text-xs font-mono"
              >
                <Upload className="w-4 h-4" />
                Load file as B
              </button>
              <span className="text-xs text-slate-500 font-mono">Maximum 1 MiB per file</span>
            </div>
            {diffFileError && (
              <p role="alert" className="mb-4 text-xs text-amber-300 font-mono">
                {diffFileError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-cyan-400 mb-1 block">
                  Sequence A (Hex Bytes):
                </label>
                <textarea
                  value={diffInputA}
                  onChange={e => setDiffInputA(e.target.value)}
                  placeholder="Enter hexadecimal bytes or load a file..."
                  rows={3}
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg p-3 font-mono text-xs text-cyan-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-emerald-400 mb-1 block">
                  Sequence B (Hex Bytes):
                </label>
                <textarea
                  value={diffInputB}
                  onChange={e => setDiffInputB(e.target.value)}
                  placeholder="Enter hexadecimal bytes or load a file..."
                  rows={3}
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg p-3 font-mono text-xs text-emerald-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Diff Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3">
              <div className="text-slate-500 text-[10px]">Match Ratio</div>
              <div className="text-xl font-bold text-teal-400 mt-0.5">
                {diffResult.matchPercentage}%
              </div>
            </div>
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3">
              <div className="text-slate-500 text-[10px]">Identical Bytes</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {diffResult.matchingCount}
              </div>
            </div>
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3">
              <div className="text-slate-500 text-[10px]">Mismatched Bytes</div>
              <div className="text-xl font-bold text-red-400 mt-0.5">
                {diffResult.mismatchCount}
              </div>
            </div>
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-3">
              <div className="text-slate-500 text-[10px]">Total Length (A / B)</div>
              <div className="text-xl font-bold text-slate-200 mt-0.5">
                {diffResult.totalA} / {diffResult.totalB}
              </div>
            </div>
          </div>

          {/* Diff Table */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200 mb-3 border-b border-[#18233a] pb-2">
              Offset Comparison Table
            </h3>

            <div className="overflow-x-auto max-h-96">
              {diffResult.entriesTruncated && (
                <p className="mb-2 text-xs text-amber-300 font-mono">
                  Showing the first {diffResult.entries.length.toLocaleString()} byte rows. Summary counts include the full inputs.
                </p>
              )}
              <table className="w-full text-left font-mono text-xs">
                <thead className="sticky top-0 bg-[#0b101c] z-10 border-b border-[#18233a] text-slate-400">
                  <tr>
                    <th className="py-2 px-2">Offset</th>
                    <th className="py-2 px-2">Seq A Hex</th>
                    <th className="py-2 px-2">Seq A Char</th>
                    <th className="py-2 px-2">Seq B Hex</th>
                    <th className="py-2 px-2">Seq B Char</th>
                    <th className="py-2 px-2">Comparison Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141d30]">
                  {diffResult.entries.map(entry => (
                    <tr
                      key={entry.offset}
                      className={
                        entry.isMatch
                          ? 'hover:bg-[#0c1424]'
                          : 'bg-red-950/20 hover:bg-red-950/30'
                      }
                    >
                      <td className="py-2 px-2 text-slate-400 font-bold">
                        0x{entry.offset.toString(16).padStart(4, '0').toUpperCase()}
                      </td>
                      <td className="py-2 px-2 font-bold text-cyan-300">
                        {entry.hexA}
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        '{entry.asciiA}'
                      </td>
                      <td className="py-2 px-2 font-bold text-emerald-300">
                        {entry.hexB}
                      </td>
                      <td className="py-2 px-2 text-slate-300">
                        '{entry.asciiB}'
                      </td>
                      <td className="py-2 px-2">
                        {entry.status === 'match' ? (
                          <span className="text-emerald-400 flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>MATCH</span>
                          </span>
                        ) : entry.status === 'mismatch' ? (
                          <span className="text-red-400 font-bold">
                            DIFFERENT (0x{entry.hexA} &ne; 0x{entry.hexB})
                          </span>
                        ) : entry.status === 'only_a' ? (
                          <span className="text-amber-400">TRUNCATED IN B</span>
                        ) : (
                          <span className="text-purple-400">INSERTION IN B</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SIGNATURE EXPLORER */}
      {activeTab === 'signatures' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-teal-400" />
                <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
                  FILE SIGNATURE DATABASE ({SIGNATURE_DATABASE.length} Signatures)
                </h2>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={signatureSearch}
                  onChange={e => setSignatureSearch(e.target.value)}
                  placeholder="Search name, extension, or magic bytes..."
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg pl-9 pr-3 py-1.5 font-mono text-xs text-teal-200 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSignatures.map((sig, idx) => (
                <div
                  key={idx}
                  className="bg-[#080d17] border border-[#18243b] hover:border-teal-500/40 rounded-lg p-3.5 font-mono text-xs transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 text-sm">
                      {sig.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#10192e] text-teal-300 font-bold border border-[#1d2d4f]">
                      {sig.extension}
                    </span>
                  </div>

                  <div className="p-2 bg-[#050810] rounded border border-[#141e30] my-2 text-cyan-300 font-bold flex items-center justify-between">
                    <span>
                      Magic: {sig.magic.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Offset: 0x{(sig.offset ?? 0).toString(16)}
                    </span>
                  </div>

                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {sig.description}
                  </p>
                </div>
              ))}
            </div>
            {filteredSignatures.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400 font-mono">
                No signatures match that search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
