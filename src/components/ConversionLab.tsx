'use client';

import React, { useState } from 'react';
import { HistoryEntry, WorkbenchLoad } from '@/types/analysis';
import { useWorkbenchLoad, useWorkbenchReset } from './useWorkbenchLoad';
import { BitWidth, convertFromValue, ConversionState } from '@/lib/conversions';
import {
  ArrowLeftRight,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface ConversionLabProps {
  onLogHistory: (item: HistoryEntry) => void;
  loadRequest?: WorkbenchLoad | null;
  resetId?: number;
}

export default function ConversionLab({ onLogHistory, loadRequest, resetId = 0 }: ConversionLabProps) {
  const [bitWidth, setBitWidth] = useState<BitWidth>(32);
  const [activeBase, setActiveBase] = useState<'bin' | 'hex' | 'dec' | 'oct' | 'text'>('dec');
  const [inputValue, setInputValue] = useState<string>('255');

  useWorkbenchLoad(loadRequest, 'conversion-lab', payload => {
    if (payload.input != null) setInputValue(payload.input);
    if (payload.base === 'bin' || payload.base === 'hex' || payload.base === 'dec' || payload.base === 'oct' || payload.base === 'text') {
      setActiveBase(payload.base);
    }
    if (payload.width === '8' || payload.width === '16' || payload.width === '32' || payload.width === '64') {
      setBitWidth(Number(payload.width) as BitWidth);
    }
  });

  useWorkbenchReset(resetId, () => {
    setBitWidth(32);
    setActiveBase('dec');
    setInputValue('255');
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const state: ConversionState = React.useMemo(() => {
    return convertFromValue(inputValue, activeBase, bitWidth);
  }, [inputValue, activeBase, bitWidth]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleBitToggle = (bitPosition: number) => {
    // Current binary string clean
    const cleanBin = state.binary.replace(/[\s_]/g, '');
    const padded = cleanBin.padStart(bitWidth, '0');
    const bitArr = padded.split('');
    const idx = bitWidth - 1 - bitPosition;
    if (idx >= 0 && idx < bitArr.length) {
      bitArr[idx] = bitArr[idx] === '1' ? '0' : '1';
      const newBin = bitArr.join('');
      setActiveBase('bin');
      setInputValue(newBin);

      onLogHistory({
        tool: 'Conversion Lab',
        operation: `Toggle Bit #${bitPosition}`,
        inputSummary: `Bit ${bitPosition} -> ${bitArr[idx]}`,
        params: `${bitWidth}-bit mode`,
        resultSummary: `Value: ${newBin}`,
        restoreTab: 'conversion-lab',
        restore: { input: newBin, base: 'bin', width: String(bitWidth) },
      });
    }
  };

  const handleBaseChange = (base: 'bin' | 'hex' | 'dec' | 'oct' | 'text') => {
    setActiveBase(base);
    if (base === 'bin') setInputValue(state.binary.replace(/\s+/g, ''));
    else if (base === 'hex') setInputValue(state.hex);
    else if (base === 'dec') setInputValue(state.decimalUnsigned);
    else if (base === 'oct') setInputValue(state.octal);
    else if (base === 'text') setInputValue(state.ascii);
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration & Bit-Width Bar */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
              CONVERSION LAB // MULTI-BASE ARITHMETIC
            </h2>
          </div>

          {/* Bit Width Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-mono text-slate-400 mr-1">Integer Width:</span>
            {([8, 16, 32, 64] as BitWidth[]).map(width => (
              <button
                key={width}
                onClick={() => setBitWidth(width)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                  bitWidth === width
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm'
                    : 'bg-[#101726] text-slate-400 hover:text-slate-200 border border-[#1b2640]'
                }`}
              >
                {width}-bit
              </button>
            ))}
          </div>
        </div>

        {/* Input Base Selector Tabs & Text Input */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#070a13] p-1 rounded-lg border border-[#18233a] text-xs font-mono">
            {(
              [
                { id: 'dec', label: 'Decimal (Base 10)' },
                { id: 'hex', label: 'Hexadecimal (Base 16)' },
                { id: 'bin', label: 'Binary (Base 2)' },
                { id: 'oct', label: 'Octal (Base 8)' },
                { id: 'text', label: 'ASCII / UTF-8 Text' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => handleBaseChange(tab.id)}
                className={`px-3 py-1.5 rounded transition ${
                  activeBase === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={`Enter ${activeBase} value...`}
              className="w-full bg-[#070b14] border border-[#1a2640] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-4 py-3 font-mono text-sm sm:text-base text-emerald-300 outline-none"
            />
            {state.isOverflow && (
              <div className="absolute right-3 top-3 text-xs font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Truncated to {bitWidth}-bit</span>
              </div>
            )}
          </div>

          {state.error && (
            <div className="text-xs font-mono text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Bit-Flipper Visualizer */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 border-b border-[#18233a] pb-2">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
              Interactive Bit Register ({bitWidth} bits)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Click any bit to toggle 0 &harr; 1
          </span>
        </div>

        {/* Clickable bit boxes */}
        <div className="space-y-3 font-mono">
          <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-1 select-none">
            {state.binary
              .replace(/[\s_]/g, '')
              .padStart(bitWidth, '0')
              .split('')
              .map((bit, idx) => {
                const bitPos = bitWidth - 1 - idx;
                const isOne = bit === '1';
                const isSignBit = idx === 0;

                return (
                  <button
                    key={idx}
                    onClick={() => handleBitToggle(bitPos)}
                    className={`flex flex-col items-center justify-center p-1 rounded border transition ${
                      isOne
                        ? isSignBit
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-[#090e18] text-slate-400 border-[#18233a] hover:bg-[#121a2d]'
                    }`}
                    title={`Bit ${bitPos} (Value: 2^${bitPos} = ${1n << BigInt(bitPos)}) ${isSignBit ? '[SIGN BIT]' : ''}`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{bit}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{bitPos}</span>
                  </button>
                );
              })}
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded bg-amber-400" />
                <span>Sign Bit (Bit {bitWidth - 1})</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded bg-emerald-400" />
                <span>Active 1-bit</span>
              </span>
            </div>
            <div>
              MSB (Bit {bitWidth - 1}) &rarr; LSB (Bit 0)
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized Output Formats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
        {/* Hexadecimal */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Hexadecimal (Base 16)</span>
              <button
                onClick={() => copyToClipboard(`0x${state.hex}`, 'hex')}
                className="text-slate-500 hover:text-cyan-400 p-1"
                title="Copy"
              >
                {copiedField === 'hex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-lg font-bold text-cyan-300 break-all">
              0x{state.hex}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {bitWidth / 4} hex nibbles
          </div>
        </div>

        {/* Unsigned Decimal */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Unsigned Decimal (uint{bitWidth})</span>
              <button
                onClick={() => copyToClipboard(state.decimalUnsigned, 'dec-u')}
                className="text-slate-500 hover:text-emerald-400 p-1"
                title="Copy"
              >
                {copiedField === 'dec-u' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-lg font-bold text-emerald-400 break-all">
              {state.decimalUnsigned}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Range: 0 .. {(1n << BigInt(bitWidth)) - 1n}
          </div>
        </div>

        {/* Signed Two's Complement */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Signed Two's Complement (int{bitWidth})</span>
              <button
                onClick={() => copyToClipboard(state.decimalSigned, 'dec-s')}
                className="text-slate-500 hover:text-amber-400 p-1"
                title="Copy"
              >
                {copiedField === 'dec-s' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-lg font-bold text-amber-300 break-all">
              {state.decimalSigned}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {BigInt(state.decimalSigned) < 0n ? 'Negative integer' : 'Positive integer'}
          </div>
        </div>

        {/* Binary Formatted */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Binary Stream (Base 2, 4-bit nibble grouped)</span>
              <button
                onClick={() => copyToClipboard(state.binary, 'bin')}
                className="text-slate-500 hover:text-teal-400 p-1"
                title="Copy"
              >
                {copiedField === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-sm font-bold text-teal-300 break-all">
              {state.binary}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Total {bitWidth} bits
          </div>
        </div>

        {/* Octal */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Octal (Base 8)</span>
              <button
                onClick={() => copyToClipboard(`0o${state.octal}`, 'oct')}
                className="text-slate-500 hover:text-purple-400 p-1"
                title="Copy"
              >
                {copiedField === 'oct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-lg font-bold text-purple-300 break-all">
              0o{state.octal}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Groups of 3 bits
          </div>
        </div>

        {/* ASCII Characters */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>ASCII Representation</span>
              <button
                onClick={() => copyToClipboard(state.ascii, 'ascii')}
                className="text-slate-500 hover:text-cyan-400 p-1"
                title="Copy"
              >
                {copiedField === 'ascii' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-lg font-bold text-slate-200">
              "{state.ascii}"
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {bitWidth / 8} characters
          </div>
        </div>

        {/* Base64 */}
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Base64 Encoded</span>
              <button
                onClick={() => copyToClipboard(state.base64, 'b64')}
                className="text-slate-500 hover:text-cyan-400 p-1"
                title="Copy"
              >
                {copiedField === 'b64' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-sm font-bold text-slate-300 break-all">
              {state.base64}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            RFC 4648 encoding
          </div>
        </div>
      </div>

      {/* Step-by-Step Mathematical Explanation */}
      {state.steps.length > 0 && (
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
          <div className="flex items-center space-x-2 mb-3 border-b border-[#18233a] pb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
              Mathematical Steps &amp; Positional Logic
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {state.steps.map((st, i) => (
              <div key={i} className="bg-[#080d17] border border-[#18243b] rounded-lg p-3">
                <div className="font-bold text-emerald-300 mb-1">{st.title}</div>
                <div className="p-2 bg-[#050810] rounded text-cyan-300 overflow-x-auto text-xs my-1 border border-[#141e30]">
                  <code>{st.formula}</code>
                </div>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {st.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
