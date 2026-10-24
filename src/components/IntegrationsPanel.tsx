'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { encodeBase64 } from '@/core/base64.ts';
import {
  aperiSolve,
  buildCyberChefUrl,
  chefWindowPath,
  cyberChef,
  dcode,
  fetchAperiResult,
  fetchAperiStatus,
  firstExtractedText,
  submitAperiSample,
} from '@/integrations/index.ts';

const HELLO = new TextEncoder().encode('hello');
const SAMPLES = ['example1.png', 'example2.jpg', 'example3.png'] as const;

function Badge({ label, up }: { label: string; up: boolean | null }) {
  const text = up === null ? 'checking' : up ? 'up' : 'down';
  const color = up ? 'text-emerald-300 border-emerald-500/40' : 'text-amber-300 border-amber-500/40';
  return (
    <span className={`rounded border px-2 py-0.5 font-mono text-[11px] ${up === null ? 'border-slate-600 text-slate-400' : color}`}>
      {label}: {text}
    </span>
  );
}

export default function IntegrationsPanel() {
  const router = useRouter();
  const helloBase64 = encodeBase64(HELLO);
  const bakePath = chefWindowPath(buildCyberChefUrl('to-base64', HELLO).url);
  const [health, setHealth] = useState<{ cyberchef: boolean; aperisolve: boolean } | null>(null);
  const [sample, setSample] = useState<(typeof SAMPLES)[number]>('example1.png');
  const [password, setPassword] = useState('');
  const [deep, setDeep] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [caseTodo, setCaseTodo] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string | null>(null);
  const [caseHash, setCaseHash] = useState<string | null>(null);
  const [caseText, setCaseText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openChef = (bytes: Uint8Array) => {
    const built = buildCyberChefUrl('magic', bytes);
    router.push(chefWindowPath(built.url));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/integrations/health', { cache: 'no-store' });
        const data = (await response.json()) as { cyberchef?: boolean; aperisolve?: boolean };
        if (!cancelled) {
          setHealth({ cyberchef: Boolean(data.cyberchef), aperisolve: Boolean(data.aperisolve) });
        }
      } catch {
        if (!cancelled) setHealth({ cyberchef: false, aperisolve: false });
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!caseHash) return;
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      if (Date.now() - started >= 120_000) {
        setCaseStatus('timeout');
        return;
      }
      const status = await fetchAperiStatus(caseHash);
      if (stopped) return;
      if (status.status === 'timeout') {
        setCaseStatus('timeout');
        return;
      }
      setCaseStatus(status.status ?? status.error ?? 'pending');
      if (status.status === 'completed' || status.status === 'error') {
        const results = await fetchAperiResult(caseHash);
        setCaseText(results ? firstExtractedText(results) : null);
        return;
      }
      const partial = await fetchAperiResult(caseHash);
      if (partial) setCaseText(firstExtractedText(partial));
      window.setTimeout(() => void tick(), 2000);
    };
    void tick();
    return () => {
      stopped = true;
    };
  }, [caseHash]);

  const runSample = async (file?: File) => {
    setBusy(true);
    setCaseError(null);
    setCaseTodo(null);
    setCaseText(null);
    setCaseStatus('submitting');
    const options = { password: password || undefined, deep };
    const result = file ? await aperiSolve.submit(file, options) : await submitAperiSample(sample, options);
    setBusy(false);
    if (!result.ok || !result.submissionHash) {
      setCaseStatus(null);
      setCaseError(result.error ?? 'Upload failed');
      setCaseTodo(result.todo ?? null);
      return;
    }
    setCaseHash(result.submissionHash);
    setCaseStatus('pending');
  };

  const dcodeLink = dcode.launch('');

  return (
    <div className="space-y-6">
      <section data-testid="trust-strip" className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-cyber text-lg text-slate-100">Open-source tools</h2>
          <Badge label="CyberChef" up={health ? health.cyberchef : null} />
          <Badge label="Aperi'Solve" up={health ? health.aperisolve : null} />
        </div>
        <p className="mt-2 font-mono text-xs text-slate-400">
          {cyberChef.name} {cyberChef.version} · {cyberChef.license}. {aperiSolve.name} {aperiSolve.version} · {aperiSolve.license}.
        </p>
      </section>

      <section className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-sm text-cyan-300">Chef</h3>
          <Link
            href={bakePath}
            data-testid="bake-check"
            className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-200"
          >
            Open bake check
          </Link>
        </div>
        <p className="mt-3 font-mono text-xs text-slate-400">
          Chef is the full-window CyberChef. Every operation is there.
        </p>
      </section>

      <section data-testid="cross-check" className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4">
        <h3 className="font-mono text-sm text-cyan-300">Cross-check</h3>
        <p className="mt-2 font-mono text-xs text-slate-400">
          src/core encodes &quot;hello&quot; as <span className="text-emerald-300">{helloBase64}</span>. Load bake check and confirm CyberChef prints the same string.
        </p>
      </section>

      <section data-testid="case-file" className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-sm text-cyan-300">Aperi&apos;Solve case file</h3>
          <Link
            href="/aperi"
            data-testid="open-aperi-window"
            className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-200"
          >
            Open full Aperi workbench
          </Link>
        </div>
        <p className="mt-2 font-mono text-xs text-slate-400">
          The browser posts to /api/aperisolve, which runs the built-in zero-Docker steganography &amp; PNG CRC repair engine.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="font-mono text-xs text-slate-400">
            Sample
            <select
              value={sample}
              onChange={event => setSample(event.target.value as (typeof SAMPLES)[number])}
              className="mt-1 block rounded border border-[#1a253e] bg-[#070b14] px-2 py-1 text-slate-200"
            >
              {SAMPLES.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="font-mono text-xs text-slate-400">
            Password
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-1 block rounded border border-[#1a253e] bg-[#070b14] px-2 py-1 text-slate-200"
            />
          </label>
          <label className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <input type="checkbox" checked={deep} onChange={event => setDeep(event.target.checked)} />
            Deep analysis
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runSample()}
            className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-xs text-cyan-200 disabled:opacity-50"
          >
            Run sample
          </button>
          <label className="cursor-pointer rounded border border-[#23314f] px-3 py-1 font-mono text-xs text-slate-300">
            Upload image
            <input
              data-testid="case-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void runSample(file);
              }}
            />
          </label>
        </div>
        {caseStatus && <p className="mt-3 font-mono text-xs text-slate-300">Status: {caseStatus}</p>}
        {caseError && <p className="mt-3 font-mono text-xs text-amber-300">{caseError}</p>}
        {caseTodo && <p className="mt-1 font-mono text-xs text-slate-500">{caseTodo}</p>}
        {caseText && (
          <div className="mt-3">
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-[#1a253e] bg-[#070b14] p-3 font-mono text-xs text-slate-200">
              {caseText.slice(0, 2000)}
            </pre>
            <button
              type="button"
              onClick={() => openChef(new TextEncoder().encode(caseText.slice(0, 1500)))}
              className="mt-2 rounded border border-emerald-500/40 px-3 py-1 font-mono text-xs text-emerald-200"
            >
              Open extracted text in Chef
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#1a253e] bg-[#0b101c] p-4">
        <h3 className="font-mono text-sm text-cyan-300">dCode</h3>
        <p className="mt-2 font-mono text-xs text-slate-400">{dcodeLink.attribution}</p>
        <a
          href={dcodeLink.href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block font-mono text-xs text-cyan-300 underline"
        >
          {dcodeLink.href}
        </a>
      </section>
    </div>
  );
}
