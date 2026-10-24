'use client';

import React, { useState } from 'react';
import { ByteInfo } from '@/types/analysis';
import { Copy, Check, Info, Binary, Cpu } from 'lucide-react';

interface ByteGridProps {
  bytes: ByteInfo[];
  bytesPerRow?: number;
  onCopyNotice?: (text: string) => void;
}

export default function ByteGrid({
  bytes,
  bytesPerRow = 16,
  onCopyNotice,
}: ByteGridProps) {
  const [selectedByte, setSelectedByte] = useState<ByteInfo | null>(
    bytes.length > 0 ? bytes[0] : null
  );
  const [hoveredOffset, setHoveredOffset] = useState<number | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (bytes.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-[#1f2d48] rounded-lg bg-[#0a0e17] text-slate-500 font-mono text-sm">
        No byte data to visualize. Enter hex, binary, or text above.
      </div>
    );
  }

  // Chunk bytes into rows
  const rows: ByteInfo[][] = [];
  for (let i = 0; i < bytes.length; i += bytesPerRow) {
    rows.push(bytes.slice(i, i + bytesPerRow));
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    if (onCopyNotice) onCopyNotice(`Copied ${label}`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getByteColorClass = (b: ByteInfo) => {
    if (b.dec === 0x00) return 'text-slate-500 hover:text-slate-300';
    if (b.isPrintable) return 'text-cyan-300 font-medium hover:text-cyan-100';
    if (b.dec > 127) return 'text-amber-400 hover:text-amber-200';
    return 'text-teal-400 hover:text-teal-200';
  };

  return (
    <div className="space-y-4">
      {/* Selected Byte Detailed Inspector Panel */}
      {selectedByte && (
        <div className="bg-[#0b101d] border border-cyan-500/40 rounded-lg p-3 sm:p-4 shadow-neon-cyan transition-all">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2640] pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Byte Inspector // Offset:
              </span>
              <span className="px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-800/80 rounded font-mono text-cyan-300 font-bold text-xs">
                0x{selectedByte.offset.toString(16).padStart(4, '0').toUpperCase()}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                (+{selectedByte.offset}d)
              </span>
            </div>

            <div className="flex items-center space-x-1 text-xs font-mono">
              <button
                onClick={() =>
                  copyToClipboard(
                    `0x${selectedByte.hex}`,
                    `Byte 0x${selectedByte.hex}`
                  )
                }
                className="px-2 py-1 bg-[#131b2e] hover:bg-[#1a2642] text-slate-300 rounded border border-[#233355] flex items-center space-x-1"
              >
                {copiedType === `Byte 0x${selectedByte.hex}` ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Hex</span>
              </button>
              <button
                onClick={() =>
                  copyToClipboard(
                    selectedByte.bin,
                    `Binary ${selectedByte.bin}`
                  )
                }
                className="px-2 py-1 bg-[#131b2e] hover:bg-[#1a2642] text-slate-300 rounded border border-[#233355] flex items-center space-x-1"
              >
                <Binary className="w-3 h-3" />
                <span>Bits</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
            {/* Hex Value */}
            <div className="bg-[#0e1626] p-2.5 rounded border border-[#1b2640]">
              <div className="text-slate-400 text-[11px] mb-1">Hexadecimal</div>
              <div className="text-lg font-bold text-cyan-300">
                0x{selectedByte.hex}
              </div>
              <div className="text-[10px] text-slate-500">
                Nibbles: {selectedByte.highNibble} | {selectedByte.lowNibble}
              </div>
            </div>

            {/* Binary (8-bit) */}
            <div className="bg-[#0e1626] p-2.5 rounded border border-[#1b2640] col-span-2">
              <div className="text-slate-400 text-[11px] mb-1 flex items-center justify-between">
                <span>Binary (8-bit)</span>
                <span className="text-[10px] text-slate-500">MSB &rarr; LSB</span>
              </div>
              <div className="flex space-x-1 pt-0.5">
                {selectedByte.bin.split('').map((bit, idx) => (
                  <span
                    key={idx}
                    className={`flex-1 text-center py-0.5 rounded text-xs font-bold ${
                      bit === '1'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-[#151f33] text-slate-400 border border-[#1e2c48]'
                    }`}
                  >
                    {bit}
                  </span>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-1 px-1">
                <span>2^7 (128)</span>
                <span>2^0 (1)</span>
              </div>
            </div>

            {/* Unsigned Decimal */}
            <div className="bg-[#0e1626] p-2.5 rounded border border-[#1b2640]">
              <div className="text-slate-400 text-[11px] mb-1">Unsigned (uint8)</div>
              <div className="text-lg font-bold text-emerald-400">
                {selectedByte.dec}
              </div>
              <div className="text-[10px] text-slate-500">Range: 0..255</div>
            </div>

            {/* Signed Two's Complement */}
            <div className="bg-[#0e1626] p-2.5 rounded border border-[#1b2640]">
              <div className="text-slate-400 text-[11px] mb-1">Signed (int8)</div>
              <div className="text-lg font-bold text-amber-300">
                {selectedByte.signedDec}
              </div>
              <div className="text-[10px] text-slate-500">Two's complement</div>
            </div>

            {/* Character Representation */}
            <div className="bg-[#0e1626] p-2.5 rounded border border-[#1b2640]">
              <div className="text-slate-400 text-[11px] mb-1">Character</div>
              <div className="text-lg font-bold text-purple-300">
                {selectedByte.isPrintable ? `'${selectedByte.ascii}'` : selectedByte.ascii}
              </div>
              <div className="text-[10px] text-slate-500">
                {selectedByte.isPrintable ? 'Printable ASCII' : 'Non-printable / Ctrl'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hex Dump Table */}
      <div className="bg-[#080c14] border border-[#182338] rounded-lg overflow-x-auto">
        <div className="min-w-[650px] p-3 font-mono text-xs select-none">
          {/* Table Header */}
          <div className="flex items-center pb-2 border-b border-[#182338] text-slate-400 font-semibold mb-2">
            <div className="w-20 text-slate-400">Offset</div>
            <div className="flex-1 grid grid-cols-16 gap-1 text-center px-2">
              {Array.from({ length: bytesPerRow }).map((_, i) => (
                <span key={i} className="text-slate-400">
                  {i.toString(16).toUpperCase()}
                </span>
              ))}
            </div>
            <div className="w-36 text-center text-slate-400 border-l border-[#182338] pl-2">
              ASCII
            </div>
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {rows.map((row, rowIdx) => {
              const rowOffset = rowIdx * bytesPerRow;
              return (
                <div
                  key={rowIdx}
                  className="flex items-center hover:bg-[#0e1526]/50 rounded transition-colors group"
                >
                  {/* Row Offset */}
                  <div className="w-20 font-bold text-cyan-500/80 group-hover:text-cyan-400">
                    {rowOffset.toString(16).padStart(6, '0').toUpperCase()}
                  </div>

                  {/* Hex Bytes */}
                  <div className="flex-1 grid grid-cols-16 gap-1 px-2">
                    {Array.from({ length: bytesPerRow }).map((_, colIdx) => {
                      const byte = row[colIdx];
                      if (!byte) {
                        return <span key={colIdx} className="text-center text-slate-800">··</span>;
                      }

                      const isSelected = selectedByte?.offset === byte.offset;
                      const isHovered = hoveredOffset === byte.offset;

                      return (
                        <button
                          key={colIdx}
                          onClick={() => setSelectedByte(byte)}
                          onMouseEnter={() => setHoveredOffset(byte.offset)}
                          onMouseLeave={() => setHoveredOffset(null)}
                          className={`text-center py-0.5 rounded transition font-mono ${getByteColorClass(
                            byte
                          )} ${
                            isSelected
                              ? 'bg-cyan-500/30 text-cyan-200 ring-1 ring-cyan-400 font-bold'
                              : isHovered
                              ? 'bg-[#1a253d] ring-1 ring-[#344b7a]'
                              : ''
                          }`}
                          title={`Offset: 0x${byte.offset.toString(16)} | Dec: ${byte.dec} | '${byte.ascii}'`}
                        >
                          {byte.hex}
                        </button>
                      );
                    })}
                  </div>

                  {/* ASCII Representation Column */}
                  <div className="w-36 border-l border-[#182338] pl-2 tracking-widest font-mono flex items-center justify-start text-xs">
                    {Array.from({ length: bytesPerRow }).map((_, colIdx) => {
                      const byte = row[colIdx];
                      if (!byte) return <span key={colIdx} className="text-slate-800">·</span>;

                      const isSelected = selectedByte?.offset === byte.offset;
                      const isHovered = hoveredOffset === byte.offset;

                      return (
                        <span
                          key={colIdx}
                          onClick={() => setSelectedByte(byte)}
                          onMouseEnter={() => setHoveredOffset(byte.offset)}
                          onMouseLeave={() => setHoveredOffset(null)}
                          className={`cursor-pointer px-0.5 rounded ${
                            byte.isPrintable ? 'text-slate-200' : 'text-slate-600'
                          } ${
                            isSelected
                              ? 'bg-cyan-500 text-black font-bold'
                              : isHovered
                              ? 'bg-[#223150] text-cyan-300'
                              : ''
                          }`}
                        >
                          {byte.isPrintable ? byte.ascii : '·'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Helpers */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500 px-1">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded bg-cyan-400" />
            <span>Printable ASCII</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded bg-slate-600" />
            <span>Null Bytes (0x00)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded bg-amber-400" />
            <span>High Bytes (&gt;127)</span>
          </span>
        </div>
        <div>
          Total visible: {bytes.length} bytes ({rows.length} rows)
        </div>
      </div>
    </div>
  );
}
