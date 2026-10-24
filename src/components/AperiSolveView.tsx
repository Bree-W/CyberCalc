'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  Download,
  Eye,
  FileSearch,
  Layers,
  Palette,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  Wrench,
  X,
} from 'lucide-react';
import {
  APERISOLVE_VERSION,
  aperiSolve,
  buildCyberChefUrl,
  chefWindowPath,
  fetchAperiResultFull,
  firstExtractedText,
  submitAperiSample,
  type AperiResultMeta,
} from '@/integrations/index.ts';
import { detectAllowedImage, filenameForImage } from '@/integrations/magic-bytes.ts';
import { spacedHex, takeAperiBytes } from '@/lib/send-to';
import SendToBar from './SendToBar';
import { useFollowSend } from './useFollowSend';

const SAMPLE_CARDS = [
  {
    id: 'example1.png',
    label: 'example1.png',
    badge: 'LSB Stego (zsteg)',
    hint: 'Hidden text embedded in Green channel bit 0',
  },
  {
    id: 'example2.jpg',
    label: 'example2.jpg',
    badge: 'XMP / EXIF Metadata',
    hint: 'Hidden author tag inside JPEG APP1 XMP packet',
  },
  {
    id: 'example3.png',
    label: 'example3.png',
    badge: 'Spoofed IHDR Height CRC',
    hint: 'Cropped height (56px) repaired to 1080px via CRC-32',
  },
] as const;

const TOOL_ORDER = [
  { key: 'zsteg', title: 'Zsteg — LSB Bit-Plane Extractor' },
  { key: 'pcrt', title: 'PCRT — PNG Check & Height CRC Repair' },
  { key: 'pngcheck', title: 'Pngcheck — Chunk & CRC Verifier' },
  { key: 'exiftool', title: 'ExifTool — EXIF / XMP / Chunk Metadata' },
  { key: 'binwalk', title: 'Binwalk — Embedded Signature Scanner' },
  { key: 'file', title: 'File — Magic Header Identification' },
  { key: 'identify', title: 'Identify — Geometry & Cryptographic Digests' },
  { key: 'strings', title: 'Strings — Printable ASCII Sequences' },
] as const;

interface BitPlaneGroup {
  channel: string;
  planes: { bit: number; dataUrl: string }[];
}

function generateDecomposerAndRemaps(img: HTMLImageElement): {
  bitPlanes: BitPlaneGroup[];
  remaps: { label: string; dataUrl: string }[];
} {
  const maxDim = 360;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 200) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 200) * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return { bitPlanes: [], remaps: [] };
  srcCtx.drawImage(img, 0, 0, w, h);
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d');
  if (!workCtx) return { bitPlanes: [], remaps: [] };

  const channels: { name: string; mode: 'rgb' | 0 | 1 | 2 }[] = [
    { name: 'Superimposed RGB', mode: 'rgb' },
    { name: 'Red', mode: 0 },
    { name: 'Green', mode: 1 },
    { name: 'Blue', mode: 2 },
  ];

  const bitPlanes: BitPlaneGroup[] = [];
  for (const ch of channels) {
    const planes: { bit: number; dataUrl: string }[] = [];
    for (let bit = 0; bit < 8; bit++) {
      const outImg = workCtx.createImageData(w, h);
      const dst = outImg.data;
      const mask = 1 << bit;
      for (let i = 0; i < srcData.length; i += 4) {
        if (ch.mode === 'rgb') {
          dst[i] = (srcData[i] & mask) ? 255 : 0;
          dst[i + 1] = (srcData[i + 1] & mask) ? 255 : 0;
          dst[i + 2] = (srcData[i + 2] & mask) ? 255 : 0;
        } else {
          const v = (srcData[i + ch.mode] & mask) ? 255 : 0;
          dst[i] = v;
          dst[i + 1] = v;
          dst[i + 2] = v;
        }
        dst[i + 3] = 255;
      }
      workCtx.putImageData(outImg, 0, 0);
      planes.push({ bit, dataUrl: workCanvas.toDataURL('image/png') });
    }
    bitPlanes.push({ channel: ch.name, planes });
  }

  // 8 deterministic color remappings (matching Aperi'Solve color_remapping)
  const remaps: { label: string; dataUrl: string }[] = [];
  for (let rIdx = 0; rIdx < 8; rIdx++) {
    const lutR = new Uint8Array(256);
    const lutG = new Uint8Array(256);
    const lutB = new Uint8Array(256);
    let seed = (rIdx + 1) * 0x9e3779b1;
    const nextByte = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) & 0xff;
    };
    for (let k = 0; k < 256; k++) {
      lutR[k] = nextByte();
      lutG[k] = nextByte();
      lutB[k] = nextByte();
    }
    const outImg = workCtx.createImageData(w, h);
    const dst = outImg.data;
    for (let i = 0; i < srcData.length; i += 4) {
      dst[i] = lutR[srcData[i]];
      dst[i + 1] = lutG[srcData[i + 1]];
      dst[i + 2] = lutB[srcData[i + 2]];
      dst[i + 3] = 255;
    }
    workCtx.putImageData(outImg, 0, 0);
    remaps.push({ label: `Remap #${rIdx + 1}`, dataUrl: workCanvas.toDataURL('image/png') });
  }

  return { bitPlanes, remaps };
}

export default function AperiSolveView() {
  const router = useRouter();
  const follow = useFollowSend();
  const [loadedBytes, setLoadedBytes] = useState<Uint8Array | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<string>('example1.png');
  const [password, setPassword] = useState('');
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionHash, setSubmissionHash] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<AperiResultMeta | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string>('/samples/aperisolve/example1.png');
  const [bitPlanes, setBitPlanes] = useState<BitPlaneGroup[]>([]);
  const [remaps, setRemaps] = useState<{ label: string; dataUrl: string }[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('Superimposed RGB');
  const [zoomImage, setZoomImage] = useState<{ title: string; src: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const runSampleByName = async (name: string) => {
    setSelectedSample(name);
    setBusy(true);
    setError(null);
    setPreviewUrl(`/samples/aperisolve/${name}`);
    try {
      const sampleResponse = await fetch(`/samples/aperisolve/${name}`);
      if (sampleResponse.ok) setLoadedBytes(new Uint8Array(await sampleResponse.arrayBuffer()));
    } catch {
      setLoadedBytes(null);
    }
    const sub = await submitAperiSample(name, { password: password || undefined, deep });
    if (!sub.ok || !sub.submissionHash) {
      setBusy(false);
      setError(sub.error ?? 'Upload failed');
      return;
    }
    setSubmissionHash(sub.submissionHash);
    const full = await fetchAperiResultFull(sub.submissionHash);
    setBusy(false);
    if (full) {
      setResults(full.results);
      setMeta(full.meta);
      if (full.meta?.repairedPngDataUrl) {
        setPreviewUrl(full.meta.repairedPngDataUrl);
      }
    }
  };

  const runUploadedFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setLoadedBytes(new Uint8Array(await file.arrayBuffer()));
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    const sub = await aperiSolve.submit(file, { password: password || undefined, deep });
    if (!sub.ok || !sub.submissionHash) {
      setBusy(false);
      setError(sub.error ?? 'Upload failed');
      return;
    }
    setSubmissionHash(sub.submissionHash);
    const full = await fetchAperiResultFull(sub.submissionHash);
    setBusy(false);
    if (full) {
      setResults(full.results);
      setMeta(full.meta);
      if (full.meta?.repairedPngDataUrl) {
        setPreviewUrl(full.meta.repairedPngDataUrl);
      }
    }
  };

  useEffect(() => {
    const incoming = takeAperiBytes();
    const kind = incoming ? detectAllowedImage(incoming) : null;
    if (incoming && kind) {
      void runUploadedFile(new File([incoming], filenameForImage('handoff', kind)));
      return;
    }
    void runSampleByName('example1.png');
  }, []);

  // Recompute Canvas bit planes & color remapping whenever previewUrl changes
  useEffect(() => {
    if (!previewUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const computed = generateDecomposerAndRemaps(img);
      setBitPlanes(computed.bitPlanes);
      setRemaps(computed.remaps);
    };
    img.src = previewUrl;
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  const extractedHeadline = results ? firstExtractedText(results) : null;

  const sendToChef = (text: string) => {
    const built = buildCyberChefUrl('magic', new TextEncoder().encode(text.slice(0, 1500)));
    router.push(chefWindowPath(built.url));
  };

  const copyText = (key: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const activePlaneGroup = bitPlanes.find(g => g.channel === activeChannel) ?? bitPlanes[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <SendToBar
          from="aperi"
          parcel={{ hex: loadedBytes ? spacedHex(loadedBytes) : '', text: meta?.filename ?? '' }}
          disabled={!loadedBytes}
          onSend={(target, parcel) => setSendNote(follow(target, parcel))}
        />
        {sendNote && <span className="font-mono text-[11px] text-slate-400">{sendNote}</span>}
      </div>
      {/* Header Banner */}
      <section className="rounded-xl border border-cyan-500/30 bg-[#0a101d] p-5 shadow-neon-cyan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-cyan-400" />
              <h1 className="font-cyber text-xl font-bold tracking-wide text-slate-100">
                APERI&apos;SOLVE — STEGANOGRAPHY &amp; LAYER WORKBENCH
              </h1>
              <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                Zero-Docker Local Engine
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-slate-400">
              Bit-plane decomposer, LSB zsteg extractor, PNG IHDR CRC height repair (PCRT), XMP/EXIF inspector, and signature carving · Based on Aperi&apos;Solve {APERISOLVE_VERSION} (MIT, Zeecka).
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 font-mono text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
            <Upload className="h-4 w-4 text-cyan-300" />
            <span>Upload Image (PNG / JPG / GIF / WEBP / BMP / TIFF)</span>
            <input
              data-testid="aperi-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void runUploadedFile(file);
              }}
            />
          </label>
        </div>

        {/* One-Click Sample Selector + Options */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {SAMPLE_CARDS.map(card => {
            const active = selectedSample === card.id;
            return (
              <button
                key={card.id}
                type="button"
                data-testid={`aperi-sample-${card.id}`}
                onClick={() => void runSampleByName(card.id)}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                  active
                    ? 'border-cyan-400 bg-[#0f1c33] text-cyan-200 shadow-neon-cyan'
                    : 'border-[#1b2742] bg-[#070b14] text-slate-300 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-300">{card.label}</span>
                  <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                    {card.badge}
                  </span>
                </div>
                <span className="mt-1 font-mono text-[11px] text-slate-400">{card.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#17223b] pt-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Stego Password (optional):</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="steghide / openstego passphrase"
              className="rounded border border-[#1f2d4d] bg-[#06090e] px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-400"
            />
          </div>
          <label className="flex items-center gap-1.5 text-slate-300">
            <input
              type="checkbox"
              checked={deep}
              onChange={e => setDeep(e.target.checked)}
            />
            <span>Deep string scan</span>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runSampleByName(selectedSample)}
            className="rounded border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busy ? 'Analyzing…' : `Re-analyze ${selectedSample}`}
          </button>
          {submissionHash && (
            <span className="ml-auto text-[11px] text-slate-500">
              Submission MD5: <code className="text-cyan-300">{submissionHash}</code>
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 font-mono text-xs text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* Top Findings & Repaired Image Banner */}
      {(extractedHeadline || meta?.repairedPngDataUrl) && (
        <section
          data-testid="aperi-top-finding"
          className="rounded-xl border border-emerald-500/40 bg-[#08191b] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
                Extracted Stego / Forensics Finding
              </h2>
            </div>
            {extractedHeadline && (
              <button
                type="button"
                data-testid="aperi-send-to-chef"
                onClick={() => sendToChef(extractedHeadline)}
                className="flex items-center gap-1.5 rounded border border-cyan-400/50 bg-cyan-500/15 px-3 py-1 font-mono text-xs text-cyan-200 hover:bg-cyan-500/25"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Open in Chef</span>
              </button>
            )}
          </div>
          {extractedHeadline && (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded border border-emerald-500/20 bg-[#050c0e] p-3 font-mono text-xs text-emerald-200">
              {extractedHeadline}
            </pre>
          )}
          {meta?.repairedPngDataUrl && (
            <div className="mt-3 rounded-lg border border-cyan-500/30 bg-[#07111e] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs text-cyan-300">
                  <Wrench className="h-4 w-4 text-cyan-400" />
                  <span>
                    PCRT Auto-Repair: Spoofed height <strong>{meta.height}px</strong> restored to{' '}
                    <strong>{meta.repairedHeight}px</strong> via IHDR CRC-32 match!
                  </span>
                </div>
                <a
                  href={meta.repairedPngDataUrl}
                  download={`repaired-${meta.filename}`}
                  className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs text-cyan-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Repaired PNG</span>
                </a>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Image Preview + File Metadata Summary */}
      {meta && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4">
            <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {meta.repairedPngDataUrl ? 'Repaired Image Preview' : 'Target Image Preview'}
            </h3>
            <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-lg border border-[#162038] bg-[#05080f] p-2">
              <img
                src={previewUrl}
                alt={meta.filename}
                className="max-h-64 w-auto cursor-pointer object-contain"
                onClick={() => setZoomImage({ title: meta.filename, src: previewUrl })}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4 lg:col-span-2">
            <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Container &amp; Digest Summary
            </h3>
            <div className="grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2">
              <div className="rounded border border-[#152036] bg-[#070b14] p-2.5">
                <span className="text-slate-500">File Name:</span>{' '}
                <span className="text-slate-200">{meta.filename}</span>
              </div>
              <div className="rounded border border-[#152036] bg-[#070b14] p-2.5">
                <span className="text-slate-500">Format &amp; Size:</span>{' '}
                <span className="text-slate-200">
                  {meta.kind.toUpperCase()} · {meta.size.toLocaleString()} bytes
                </span>
              </div>
              <div className="rounded border border-[#152036] bg-[#070b14] p-2.5">
                <span className="text-slate-500">Header Dimensions:</span>{' '}
                <span className="text-slate-200">
                  {meta.width ?? '?'} × {meta.height ?? '?'} px
                </span>
              </div>
              <div className="rounded border border-[#152036] bg-[#070b14] p-2.5">
                <span className="text-slate-500">CRC Status:</span>{' '}
                {meta.repairedHeight ? (
                  <span className="text-amber-300">
                    IHDR Spoofed (Real height: {meta.repairedHeight}px)
                  </span>
                ) : (
                  <span className="text-emerald-300">Valid</span>
                )}
              </div>
              <div className="rounded border border-[#152036] bg-[#070b14] p-2.5 sm:col-span-2">
                <span className="text-slate-500">MD5:</span>{' '}
                <code className="text-cyan-300">{meta.md5}</code>
              </div>
              <div className="rounded border border-[#152036] bg-[#070b14] p-2.5 sm:col-span-2">
                <span className="text-slate-500">SHA-256:</span>{' '}
                <code className="break-all text-cyan-300">{meta.sha256}</code>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Visual Bit-Plane Decomposer */}
      {bitPlanes.length > 0 && (
        <section
          data-testid="aperi-decomposer"
          className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              <h2 className="font-mono text-sm font-semibold text-cyan-300">
                Bit-Plane Decomposer (Bit 0 LSB → Bit 7 MSB)
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bitPlanes.map(group => (
                <button
                  key={group.channel}
                  type="button"
                  onClick={() => setActiveChannel(group.channel)}
                  className={`rounded px-2.5 py-1 font-mono text-xs transition ${
                    activePlaneGroup?.channel === group.channel
                      ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border border-[#1d2a44] bg-[#070b14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {group.channel}
                </button>
              ))}
            </div>
          </div>

          {activePlaneGroup && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {activePlaneGroup.planes.map(p => (
                <button
                  key={p.bit}
                  type="button"
                  onClick={() =>
                    setZoomImage({
                      title: `${activePlaneGroup.channel} — Bit ${p.bit}`,
                      src: p.dataUrl,
                    })
                  }
                  className="group flex flex-col overflow-hidden rounded-lg border border-[#1a253e] bg-[#06090e] p-1.5 text-left transition hover:border-cyan-400"
                >
                  <img
                    src={p.dataUrl}
                    alt={`${activePlaneGroup.channel} bit ${p.bit}`}
                    className="h-24 w-full rounded object-contain bg-black"
                  />
                  <span className="mt-1.5 text-center font-mono text-[11px] text-slate-300 group-hover:text-cyan-300">
                    Bit {p.bit} {p.bit === 0 ? '(LSB)' : p.bit === 7 ? '(MSB)' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Color Remapping Strip */}
      {remaps.length > 0 && (
        <section
          data-testid="aperi-color-remapping"
          className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4"
        >
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-cyan-400" />
            <h2 className="font-mono text-sm font-semibold text-cyan-300">
              Color Remapping (8 Palette Permutations)
            </h2>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {remaps.map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => setZoomImage({ title: r.label, src: r.dataUrl })}
                className="group flex flex-col overflow-hidden rounded-lg border border-[#1a253e] bg-[#06090e] p-1.5 transition hover:border-cyan-400"
              >
                <img
                  src={r.dataUrl}
                  alt={r.label}
                  className="h-24 w-full rounded object-contain bg-black"
                />
                <span className="mt-1.5 text-center font-mono text-[11px] text-slate-300 group-hover:text-cyan-300">
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Analyzer Output Cards */}
      {results && (
        <section data-testid="aperi-analyzer-cards" className="space-y-4">
          {TOOL_ORDER.map(({ key, title }) => {
            const raw = results[key] as
              | {
                  status?: string;
                  output?: string | string[] | Record<string, string>;
                  note?: string;
                }
              | undefined;
            if (!raw) return null;
            const ok = raw.status === 'ok';
            const output = raw.output;
            const textForCopy =
              typeof output === 'string'
                ? output
                : Array.isArray(output)
                  ? output.join('\n')
                  : output
                    ? Object.entries(output)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n')
                    : '';

            return (
              <div
                key={key}
                data-testid={`analyzer-${key}`}
                className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-cyan-400" />
                    <h3 className="font-mono text-sm font-semibold text-slate-100">{title}</h3>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                        ok
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-600 bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      {ok ? 'Success' : 'No result'}
                    </span>
                  </div>
                  {textForCopy && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyText(key, textForCopy)}
                        className="flex items-center gap-1 rounded border border-[#22304f] bg-[#070b14] px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-cyan-500/40"
                      >
                        {copiedKey === key ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => sendToChef(textForCopy)}
                        className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                      >
                        <Send className="h-3 w-3" />
                        <span>Chef</span>
                      </button>
                    </div>
                  )}
                </div>

                {raw.note && (
                  <p className="mt-2 rounded border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 font-mono text-xs text-amber-200">
                    {raw.note}
                  </p>
                )}

                {typeof output === 'string' && (
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded border border-[#152036] bg-[#06090e] p-3 font-mono text-xs text-slate-200">
                    {output}
                  </pre>
                )}

                {Array.isArray(output) && output.length > 0 && (
                  <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-[#152036] bg-[#06090e] p-3 font-mono text-xs text-slate-200">
                    {output.join('\n')}
                  </pre>
                )}

                {output && typeof output === 'object' && !Array.isArray(output) && (
                  <div className="mt-3 overflow-x-auto rounded border border-[#152036] bg-[#06090e]">
                    <table className="w-full text-left font-mono text-xs">
                      <tbody>
                        {Object.entries(output).map(([k, v]) => (
                          <tr key={k} className="border-b border-[#11192b] last:border-0">
                            <td className="w-56 px-3 py-1.5 font-semibold text-cyan-300">{k}</td>
                            <td className="px-3 py-1.5 text-slate-200">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Lightbox Modal for Bit-Plane / Remap inspection */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="max-w-4xl rounded-xl border border-cyan-500/40 bg-[#0a101d] p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="font-mono text-xs font-bold text-cyan-300">{zoomImage.title}</span>
              <div className="flex items-center gap-2">
                <a
                  href={zoomImage.src}
                  download={`${zoomImage.title.replace(/\s+/g, '_')}.png`}
                  className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs text-cyan-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setZoomImage(null)}
                  className="rounded border border-slate-700 p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <img
              src={zoomImage.src}
              alt={zoomImage.title}
              className="max-h-[75vh] w-auto rounded bg-black object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
