'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
  Check,
  Terminal,
} from 'lucide-react';
import {
  PCAP_SAMPLES,
  buildSamplePcap,
  parsePcapBuffer,
  type ParsedPacket,
  type PcapAnalysisResult,
  type PcapSampleId,
} from '@/lib/pcap-analyzer';
import { chefPathForBytes } from '@/integrations/index.ts';

function protocolBadgeClass(proto: ParsedPacket['protocol']): string {
  switch (proto) {
    case 'HTTP':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'TCP':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    case 'DNS':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'UDP':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    case 'ICMP':
      return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
    case 'ARP':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    default:
      return 'bg-slate-700/40 text-slate-300 border-slate-600';
  }
}

function formatHexRows(bytes: Uint8Array): { offset: string; hex: string; ascii: string }[] {
  const rows: { offset: string; hex: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.subarray(i, Math.min(i + 16, bytes.length));
    const hexCols: string[] = [];
    let ascii = '';
    for (let j = 0; j < 16; j++) {
      if (j < slice.length) {
        const b = slice[j];
        hexCols.push(b.toString(16).padStart(2, '0'));
        ascii += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.';
      } else {
        hexCols.push('  ');
      }
    }
    rows.push({
      offset: i.toString(16).padStart(4, '0'),
      hex: `${hexCols.slice(0, 8).join(' ')}  ${hexCols.slice(8).join(' ')}`,
      ascii,
    });
  }
  return rows;
}

export default function SharkView() {
  const router = useRouter();
  const [activeSample, setActiveSample] = useState<PcapSampleId>('http-credential-leak.pcap');
  const [captureName, setCaptureName] = useState<string>('http-credential-leak.pcap');
  const [rawPcapBytes, setRawPcapBytes] = useState<Uint8Array>(() =>
    buildSamplePcap('http-credential-leak.pcap'),
  );
  const [analysis, setAnalysis] = useState<PcapAnalysisResult>(() =>
    parsePcapBuffer(buildSamplePcap('http-credential-leak.pcap')),
  );
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(4);
  const [openLayers, setOpenLayers] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
  });
  const [streamModalId, setStreamModalId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const loadSample = (id: PcapSampleId) => {
    const bytes = buildSamplePcap(id);
    const parsed = parsePcapBuffer(bytes);
    setActiveSample(id);
    setCaptureName(id);
    setRawPcapBytes(bytes);
    setAnalysis(parsed);
    const firstInteresting = parsed.packets.find(p => p.ctfAlert)?.index ?? 1;
    setSelectedIndex(firstInteresting);
  };

  const handleFileUpload = async (file: File) => {
    const buf = new Uint8Array(await file.arrayBuffer());
    const parsed = parsePcapBuffer(buf);
    setCaptureName(file.name);
    setRawPcapBytes(buf);
    setAnalysis(parsed);
    setSelectedIndex(parsed.packets[0]?.index ?? 1);
  };

  const filteredPackets = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return analysis.packets;
    return analysis.packets.filter(pkt => {
      if (q === 'tcp') return pkt.protocol === 'TCP' || pkt.protocol === 'HTTP';
      if (q === 'udp') return pkt.protocol === 'UDP' || pkt.protocol === 'DNS';
      if (q === 'http' || q === 'dns' || q === 'icmp' || q === 'arp') {
        return pkt.protocol.toLowerCase() === q;
      }
      if (q === 'flag' || q === 'ctf') return Boolean(pkt.ctfAlert);
      return (
        pkt.protocol.toLowerCase().includes(q) ||
        pkt.source.toLowerCase().includes(q) ||
        pkt.destination.toLowerCase().includes(q) ||
        pkt.info.toLowerCase().includes(q) ||
        pkt.payloadAscii.toLowerCase().includes(q) ||
        (pkt.ctfAlert?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [analysis.packets, filterQuery]);

  useEffect(() => {
    if (filteredPackets.length > 0 && !filteredPackets.some(p => p.index === selectedIndex)) {
      setSelectedIndex(filteredPackets[0].index);
    }
  }, [filteredPackets, selectedIndex]);

  const selectedPacket =
    analysis.packets.find(p => p.index === selectedIndex) ?? filteredPackets[0] ?? null;

  const hexRows = useMemo(
    () => (selectedPacket ? formatHexRows(selectedPacket.raw) : []),
    [selectedPacket],
  );

  const sendToChef = (bytesOrText: Uint8Array | string) => {
    const bytes =
      typeof bytesOrText === 'string' ? new TextEncoder().encode(bytesOrText) : bytesOrText;
    router.push(chefPathForBytes('magic', bytes));
  };

  const sendObjectToChef = (bytes: Uint8Array) => {
    router.push(chefPathForBytes('raw', bytes));
  };

  const downloadObject = (filename: string, bytes: Uint8Array, mime: string) => {
    const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
      type: mime || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCurrentPcap = () => {
    const blob = new Blob([Buffer.from(rawPcapBytes)], { type: 'application/vnd.tcpdump.pcap' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = captureName.endsWith('.pcap') ? captureName : `${captureName}.pcap`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeStream = streamModalId ? analysis.streams[streamModalId] : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header & Student CTF Sample Bar */}
      <section className="rounded-xl border border-cyan-500/30 bg-[#0a101d] p-5 shadow-neon-cyan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h1 className="font-cyber text-xl font-bold tracking-wide text-slate-100">
                SHARK — PACKET &amp; PCAPNG INSPECTOR
              </h1>
              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                In-Browser Wireshark Suite
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Dissects PCAP &amp; PCAPNG captures (Ethernet, ARP, IPv4/IPv6, TCP, UDP, ICMP, HTTP, DNS), reconstructs TCP/UDP streams, and hunts CTF flags.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadCurrentPcap}
              className="flex items-center gap-1.5 rounded-lg border border-[#243252] bg-[#0d1526] px-3 py-2 font-mono text-xs text-slate-200 hover:border-cyan-500/40"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Download {captureName}</span>
            </button>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-3.5 py-2 font-mono text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
              <Upload className="h-4 w-4 text-cyan-300" />
              <span>Upload .pcap / .pcapng</span>
              <input
                data-testid="shark-file-input"
                type="file"
                accept=".pcap,.pcapng,.cap,application/octet-stream"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
            </label>
          </div>
        </div>

        {/* Bundled CTF Sample Captures */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {PCAP_SAMPLES.map(sample => {
            const isSelected = captureName === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                data-testid={`shark-sample-${sample.id}`}
                onClick={() => loadSample(sample.id)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                  isSelected
                    ? 'border-cyan-400 bg-[#0f1c33] text-cyan-200 shadow-neon-cyan'
                    : 'border-[#1b2742] bg-[#070b14] text-slate-300 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-300">{sample.label}</span>
                  <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                    {sample.badge}
                  </span>
                </div>
                <span className="mt-1 font-mono text-[11px] text-slate-400">
                  {sample.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Display Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#17223b] pt-3">
          <div className="relative flex min-w-[260px] flex-1 items-center">
            <Filter className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-cyan-400" />
            <input
              type="text"
              data-testid="shark-filter-input"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="Display filter: http, dns, icmp, tcp, flag, 10.10.14.25, login..."
              className="w-full rounded-lg border border-[#1f2d4d] bg-[#06090e] py-1.5 pl-9 pr-8 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 font-mono text-[11px]">
            {(['', 'http', 'dns', 'icmp', 'tcp', 'flag'] as const).map(preset => (
              <button
                key={preset || 'all'}
                type="button"
                onClick={() => setFilterQuery(preset)}
                className={`rounded border px-2 py-1 transition ${
                  filterQuery.toLowerCase() === preset
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-[#1d2a44] bg-[#070b14] text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset ? preset.toUpperCase() : 'ALL'}
              </button>
            ))}
          </div>

          <span className="ml-auto font-mono text-xs text-slate-400">
            Showing <strong className="text-cyan-300">{filteredPackets.length}</strong> /{' '}
            {analysis.packets.length} packets ({analysis.format})
          </span>
        </div>

        {analysis.error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 font-mono text-xs text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{analysis.error}</span>
          </div>
        )}
      </section>

      {/* Auto-Detected Student CTF Secrets Banner */}
      {analysis.ctfFindings.length > 0 && (
        <section
          data-testid="shark-ctf-findings"
          className="rounded-xl border border-emerald-500/40 bg-[#08191b] p-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
              Auto-Detected CTF Flags &amp; Cleartext Credentials ({analysis.ctfFindings.length})
            </h2>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-2">
            {analysis.ctfFindings.map((finding, idx) => (
              <div
                key={`${finding.packetIndex}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-[#050f12] p-2.5 font-mono text-xs"
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(finding.packetIndex)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                      Packet #{finding.packetIndex} · {finding.protocol}
                    </span>
                    <span className="truncate font-semibold text-emerald-200">
                      {finding.summary}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => sendToChef(finding.extracted)}
                  className="flex shrink-0 items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/25"
                >
                  <Send className="h-3 w-3" />
                  <span>Chef</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {analysis.httpObjects.length > 0 && (
        <section
          data-testid="shark-http-objects"
          className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4"
        >
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
            Exported HTTP Objects ({analysis.httpObjects.length})
          </h2>
          <p className="mt-1 font-mono text-[10px] text-slate-500">
            Reassembled like Wireshark&apos;s Export HTTP Objects. Download the file or open it in Chef.
          </p>
          <div className="mt-3 space-y-2">
            {analysis.httpObjects.map(object => (
              <div
                key={object.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#172038] bg-[#070b14] p-3 font-mono text-xs"
              >
                <div className="min-w-0">
                  <p className="text-slate-100">{object.filename}</p>
                  <p className="mt-1 break-all text-[10px] text-slate-500">
                    {object.mime} · {object.size} B · MD5 {object.md5}
                    {object.packet !== undefined ? ` · packet #${object.packet}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadObject(object.filename, object.bytes, object.mime)}
                    className="rounded border border-[#22304f] px-2 py-1 text-[11px] text-slate-200 hover:border-cyan-500/40"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => sendObjectToChef(object.bytes)}
                    className="rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/25"
                  >
                    Open in Chef
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pane 1: Wireshark Packet List Table */}
      <section className="overflow-hidden rounded-xl border border-[#1a253e] bg-[#0b101c]">
        <div className="flex items-center justify-between border-b border-[#162038] px-4 py-2.5">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Packet List ({filteredPackets.length})
          </span>
          {selectedPacket?.streamId && analysis.streams[selectedPacket.streamId] && (
            <button
              type="button"
              data-testid="follow-stream-button"
              onClick={() => setStreamModalId(selectedPacket.streamId!)}
              className="flex items-center gap-1.5 rounded border border-emerald-500/50 bg-emerald-500/15 px-3 py-1 font-mono text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
            >
              <Terminal className="h-3.5 w-3.5 text-emerald-300" />
              <span>Follow {analysis.streams[selectedPacket.streamId].protocol} Stream</span>
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-[#080d18] text-[11px] uppercase text-slate-400">
              <tr className="border-b border-[#18233b]">
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">Time (s)</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Proto</th>
                <th className="px-3 py-2">Len</th>
                <th className="px-3 py-2">Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.map(pkt => {
                const isSelected = pkt.index === selectedPacket?.index;
                return (
                  <tr
                    key={pkt.index}
                    data-testid={`packet-row-${pkt.index}`}
                    onClick={() => setSelectedIndex(pkt.index)}
                    className={`cursor-pointer border-b border-[#11192b] transition ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-100'
                        : pkt.ctfAlert
                          ? 'bg-emerald-950/25 text-slate-200 hover:bg-emerald-950/40'
                          : 'text-slate-300 hover:bg-[#10192d]'
                    }`}
                  >
                    <td className="px-3 py-1.5 font-semibold text-cyan-300">{pkt.index}</td>
                    <td className="px-3 py-1.5 text-slate-400">{pkt.relativeTimeSec.toFixed(4)}</td>
                    <td className="px-3 py-1.5">{pkt.source}</td>
                    <td className="px-3 py-1.5">{pkt.destination}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.2 text-[10px] font-semibold ${protocolBadgeClass(
                          pkt.protocol,
                        )}`}
                      >
                        {pkt.protocol}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-400">{pkt.capturedLength}</td>
                    <td className="max-w-lg truncate px-3 py-1.5">{pkt.info}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pane 2 & Pane 3: Protocol Dissection Tree + Synchronized Hex/ASCII Dump */}
      {selectedPacket && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Pane 2: Layer Dissection Tree */}
          <div
            data-testid="shark-protocol-tree"
            className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Packet #{selectedPacket.index} — Protocol Dissection
              </h2>
              <button
                type="button"
                onClick={() =>
                  sendToChef(
                    selectedPacket.payload.length > 0 ? selectedPacket.payload : selectedPacket.raw,
                  )
                }
                className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[11px] text-cyan-200 hover:bg-cyan-500/20"
              >
                <Send className="h-3 w-3" />
                <span>Send Payload to Chef</span>
              </button>
            </div>

            <div className="space-y-2">
              {selectedPacket.layers.map((layer, idx) => {
                const isOpen = openLayers[idx] ?? true;
                return (
                  <div
                    key={`${layer.name}-${idx}`}
                    className="rounded-lg border border-[#162138] bg-[#070b14]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenLayers(prev => ({ ...prev, [idx]: !(prev[idx] ?? true) }))
                      }
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-mono text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span className="font-semibold text-cyan-200">{layer.name}</span>
                      </div>
                      <span className="truncate text-[11px] text-slate-400">{layer.summary}</span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-[#121c30] px-3 py-2 font-mono text-xs">
                        {layer.fields.map((f, fIdx) => (
                          <div
                            key={`${f.label}-${fIdx}`}
                            className="flex flex-wrap justify-between gap-2 py-0.5 text-[11px]"
                          >
                            <span className="text-slate-400">{f.label}:</span>
                            <span className="break-all text-slate-200">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pane 3: Hex + ASCII Byte Dump */}
          <div
            data-testid="shark-hex-dump"
            className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Hex &amp; ASCII Packet Bytes ({selectedPacket.raw.length} B)
              </h2>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(selectedPacket.payloadAscii || selectedPacket.info);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 1500);
                }}
                className="flex items-center gap-1 rounded border border-[#22304f] bg-[#070b14] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
              >
                {copiedText ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied ASCII</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy ASCII</span>
                  </>
                )}
              </button>
            </div>

            <div className="max-h-96 overflow-auto rounded-lg border border-[#152036] bg-[#05080f] p-3 font-mono text-xs leading-relaxed">
              {hexRows.map(row => (
                <div key={row.offset} className="flex gap-4 whitespace-pre">
                  <span className="select-none text-slate-500">{row.offset}</span>
                  <span className="text-cyan-300">{row.hex}</span>
                  <span className="text-emerald-300">{row.ascii}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Follow TCP / UDP Stream Modal */}
      {activeStream && (
        <div
          data-testid="follow-stream-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setStreamModalId(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-cyan-500/40 bg-[#090f1c] p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#18233b] pb-3">
              <div>
                <h3 className="font-cyber text-sm font-bold text-cyan-300">
                  FOLLOW {activeStream.protocol} STREAM
                </h3>
                <p className="font-mono text-xs text-slate-400">{activeStream.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    sendToChef(activeStream.segments.map(s => s.ascii).join('\n'))
                  }
                  className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 font-mono text-xs text-cyan-200 hover:bg-cyan-500/25"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Open Stream in Chef</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStreamModalId(null)}
                  className="rounded border border-slate-700 p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-auto font-mono text-xs">
              {activeStream.segments.map((seg, i) => {
                const isClient = seg.from === activeStream.endpoints[0];
                return (
                  <div
                    key={`${seg.packetIndex}-${i}`}
                    className={`rounded-lg border p-3 ${
                      isClient
                        ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-100'
                        : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-slate-400">
                      <span>
                        Packet #{seg.packetIndex} · {seg.from}
                      </span>
                      <span>{seg.bytes.length} bytes</span>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap">{seg.ascii}</pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
