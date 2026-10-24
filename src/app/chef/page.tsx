'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import SendToBar from '@/components/SendToBar';
import { useFollowSend } from '@/components/useFollowSend';
import { CYBERCHEF_ORIGIN, CYBERCHEF_SANDBOX, cyberChefHomeUrl } from '@/integrations/index.ts';
import { parcelBytes, readParcel, spacedHex, ToolParcel } from '@/lib/send-to';

function bytesFromChefHash(hash: string): Uint8Array | null {
  const input = new URLSearchParams(hash.replace(/^#/, '')).get('input');
  if (!input) return null;
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export default function ChefPage() {
  const follow = useFollowSend();
  const [src, setSrc] = useState(cyberChefHomeUrl());
  const [parcel, setParcel] = useState<ToolParcel>({ hex: '', text: '' });
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('recipe=') || hash.includes('theme=')) {
      const base = CYBERCHEF_ORIGIN.endsWith('.html') ? CYBERCHEF_ORIGIN : `${CYBERCHEF_ORIGIN}/`;
      setSrc(`${base}${hash}`);
    }
    const fromHash = bytesFromChefHash(hash);
    const stored = readParcel();
    const bytes = fromHash && fromHash.length > 0 ? fromHash : stored ? parcelBytes(stored) : new Uint8Array();
    setParcel({ hex: spacedHex(bytes), text: stored?.text ?? '' });
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#06090e]">
      <Navigation activeTab="chef" />
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1a233a] bg-[#070b12] px-4 py-2">
        <SendToBar
          from="chef"
          parcel={parcel}
          disabled={!parcel.hex && !parcel.text}
          onSend={(target, current) => setNote(follow(target, current))}
        />
        {note && <span className="font-mono text-[11px] text-slate-400">{note}</span>}
      </div>
      <iframe
        data-testid="cyberchef-iframe"
        title="Chef"
        sandbox={CYBERCHEF_SANDBOX}
        src={src}
        className="min-h-0 w-full flex-1 border-0 bg-[#06090e]"
      />
    </div>
  );
}
