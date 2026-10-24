'use client';

import React from 'react';
import { SEND_TARGETS, SendTarget, ToolParcel } from '@/lib/send-to';

interface SendToBarProps {
  from: SendTarget;
  parcel: ToolParcel;
  onSend: (target: SendTarget, parcel: ToolParcel) => void;
  disabled?: boolean;
}

export default function SendToBar({ from, parcel, onSend, disabled }: SendToBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[11px] text-slate-500">Send to</span>
      {SEND_TARGETS.filter(target => target.id !== from).map(target => (
        <button
          key={target.id}
          type="button"
          disabled={disabled}
          onClick={() => onSend(target.id, parcel)}
          className="rounded border border-[#202d4a] bg-[#101726] px-2 py-0.5 font-mono text-[11px] text-emerald-300 hover:bg-[#18233a] disabled:opacity-40"
        >
          {target.label}
        </button>
      ))}
    </div>
  );
}
