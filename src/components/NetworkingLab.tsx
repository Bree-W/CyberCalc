'use client';

import React, { useState } from 'react';
import { HistoryEntry, WorkbenchLoad } from '@/types/analysis';
import { SendTarget, ToolParcel } from '@/lib/send-to';
import SendToBar from './SendToBar';
import { useWorkbenchLoad, useWorkbenchReset } from './useWorkbenchLoad';
import {
  calculateSubnet,
  decodeTcpFlags,
  analyzeIpv6,
  SubnetResult,
  TcpFlagsDecoded,
} from '@/lib/networking';
import {
  Network,
  Copy,
  Check,
  Shield,
  Sliders,
  Terminal,
  Globe,
  Info,
  Sparkles,
} from 'lucide-react';

interface NetworkingLabProps {
  onLogHistory: (item: HistoryEntry) => void;
  onSend?: (target: SendTarget, parcel: ToolParcel) => void;
  loadRequest?: WorkbenchLoad | null;
  resetId?: number;
}

export default function NetworkingLab({ onLogHistory, onSend, loadRequest, resetId = 0 }: NetworkingLabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ipv4-cidr' | 'tcp-flags' | 'ipv6'>('ipv4-cidr');

  // IPv4 State
  const [ipInput, setIpInput] = useState<string>('192.168.1.100');
  const [cidrPrefix, setCidrPrefix] = useState<number>(24);
  const [parentPrefix, setParentPrefix] = useState<number>(16);

  // TCP Flags State
  const [flagByte, setFlagByte] = useState<number>(0x02); // default SYN

  // IPv6 State
  const [ipv6Input, setIpv6Input] = useState<string>('2001:db8::1');
  const [ipv6Prefix, setIpv6Prefix] = useState<number>(64);

  useWorkbenchLoad(loadRequest, 'networking', payload => {
    if (payload.subtab === 'ipv4-cidr' || payload.subtab === 'tcp-flags' || payload.subtab === 'ipv6') {
      setActiveSubTab(payload.subtab);
    }
    if (payload.input != null) {
      if (payload.subtab === 'ipv6') setIpv6Input(payload.input);
      else setIpInput(payload.input);
    }
    if (payload.prefix != null && !Number.isNaN(Number(payload.prefix))) {
      setCidrPrefix(Number(payload.prefix));
    }
    if (payload.flag != null && !Number.isNaN(Number(payload.flag))) {
      setFlagByte(Number(payload.flag) & 0xff);
    }
  });

  useWorkbenchReset(resetId, () => {
    setActiveSubTab('ipv4-cidr');
    setIpInput('192.168.1.100');
    setCidrPrefix(24);
    setFlagByte(0x02);
    setIpv6Input('2001:db8::1');
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Subnet Result
  const subnetResult = React.useMemo(() => {
    return calculateSubnet(ipInput, cidrPrefix, parentPrefix);
  }, [ipInput, cidrPrefix, parentPrefix]);

  // TCP Flags Result
  const tcpFlagsResult: TcpFlagsDecoded = React.useMemo(() => {
    return decodeTcpFlags(flagByte);
  }, [flagByte]);

  // IPv6 Result
  const ipv6Result = React.useMemo(() => {
    return analyzeIpv6(ipv6Input, ipv6Prefix);
  }, [ipv6Input, ipv6Prefix]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFlagToggle = (mask: number) => {
    const newByte = flagByte ^ mask;
    setFlagByte(newByte);
    onLogHistory({
      tool: 'Networking',
      operation: 'Toggle TCP Flag',
      inputSummary: `0x${newByte.toString(16).padStart(2, '0').toUpperCase()}`,
      resultSummary: `Decoded TCP Flags: 0x${newByte.toString(16).toUpperCase()}`,
      restoreTab: 'networking',
      restore: { subtab: 'tcp-flags', flag: String(newByte) },
    });
  };

  const setCtfFlagPreset = (byteVal: number, label: string) => {
    setFlagByte(byteVal);
    onLogHistory({
      tool: 'Networking',
      operation: `Load TCP Probe Preset: ${label}`,
      inputSummary: `0x${byteVal.toString(16).padStart(2, '0').toUpperCase()}`,
      resultSummary: label,
      restoreTab: 'networking',
      restore: { subtab: 'tcp-flags', flag: String(byteVal) },
    });
  };

  const networkParcel: ToolParcel = activeSubTab === 'ipv6'
    ? { hex: '', text: ipv6Input }
    : activeSubTab === 'tcp-flags'
      ? { hex: flagByte.toString(16).padStart(2, '0'), text: String(flagByte) }
      : { hex: '', text: cidrPrefix === 24 ? ipInput : `${ipInput}/${cidrPrefix}` };

  return (
    <div className="space-y-6">
      {onSend && <SendToBar from="networking" parcel={networkParcel} onSend={onSend} />}
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0b101c] border border-[#1a253e] p-2 rounded-xl">
        <button
          onClick={() => setActiveSubTab('ipv4-cidr')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeSubTab === 'ipv4-cidr'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>IPv4 Subnet &amp; CIDR Calculator</span>
        </button>
        <button
          onClick={() => setActiveSubTab('tcp-flags')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeSubTab === 'tcp-flags'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>TCP Flags Bitmask Inspector</span>
        </button>
        <button
          onClick={() => setActiveSubTab('ipv6')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition ${
            activeSubTab === 'ipv6'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>IPv6 Analyzer (Stretch Goal)</span>
        </button>
      </div>

      {/* 1. IPV4 SUBNET & CIDR */}
      {activeSubTab === 'ipv4-cidr' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100 mb-4 flex items-center space-x-2">
              <Network className="w-5 h-5 text-cyan-400" />
              <span>IPV4 ADDRESS &amp; CIDR SUBNET CALCULATOR</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* IP Input */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-mono text-slate-400">
                  IPv4 Address (e.g. 192.168.1.100 or 10.0.0.1/16):
                </label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={e => {
                    const nextInput = e.target.value;
                    setIpInput(nextInput);
                    const cidrMatch = /\/(\d{1,2})$/.exec(nextInput.trim());
                    if (cidrMatch) {
                      const nextPrefix = Number(cidrMatch[1]);
                      if (nextPrefix <= 32) {
                        setCidrPrefix(nextPrefix);
                        setParentPrefix(current => Math.min(current, nextPrefix));
                      }
                    }
                  }}
                  placeholder="192.168.1.100"
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-4 py-2.5 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-500"
                />
              </div>

              {/* Prefix Slider / Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Subnet Prefix:</span>
                  <span className="text-cyan-400 font-bold">/{cidrPrefix}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={cidrPrefix}
                  onChange={e => {
                    const nextPrefix = Number(e.target.value);
                    setCidrPrefix(nextPrefix);
                    setParentPrefix(current => Math.min(current, nextPrefix));
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>/0 (Internet)</span>
                  <span>/24 (Class C)</span>
                  <span>/32 (Host)</span>
                </div>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#18233a] pt-4">
                <label className="space-y-1.5">
                  <span className="block text-xs font-mono text-slate-400">
                    Parent network prefix (contains this subnet):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono">/</span>
                    <input
                      type="number"
                      min="0"
                      max={cidrPrefix}
                      value={parentPrefix}
                      onChange={e => setParentPrefix(Number(e.target.value))}
                      aria-label="Parent network CIDR prefix"
                      className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-3 py-2 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <span className="block text-[10px] font-mono text-slate-500">
                    Counts subnets of /{cidrPrefix} inside the selected parent network.
                  </span>
                </label>
                <p className="self-end text-[11px] font-mono text-slate-500">
                  Parent prefix must be between /0 and the subnet prefix /{cidrPrefix}.
                </p>
              </div>
            </div>
          </div>

          {'error' in subnetResult ? (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 font-mono text-xs">
              {subnetResult.error}
            </div>
          ) : (
            <>
              {/* 32-bit Subnet Visualizer */}
              <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 border-b border-[#18233a] pb-2">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
                    32-bit Binary Subnet Allocation (Network vs Host Bits)
                  </h3>
                  <div className="flex items-center space-x-3 text-[11px] font-mono">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
                      <span className="text-cyan-300 font-bold">
                        {subnetResult.cidrPrefix} Network Bits
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-600" />
                      <span className="text-slate-400">
                        {32 - subnetResult.cidrPrefix} Host Bits
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-1 font-mono text-xs select-none">
                  {subnetResult.bitVisualizer.map(bit => (
                    <div
                      key={bit.bitIndex}
                      className={`flex flex-col items-center justify-center p-1 rounded border ${
                        bit.isNetworkBit
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                          : 'bg-[#0b1220] text-slate-500 border-[#18243c]'
                      }`}
                      title={`Bit ${bit.bitIndex} | Octet ${bit.octet} | ${
                        bit.isNetworkBit ? 'Network Bit' : 'Host Bit'
                      }`}
                    >
                      <span className="font-bold text-xs">{bit.val}</span>
                      <span className="text-[8px] text-slate-500 mt-0.5">
                        {bit.bitIndex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subnet Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                {/* Network Address */}
                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Network Address (Route ID)
                  </div>
                  <div className="text-lg font-bold text-cyan-300">
                    {subnetResult.networkAddress}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Hex: {subnetResult.networkHex}
                  </div>
                </div>

                {/* Broadcast Address */}
                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Broadcast Address
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {subnetResult.broadcastAddress}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Hex: {subnetResult.broadcastHex}
                  </div>
                </div>

                {/* Subnet Mask */}
                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Subnet Mask / Wildcard
                  </div>
                  <div className="text-lg font-bold text-teal-300">
                    {subnetResult.subnetMask}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Wildcard: {subnetResult.wildcardMask}
                  </div>
                </div>

                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Subnets in Parent /{subnetResult.parentPrefix}
                  </div>
                  <div className="text-lg font-bold text-cyan-300">
                    {subnetResult.subnetCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    /{subnetResult.cidrPrefix} networks
                  </div>
                </div>

                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Usable Host Count
                  </div>
                  <div className="text-lg font-bold text-cyan-300">
                    {subnetResult.usableHosts.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">assignable host IPs</div>
                </div>

                {/* Usable Host Range */}
                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 md:col-span-2">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Usable Host Range
                  </div>
                  <div className="text-base sm:text-lg font-bold text-slate-100 flex items-center space-x-2">
                    <span className="text-cyan-300">{subnetResult.firstUsableHost}</span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className="text-cyan-300">{subnetResult.lastUsableHost}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {subnetResult.totalAddresses.toLocaleString()} total addresses
                  </div>
                </div>

                {/* Class & Scope */}
                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4">
                  <div className="text-slate-500 text-[10px] mb-1">
                    Address Classification &amp; Scope
                  </div>
                  <div className="text-base font-bold text-amber-300">
                    Class {subnetResult.ipClass}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {subnetResult.scope}
                  </div>
                </div>

                {/* Multi-Representation Conversions */}
                <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 md:col-span-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    IPv4 Alternate Representations
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-[#070b14] rounded border border-[#162136]">
                      <div className="text-slate-500 text-[10px]">32-bit Integer Decimal</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">
                        {subnetResult.ipInteger}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#070b14] rounded border border-[#162136]">
                      <div className="text-slate-500 text-[10px]">Hexadecimal Integer</div>
                      <div className="text-sm font-bold text-cyan-300 mt-0.5">
                        {subnetResult.ipHex}
                      </div>
                    </div>
                    <div className="p-2.5 bg-[#070b14] rounded border border-[#162136]">
                      <div className="text-slate-500 text-[10px]">Binary (4 Octets)</div>
                      <div className="text-xs font-bold text-teal-300 mt-0.5 truncate">
                        {subnetResult.ipBinary}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. TCP FLAGS BITMASK INSPECTOR */}
      {activeSubTab === 'tcp-flags' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100 mb-3 flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <span>TCP FLAGS BITMASK &amp; PROBE DECODER</span>
            </h2>

            <p className="text-xs text-slate-400 font-mono mb-4">
              Inspect TCP header control bits (Offset 13 in TCP header). Used in network forensics, IDS signatures, and Nmap stealth port scanning.
            </p>

            {/* Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pt-2 border-t border-[#18233a]">
              <span className="text-[11px] font-mono text-slate-500 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Nmap / Scan Presets:</span>
              </span>
              <button
                onClick={() => setCtfFlagPreset(0x02, 'SYN Probe (Stealth Scan)')}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-cyan-300"
              >
                SYN (0x02)
              </button>
              <button
                onClick={() => setCtfFlagPreset(0x12, 'SYN-ACK (Port Open Response)')}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-emerald-300"
              >
                SYN-ACK (0x12)
              </button>
              <button
                onClick={() => setCtfFlagPreset(0x04, 'RST (Port Closed / Abort)')}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-red-300"
              >
                RST (0x04)
              </button>
              <button
                onClick={() => setCtfFlagPreset(0x29, 'Xmas Scan (FIN + PSH + URG)')}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-purple-300"
              >
                Xmas (0x29)
              </button>
              <button
                onClick={() => setCtfFlagPreset(0x00, 'NULL Scan (No flags)')}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-slate-400"
              >
                NULL (0x00)
              </button>
              <button
                onClick={() => setCtfFlagPreset(0x18, 'PSH-ACK (Data Flow)')}
                className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#101726] hover:bg-[#18233a] border border-[#202d4a] text-teal-300"
              >
                PSH-ACK (0x18)
              </button>
            </div>

            {/* Interactive Flag Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
              {tcpFlagsResult.flags.map(f => (
                <button
                  key={f.name}
                  onClick={() => handleFlagToggle(f.mask)}
                  className={`p-3 rounded-lg border text-center transition ${
                    f.set
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-neon-cyan font-bold'
                      : 'bg-[#080d17] text-slate-500 border-[#18243c] hover:bg-[#101828]'
                  }`}
                >
                  <div className="text-base font-bold">{f.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Bit {f.bitIndex} (0x{f.mask.toString(16).toUpperCase()})
                  </div>
                  <div className="mt-1 text-[11px] font-bold">
                    {f.set ? 'SET [1]' : 'CLR [0]'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Decoded Flag Details Card */}
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#18233a] pb-3 mb-3">
              <div>
                <div className="text-slate-400 text-[11px]">Decoded TCP Flags Combination</div>
                <div className="text-lg font-bold text-cyan-300 mt-0.5">
                  {tcpFlagsResult.interpretation}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-slate-400">Byte:</span>
                <span className="text-lg font-bold text-emerald-400">
                  {tcpFlagsResult.rawHex}
                </span>
                <span className="text-xs text-slate-500">
                  ({tcpFlagsResult.rawBinary}b)
                </span>
              </div>
            </div>

            {tcpFlagsResult.ctfNote && (
              <div className="p-3 bg-[#080d17] border border-cyan-500/30 rounded-lg text-slate-300 leading-relaxed mb-3">
                <span className="text-cyan-400 font-bold mr-1">&gt;</span>
                {tcpFlagsResult.ctfNote}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              {tcpFlagsResult.flags
                .filter(f => f.set)
                .map(f => (
                  <div
                    key={f.name}
                    className="flex items-center space-x-2 text-[11px] text-slate-400"
                  >
                    <span className="w-12 font-bold text-cyan-400">{f.name}:</span>
                    <span>{f.description}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. IPV6 ANALYZER (STRETCH GOAL) */}
      {activeSubTab === 'ipv6' && (
        <div className="space-y-6">
          <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 shadow-lg">
            <h2 className="text-base sm:text-lg font-bold font-cyber text-slate-100 mb-3 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              <span>IPV6 ADDRESS DECOMPRESSION &amp; SCOPE ANALYZER</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="sm:col-span-2 space-y-2">
                <span className="block text-xs font-mono text-slate-400">
                  IPv6 Address (Compressed or Expanded):
                </span>
                <input
                  type="text"
                  value={ipv6Input}
                  onChange={e => setIpv6Input(e.target.value)}
                  placeholder="Enter an IPv6 address"
                  className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-4 py-2.5 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-500"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-xs font-mono text-slate-400">Prefix length:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono">/</span>
                  <input
                    type="number"
                    min="0"
                    max="128"
                    value={ipv6Prefix}
                    onChange={e => setIpv6Prefix(Number(e.target.value))}
                    aria-label="IPv6 prefix length"
                    className="w-full bg-[#070b14] border border-[#1a2640] rounded-lg px-3 py-2.5 font-mono text-sm text-cyan-300 outline-none focus:border-cyan-500"
                  />
                </div>
              </label>
            </div>
          </div>

          {ipv6Result.isValid ? (
            <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 sm:p-5 space-y-4 font-mono text-xs">
              <div className="p-3 bg-[#080d17] rounded-lg border border-[#18243c]">
                <div className="text-slate-500 text-[10px] mb-1">
                  Full 128-bit Expanded Representation (8 Hextets):
                </div>
                <div className="text-sm sm:text-base font-bold text-cyan-300 break-all">
                  {ipv6Result.expanded}
                </div>
              </div>

              <div className="p-3 bg-[#080d17] rounded-lg border border-[#18243c]">
                <div className="text-slate-500 text-[10px] mb-1">
                  RFC 5952 Canonical Compressed Format:
                </div>
                <div className="text-sm sm:text-base font-bold text-teal-300 break-all">
                  {ipv6Result.compressed}
                </div>
              </div>

              <div className="p-3 bg-[#080d17] rounded-lg border border-[#18243c]">
                <div className="text-slate-500 text-[10px] mb-1">
                  Address Classification / Scope:
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  {ipv6Result.scope}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#080d17] rounded-lg border border-[#18243c]">
                  <div className="text-slate-500 text-[10px] mb-1">Network Address /{ipv6Result.prefix}</div>
                  <div className="text-sm font-bold text-cyan-300 break-all">{ipv6Result.networkAddress}</div>
                </div>
                <div className="p-3 bg-[#080d17] rounded-lg border border-[#18243c]">
                  <div className="text-slate-500 text-[10px] mb-1">First - Last Address (inclusive)</div>
                  <div className="text-sm font-bold text-teal-300 break-all">
                    {ipv6Result.firstAddress} - {ipv6Result.lastAddress}
                  </div>
                </div>
                <div className="p-3 bg-[#080d17] rounded-lg border border-[#18243c]">
                  <div className="text-slate-500 text-[10px] mb-1">Total Addresses</div>
                  <div className="text-sm font-bold text-slate-100">
                    {ipv6Result.totalAddresses?.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">IPv6 has no broadcast address.</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 font-mono text-xs">
              {ipv6Result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
