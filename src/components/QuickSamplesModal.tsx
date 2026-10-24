'use client';

import React from 'react';
import { Sparkles, X, ArrowRight, Binary, Hash, Key, Boxes } from 'lucide-react';
import { ActiveTab } from './Navigation';

interface QuickSamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (tab: ActiveTab, sampleData: string, format?: string) => void;
}

export default function QuickSamplesModal({
  isOpen,
  onClose,
  onSelectSample,
}: QuickSamplesModalProps) {
  if (!isOpen) return null;

  const samples = [
    {
      title: 'Windows PE Executable Header',
      tool: 'byte-detective' as ActiveTab,
      category: 'File Signatures & Forensics',
      data: '4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00',
      description: 'Classic DOS/PE header starting with "MZ" (Mark Zbikowski). Found on all Windows .exe and .dll files.',
    },
    {
      title: 'PNG Image Header',
      tool: 'byte-detective' as ActiveTab,
      category: 'File Signatures & Forensics',
      data: '89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52',
      description: 'Standard 8-byte PNG signature ("\\x89PNG\\r\\n\\x1a\\n") followed by the IHDR chunk marker.',
    },
    {
      title: 'Linux ELF Executable Header',
      tool: 'byte-detective' as ActiveTab,
      category: 'File Signatures & Forensics',
      data: '7F 45 4C 46 02 01 01 00 00 00 00 00 00 00 00 00',
      description: 'Executable and Linkable Format (ELF) 64-bit header ("\\x7FELF") for Linux binaries.',
    },
    {
      title: 'x86 Shellcode NOP Sled + Execve',
      tool: 'byte-detective' as ActiveTab,
      category: 'Binary Exploitation',
      data: '90 90 90 90 90 90 31 C0 50 68 2F 2F 73 68 68 2F 62 69 6E 89 E3 50 53 89 E1 B0 0B CD 80',
      description: 'NOP sled (0x90 repeated) leading into 32-bit x86 execve("/bin/sh") shellcode.',
    },
    {
      title: 'Repeated-Key XOR Specification Case',
      tool: 'bitwise-lab' as ActiveTab,
      category: 'Cryptography',
      data: '41 42 43 44',
      description: 'Spec example: "41 42 43 44" ("ABCD") XORed with key 0x20 toggles bit 5, producing "abcd".',
    },
    {
      title: 'NTLM Windows Password Hash',
      tool: 'hash-detective' as ActiveTab,
      category: 'Password Cracking',
      data: 'cd3707204b407b48325a2cf6c632616f',
      description: 'MD4-based NT hash for "Password123" dumped from Windows SAM or Active Directory NTDS.dit.',
    },
    {
      title: 'Modern Argon2id Password Hash',
      tool: 'hash-detective' as ActiveTab,
      category: 'Password Cracking',
      data: '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgqlfreSAHgQ',
      description: 'State-of-the-art memory-hard hash designed to defeat GPU clusters and ASIC miners.',
    },
    {
      title: 'Endianness Integer Ambiguity',
      tool: 'reverse-eng' as ActiveTab,
      category: 'Reverse Engineering',
      data: '01 02 03 04',
      description: 'Spec example: 01 02 03 04 evaluates to 16,909,060 (Big-Endian) vs 67,305,985 (Little-Endian).',
    },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative max-w-2xl w-full bg-[#0b101c] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#18233a] bg-[#080d16]">
          <div className="flex items-center space-x-2 text-cyan-300 font-cyber text-base font-bold">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>CURATED SAMPLES FOR CTF &amp; FORENSICS</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs flex-1">
          {samples.map((s, idx) => (
            <div
              key={idx}
              className="bg-[#080d17] border border-[#18243b] hover:border-cyan-500/40 rounded-xl p-3.5 transition group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-200 text-sm">
                  {s.title}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#10192e] text-cyan-300 font-bold border border-[#1d2d4f] text-[10px]">
                  {s.category}
                </span>
              </div>

              <div className="p-2 bg-[#050810] rounded border border-[#141e30] my-2 text-cyan-300 font-mono text-xs truncate">
                {s.data}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {s.description}
                </p>
                <button
                  onClick={() => {
                    onSelectSample(s.tool, s.data);
                    onClose();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121c30] hover:bg-[#1a2846] text-cyan-300 rounded border border-[#203050] text-xs font-bold shrink-0 self-end sm:self-auto"
                >
                  <span>Load Sample</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
