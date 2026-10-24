'use client';

import React, { useState } from 'react';
import { HistoryEntry, WorkbenchLoad } from '@/types/analysis';
import { useWorkbenchLoad, useWorkbenchReset } from './useWorkbenchLoad';
import {
  BitwiseOp,
  computeBitwiseOperation,
  computeRepeatingKeyXor,
  rankSingleByteXorKeys,
  RepeatingXorResult,
  SingleByteXorCandidate,
} from '@/lib/xor';
import {
  Cpu,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface BitwiseLabProps {
  onLogHistory: (item: HistoryEntry) => void;
  loadRequest?: WorkbenchLoad | null;
  resetId?: number;
}

export default function BitwiseLab({ onLogHistory, loadRequest, resetId = 0 }: BitwiseLabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'bitwise' | 'repeating-xor' | 'single-key-bruteforce'>('repeating-xor');

  // Single Operation State
  const [op, setOp] = useState<BitwiseOp>('XOR');
  const [operandAStr, setOperandAStr] = useState<string>('0x41');
  const [operandBStr, setOperandBStr] = useState<string>('0x20');
  const [opWidth, setOpWidth] = useState<8 | 16 | 32>(8);

  // Repeating XOR State
  const [xorDataInput, setXorDataInput] = useState<string>('41 42 43 44');
  const [xorKeyInput, setXorKeyInput] = useState<string>('20');
  const [xorKeyType, setXorKeyType] = useState<'hex' | 'text' | 'dec'>('hex');
  const [xorDataType, setXorDataType] = useState<'hex' | 'text' | 'auto'>('hex');

  // Single-byte Brute Force State
  const [bruteForceInput, setBruteForceInput] = useState<string>('1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useWorkbenchLoad(loadRequest, 'bitwise-lab', payload => {
    if (payload.subtab === 'repeating-xor' || payload.subtab === 'single-key-bruteforce' || payload.subtab === 'bitwise') {
      setActiveSubTab(payload.subtab);
    }
    if (payload.data != null) {
      setXorDataInput(payload.data);
      setXorDataType('hex');
    }
    if (payload.key != null) {
      setXorKeyInput(payload.key);
      setXorKeyType('hex');
    }
    if (payload.brute != null) {
      setBruteForceInput(payload.brute);
      setActiveSubTab('single-key-bruteforce');
    }
  });

  useWorkbenchReset(resetId, () => {
    setXorDataInput('41 42 43 44');
    setXorKeyInput('20');
    setXorDataType('hex');
    setXorKeyType('hex');
    setBruteForceInput('1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736');
    setOperandAStr('0x41');
    setOperandBStr('0x20');
  });

  // Helper parse BigInt from string
  const parseVal = (str: string): bigint => {
    const trimmed = str.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      return BigInt(trimmed);
    }
    if (trimmed.startsWith('0b') || trimmed.startsWith('0B')) {
      return BigInt(trimmed);
    }
    try {
      return BigInt(trimmed);
    } catch {
      return 0n;
    }
  };

  const bitwiseResult = React.useMemo(() => {
    const a = parseVal(operandAStr);
    const b = parseVal(operandBStr);
    return computeBitwiseOperation(a, op, b, opWidth);
  }, [operandAStr, operandBStr, op, opWidth]);

  const repeatingXorResult: RepeatingXorResult = React.useMemo(() => {
    return computeRepeatingKeyXor(xorDataInput, xorKeyInput, xorKeyType, xorDataType);
  }, [xorDataInput, xorKeyInput, xorKeyType, xorDataType]);

  const bruteForceCandidates: SingleByteXorCandidate[] = React.useMemo(() => {
    // Parse hex or raw string
    const cleaned = bruteForceInput.replace(/[\s0x]/g, '');
    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes[i / 2] = parseInt(cleaned.slice(i, i + 2), 16) || 0;
    }
    return rankSingleByteXorKeys(bytes);
  }, [bruteForceInput]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadExampleXor = () => {
    setXorDataType('hex');
    setXorDataInput('41 42 43 44');
    setXorKeyType('hex');
    setXorKeyInput('20');
    onLogHistory({
      tool: 'Bitwise Operations',
      operation: 'Load Spec Example: 41424344 ^ 20',
      inputSummary: '41 42 43 44',
      params: 'Key: 0x20',
      resultSummary: '61 62 63 64 ("abcd")',
      restoreTab: 'bitwise-lab',
      restore: { subtab: 'repeating-xor', data: '41 42 43 44', key: '20' },
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0b101c] border border-[#1a253e] p-2 rounded-xl">
        <button
          onClick={() => setActiveSubTab('repeating-xor')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeSubTab === 'repeating-xor'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Repeating-Key XOR Lab</span>
        </button>
        <button
          onClick={() => setActiveSubTab('bitwise')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeSubTab === 'bitwise'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Bitwise Logic Visualizer</span>
        </button>
        <button
          onClick={() => setActiveSubTab('single-key-bruteforce')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeSubTab === 'single-key-bruteforce'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Single-Byte XOR CTF Breaker</span>
        </button>
      </div>

      {/* 1. REPEATING-KEY XOR LAB */}
      {activeSubTab === 'repeating-xor' && (
        <div className="space-y-6">
          {/* Main Controls Card */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
                  REPEATING-KEY XOR LAB
                </h2>
              </div>
              <button
                onClick={loadExampleXor}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#101726] hover:bg-[#18233a] border border-cyan-500/30 text-cyan-300 text-xs font-mono"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Spec Example ("41424344" ^ "20")</span>
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Data Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Payload / Data Bytes:</span>
                  <div className="flex items-center space-x-1">
                    {(['hex', 'text', 'auto'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setXorDataType(fmt)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                          xorDataType === fmt
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={xorDataInput}
                  onChange={e => setXorDataInput(e.target.value)}
                  placeholder="Enter hex bytes (e.g. 41 42 43 44) or text..."
                  rows={3}
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg p-3 font-mono text-xs sm:text-sm text-cyan-200 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Key Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">XOR Key (repeats across bytes):</span>
                  <div className="flex items-center space-x-1">
                    {(['hex', 'text', 'dec'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setXorKeyType(fmt)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                          xorKeyType === fmt
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={xorKeyInput}
                  onChange={e => setXorKeyInput(e.target.value)}
                  placeholder="Key (e.g. 20 for case toggle, or SECRET, or 0xDEADBEEF)..."
                  rows={3}
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg p-3 font-mono text-xs sm:text-sm text-teal-300 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Cryptographic Educational Warning */}
          <div className="bg-[#0b101c] border border-amber-900/60 rounded-xl p-4 flex items-start space-x-3 text-xs font-mono text-amber-300/90 leading-relaxed shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-1">
                CRYPTOGRAPHY PRINCIPLE: XOR IS NOT SECURE BY ITSELF
              </span>
              <span>{repeatingXorResult.educationalNote}</span>
            </div>
          </div>

          {/* Output Results Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hexadecimal Result */}
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span>XOR Output (Hexadecimal Bytes)</span>
                  <button
                    onClick={() => copyToClipboard(repeatingXorResult.outputHex, 'xor-hex')}
                    className="p-1 text-slate-400 hover:text-cyan-400"
                  >
                    {copiedKey === 'xor-hex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-3 bg-[#070a13] rounded-lg border border-[#18233a] font-mono text-sm sm:text-base text-cyan-300 break-all select-all">
                  {repeatingXorResult.outputHex || '00'}
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-2">
                Total {repeatingXorResult.outputBytes.length} bytes transformed
              </div>
            </div>

            {/* Decoded Text Result */}
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span>XOR Output (Readable Text)</span>
                  <button
                    onClick={() => copyToClipboard(repeatingXorResult.outputText, 'xor-text')}
                    className="p-1 text-slate-400 hover:text-cyan-400"
                  >
                    {copiedKey === 'xor-text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="p-3 bg-[#070a13] rounded-lg border border-[#18233a] font-mono text-sm sm:text-base text-emerald-300 break-all select-all">
                  "{repeatingXorResult.outputText}"
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-2">
                UTF-8 string representation
              </div>
            </div>
          </div>

          {/* Byte-by-Byte Transformation Table */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200 mb-3 border-b border-[#18233a] pb-2">
              Byte-by-Byte Transformation Stream
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#18233a] text-slate-400">
                    <th className="py-2 px-2">Offset</th>
                    <th className="py-2 px-2">Data Byte</th>
                    <th className="py-2 px-2">^ Key Byte</th>
                    <th className="py-2 px-2">= Result</th>
                    <th className="py-2 px-2">ASCII Change</th>
                    <th className="py-2 px-2">Mathematical Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141d30]">
                  {repeatingXorResult.byteComparisons.map(item => (
                    <tr key={item.offset} className="hover:bg-[#0c1424] transition">
                      <td className="py-2 px-2 text-cyan-400 font-bold">
                        0x{item.offset.toString(16).padStart(4, '0').toUpperCase()}
                      </td>
                      <td className="py-2 px-2 text-slate-200">
                        0x{item.inHex} ('{item.inAscii}')
                      </td>
                      <td className="py-2 px-2 text-teal-400">
                        0x{item.keyHex}
                      </td>
                      <td className="py-2 px-2 text-emerald-400 font-bold">
                        0x{item.outHex} ('{item.outAscii}')
                      </td>
                      <td className="py-2 px-2 text-purple-300">
                        '{item.inAscii}' &rarr; '{item.outAscii}'
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-[11px]">
                        {item.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. BITWISE LOGIC VISUALIZER */}
      {activeSubTab === 'bitwise' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
                  BITWISE OPERATION LAB
                </h2>
              </div>

              {/* Bit Width Selector */}
              <div className="flex items-center space-x-1.5 text-xs font-mono">
                <span className="text-slate-400 mr-1">Width:</span>
                {([8, 16, 32] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => setOpWidth(w)}
                    className={`px-2 py-1 rounded ${
                      opWidth === w
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200 bg-[#101726]'
                    }`}
                  >
                    {w}-bit
                  </button>
                ))}
              </div>
            </div>

            {/* Operator Selection Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4 font-mono text-xs">
              {(['XOR', 'AND', 'OR', 'NOT', 'SHL', 'SHR', 'ROL', 'ROR'] as BitwiseOp[]).map(
                oper => (
                  <button
                    key={oper}
                    onClick={() => setOp(oper)}
                    className={`py-2 px-2 rounded-lg font-bold transition text-center ${
                      op === oper
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-neon-cyan'
                        : 'bg-[#0d1424] text-slate-400 hover:text-slate-200 border border-[#1b2742]'
                    }`}
                  >
                    {oper}
                  </button>
                )
              )}
            </div>

            {/* Operands Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400">Operand A (Hex, Bin, or Dec):</label>
                <input
                  type="text"
                  value={operandAStr}
                  onChange={e => setOperandAStr(e.target.value)}
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-3 py-2 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-500"
                />
              </div>

              {op !== 'NOT' && (
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">
                    Operand B {op.includes('SH') || op.includes('RO') ? '(Shift Amount)' : ''}:
                  </label>
                  <input
                    type="text"
                    value={operandBStr}
                    onChange={e => setOperandBStr(e.target.value)}
                    className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-3 py-2 font-mono text-sm text-teal-300 outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Glowing Bit Visualizer Row */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200 mb-4 border-b border-[#18233a] pb-2">
              Bit-by-Bit Binary Evaluation ({opWidth}-bit)
            </h3>

            <div className="space-y-4 font-mono text-xs sm:text-sm">
              {/* Row A */}
              <div className="flex items-center space-x-3">
                <span className="w-24 text-slate-400 shrink-0 font-bold">A (bits):</span>
                <div className="flex space-x-1 flex-1">
                  {bitwiseResult.binA.split('').map((bit, i) => (
                    <span
                      key={i}
                      className={`flex-1 text-center py-1 rounded font-bold ${
                        bit === '1'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'bg-[#0f1728] text-slate-500 border border-[#18243c]'
                      }`}
                    >
                      {bit}
                    </span>
                  ))}
                </div>
                <span className="w-24 text-right text-cyan-400 font-bold shrink-0">
                  0x{bitwiseResult.operandA.toString(16).toUpperCase()}
                </span>
              </div>

              {/* Row Op & B */}
              {bitwiseResult.binB && (
                <div className="flex items-center space-x-3">
                  <span className="w-24 text-teal-400 shrink-0 font-bold flex items-center space-x-1">
                    <span>{op} B:</span>
                  </span>
                  <div className="flex space-x-1 flex-1">
                    {bitwiseResult.binB.split('').map((bit, i) => (
                      <span
                        key={i}
                        className={`flex-1 text-center py-1 rounded font-bold ${
                          bit === '1'
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                            : 'bg-[#0f1728] text-slate-500 border border-[#18243c]'
                        }`}
                      >
                        {bit}
                      </span>
                    ))}
                  </div>
                  <span className="w-24 text-right text-teal-400 font-bold shrink-0">
                    0x{(bitwiseResult.operandB ?? 0n).toString(16).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t-2 border-dashed border-[#1f2d48] my-2" />

              {/* Result Row */}
              <div className="flex items-center space-x-3">
                <span className="w-24 text-emerald-400 shrink-0 font-bold">RESULT:</span>
                <div className="flex space-x-1 flex-1">
                  {bitwiseResult.binResult.split('').map((bit, i) => (
                    <span
                      key={i}
                      className={`flex-1 text-center py-1 rounded font-bold ${
                        bit === '1'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-neon-teal'
                          : 'bg-[#0f1728] text-slate-500 border border-[#18243c]'
                      }`}
                    >
                      {bit}
                    </span>
                  ))}
                </div>
                <span className="w-24 text-right text-emerald-400 font-bold shrink-0">
                  0x{bitwiseResult.hexResult}
                </span>
              </div>
            </div>

            {/* Explanation card */}
            <div className="mt-5 p-3 rounded-lg bg-[#070b14] border border-[#182338] text-xs font-mono text-slate-300">
              <span className="text-cyan-400 font-bold mr-2">&gt;</span>
              {bitwiseResult.explanation}
            </div>
          </div>
        </div>
      )}

      {/* 3. SINGLE-BYTE XOR CTF BREAKER */}
      {activeSubTab === 'single-key-bruteforce' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Search className="w-5 h-5 text-purple-400" />
              <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
                SINGLE-BYTE XOR BRUTE-FORCE CRACKER
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono mb-3">
              Standard CTF Cryptography Challenge Tool: Tests all 256 single-byte keys (0x00 - 0xFF) and scores plaintexts using English letter frequency analysis.
            </p>

            <textarea
              value={bruteForceInput}
              onChange={e => setBruteForceInput(e.target.value)}
              placeholder="Enter encrypted hex string..."
              rows={3}
              className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg p-3 font-mono text-xs text-purple-200 outline-none focus:border-purple-500"
            />
          </div>

          {/* Top Ranked Keys */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200 mb-3 border-b border-[#18233a] pb-2">
              Top Ranked Single-Byte Keys by English Score
            </h3>

            <div className="space-y-2">
              {bruteForceCandidates.map((cand, idx) => (
                <div
                  key={cand.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#080d17] border border-[#18243b] hover:border-purple-500/40 rounded-lg font-mono text-xs transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-500">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-bold border border-purple-800/60">
                      Key: 0x{cand.keyHex} ('{cand.keyChar}')
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Score: <span className="text-emerald-400 font-bold">{cand.score}</span>
                    </span>
                  </div>

                  <div className="flex-1 text-slate-200 bg-[#050810] px-3 py-1.5 rounded border border-[#141e30] truncate">
                    "{cand.previewText}"
                  </div>

                  <button
                    onClick={() => {
                      setXorKeyType('hex');
                      setXorKeyInput(cand.keyHex);
                      setXorDataType('hex');
                      setXorDataInput(bruteForceInput);
                      setActiveSubTab('repeating-xor');
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-[#121c30] hover:bg-[#1a2846] text-cyan-300 rounded border border-[#203050] text-xs shrink-0"
                  >
                    <span>Load in XOR Lab</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
