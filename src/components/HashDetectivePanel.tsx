'use client';

import React, { useState, useEffect } from 'react';
import {
  detectHashType,
  calculateCrc32,
  calculateMd5,
  calculateWebCryptoHash,
  HashDetectionResult,
} from '@/lib/hash-detective';
import {
  Hash,
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Cpu,
  Key,
} from 'lucide-react';

interface HashDetectivePanelProps {
  onLogHistory: (item: {
    tool: 'Hash Detective';
    operation: string;
    inputSummary: string;
    params?: string;
    resultSummary: string;
  }) => void;
  initialHash?: string;
}

export default function HashDetectivePanel({
  onLogHistory,
  initialHash = '',
}: HashDetectivePanelProps) {
  const [hashInput, setHashInput] = useState<string>(initialHash);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Generator State
  const [generatorText, setGeneratorText] = useState<string>('CyberCalc2026');
  const [generatedHashes, setGeneratedHashes] = useState<Record<string, string>>({});

  const detection: HashDetectionResult = React.useMemo(() => {
    return detectHashType(hashInput);
  }, [hashInput]);

  // Compute live generator hashes
  useEffect(() => {
    let isMounted = true;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(generatorText);

    const crc = calculateCrc32(bytes);
    const md5 = calculateMd5(bytes);

    Promise.all([
      calculateWebCryptoHash('SHA-1', bytes),
      calculateWebCryptoHash('SHA-256', bytes),
      calculateWebCryptoHash('SHA-512', bytes),
    ]).then(([sha1, sha256, sha512]) => {
      if (isMounted) {
        setGeneratedHashes({
          'CRC-32': crc,
          'MD5': md5,
          'SHA-1': sha1,
          'SHA-256': sha256,
          'SHA-512': sha512,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [generatorText]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Input & Identification Card */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-teal-400" />
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100">
              HASH DETECTIVE // ALGORITHM CLASSIFIER
            </h2>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Length: <span className="text-teal-300 font-bold">{detection.charLength}</span> chars (
            {detection.detectedCharset})
          </div>
        </div>

        {/* Input box */}
        <div className="relative">
          <input
            type="text"
            value={hashInput}
            onChange={e => setHashInput(e.target.value)}
            placeholder="Paste a hash to inspect its likely algorithm..."
            className="w-full bg-[#070b14] border border-[#1a2640] focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg px-3.5 py-3 font-mono text-xs sm:text-sm text-teal-200 placeholder:text-slate-600 outline-none pr-20"
          />
          {hashInput && (
            <button
              onClick={() => setHashInput('')}
              className="absolute right-3 top-3 px-2 py-0.5 text-xs font-mono bg-[#131b2e] hover:bg-[#1a2640] text-slate-400 hover:text-slate-200 rounded border border-[#223150]"
            >
              Clear
            </button>
          )}
        </div>

      </div>

      {/* Primary Detection & Likelihood Section */}
      {detection.primaryMatch && hashInput.trim() ? (
        <div className="bg-[#0c1424] border border-teal-500/40 rounded-xl p-5 shadow-neon-teal">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1b2946] pb-4 mb-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="text-xl sm:text-2xl font-bold font-cyber text-teal-300">
                  {detection.primaryMatch.name}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    detection.primaryMatch.securityStatus === 'Secure'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                      : detection.primaryMatch.securityStatus === 'Broken'
                      ? 'bg-red-950/80 text-red-300 border border-red-500/50'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                  }`}
                >
                  {detection.primaryMatch.securityStatus}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                Category: <span className="text-slate-200">{detection.primaryMatch.category}</span>
                {detection.primaryMatch.sampleUse && (
                  <span className="hidden sm:inline"> • Common: {detection.primaryMatch.sampleUse}</span>
                )}
              </p>
            </div>

            {/* Primary Confidence Bar */}
            <div className="w-full lg:w-72 bg-[#080d17] p-3 rounded-lg border border-[#1b2640]">
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="text-slate-400">Match Confidence</span>
                <span className="font-bold text-teal-300">
                  {detection.primaryMatch.confidence}%
                </span>
              </div>
              {/* Animated Progress Bar */}
              <div className="w-full bg-[#121a2d] h-3 rounded-full overflow-hidden p-0.5 border border-[#1f2e4d]">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${detection.primaryMatch.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Description & Technical Metadata */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
            {detection.primaryMatch.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-[#080d17] p-2.5 rounded border border-[#162136]">
              <div className="text-slate-500 text-[10px]">Digest Bit Length</div>
              <div className="font-bold text-teal-300 mt-0.5">
                {detection.primaryMatch.bitLength} bits
              </div>
            </div>
            <div className="bg-[#080d17] p-2.5 rounded border border-[#162136]">
              <div className="text-slate-500 text-[10px]">Hashcat Mode Flag</div>
              <div className="font-bold text-cyan-300 mt-0.5">
                {detection.primaryMatch.hashcatMode || 'N/A'}
              </div>
            </div>
            <div className="bg-[#080d17] p-2.5 rounded border border-[#162136]">
              <div className="text-slate-500 text-[10px]">John the Ripper Format</div>
              <div className="font-bold text-purple-300 mt-0.5">
                {detection.primaryMatch.johnFormat || 'N/A'}
              </div>
            </div>
            <div className="bg-[#080d17] p-2.5 rounded border border-[#162136]">
              <div className="text-slate-500 text-[10px]">Encoding / Charset</div>
              <div className="font-bold text-slate-300 mt-0.5 truncate">
                {detection.primaryMatch.charset}
              </div>
            </div>
          </div>
        </div>
      ) : hashInput.trim() ? (
        <div className="p-6 text-center border border-dashed border-[#1a253e] rounded-xl bg-[#080c14] text-slate-400 font-mono text-xs">
          No matching hash format was identified.
        </div>
      ) : null}

      {/* Alternate Possibilities & Percentage Scroll Bar */}
      {detection.candidates.length > 1 && (
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 border-b border-[#18233a] pb-2">
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
                Alternate Possibilities &amp; Probability Distribution ({detection.candidates.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Ranked by heuristic likelihood
            </span>
          </div>

          <div className="space-y-3">
            {detection.candidates.map((cand, idx) => (
              <div
                key={idx}
                className="bg-[#080c16] border border-[#18243c] hover:border-cyan-500/40 rounded-lg p-3 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-200 font-mono text-xs sm:text-sm">
                      {cand.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#121c30] text-slate-400 border border-[#1d2d4c]">
                      {cand.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    {cand.hashcatMode && (
                      <span className="text-cyan-400 text-[11px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                        hashcat {cand.hashcatMode}
                      </span>
                    )}
                    <span className="font-bold text-teal-300 w-12 text-right">
                      {cand.confidence}%
                    </span>
                  </div>
                </div>

                {/* Percentage Scroll Bar */}
                <div className="w-full bg-[#101726] h-2 rounded-full overflow-hidden p-0.5 border border-[#18243c] mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      idx === 0
                        ? 'bg-teal-400'
                        : idx === 1
                        ? 'bg-teal-500'
                        : 'bg-slate-500'
                    }`}
                    style={{ width: `${cand.confidence}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 font-mono leading-relaxed">
                  {cand.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in Client-Side Live Hasher Workbench */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
        <div className="flex items-center space-x-2 mb-3 border-b border-[#18233a] pb-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
            Client-Side Hash Generator (Verify &amp; Test)
          </h3>
        </div>

        <p className="text-xs text-slate-400 font-mono mb-3">
          Type any string to compute MD5, SHA-1, SHA-256, SHA-512, and CRC-32 in real time entirely inside your browser.
        </p>

        <div className="mb-4">
          <input
            type="text"
            value={generatorText}
            onChange={e => setGeneratorText(e.target.value)}
            placeholder="Type text to hash..."
            className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-3 py-2 font-mono text-xs sm:text-sm text-emerald-300 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-2">
          {Object.entries(generatedHashes).map(([algo, hashVal]) => (
            <div
              key={algo}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[#080d17] border border-[#18243b] rounded-lg font-mono text-xs"
            >
              <div className="flex items-center space-x-2 w-28 shrink-0">
                <span className="font-bold text-teal-300">{algo}</span>
              </div>
              <div className="flex-1 text-slate-300 break-all select-all font-mono text-xs bg-[#050810] px-2 py-1 rounded border border-[#141e30]">
                {hashVal}
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => copyToClipboard(hashVal, `gen-${algo}`)}
                  className="p-1.5 bg-[#121b2e] hover:bg-[#1a2640] text-slate-300 rounded border border-[#21304d]"
                  title="Copy Hash"
                >
                  {copiedKey === `gen-${algo}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setHashInput(hashVal);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-[#121b2e] hover:bg-[#1a2640] text-teal-300 rounded border border-[#21304d] text-[11px]"
                  title="Send to Detective"
                >
                  <span>Analyze</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
