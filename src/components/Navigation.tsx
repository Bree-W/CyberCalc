'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Binary,
  Hash,
  ArrowLeftRight,
  Cpu,
  Boxes,
  Network,
  Calculator,
  Puzzle,
  ChefHat,
  Layers,
  Activity,
  Menu,
  X,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { WorkbenchTab } from '@/types/analysis';

export type ActiveTab = WorkbenchTab;

const TAB_IDS: ActiveTab[] = [
  'byte-detective',
  'hash-detective',
  'conversion-lab',
  'bitwise-lab',
  'reverse-eng',
  'networking',
  'calculator',
  'integrations',
];

export function isActiveTab(value: string): value is ActiveTab {
  return (TAB_IDS as string[]).includes(value);
}

interface NavigationProps {
  activeTab: ActiveTab | 'chef' | 'aperi' | 'shark';
  onTabChange?: (tab: ActiveTab) => void;
}

const CORE_LABS: {
  id: ActiveTab;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isSecondary?: boolean;
}[] = [
  {
    id: 'byte-detective',
    label: 'Byte Detective',
    shortLabel: 'Bytes',
    badge: 'Core',
    description: 'Auto-detect magic bytes, file signatures, entropy, and multi-base encodings.',
    icon: Binary,
  },
  {
    id: 'hash-detective',
    label: 'Hash Detective',
    shortLabel: 'Hashes',
    badge: '1.5',
    description: 'Identify unknown digest lengths and lookup Hashcat / John the Ripper modes.',
    icon: Hash,
  },
  {
    id: 'conversion-lab',
    label: 'Conversion Lab',
    shortLabel: 'Convert',
    badge: '2',
    description: 'Convert between hex, binary, two’s complement integers, ASCII, and Base64.',
    icon: ArrowLeftRight,
  },
  {
    id: 'bitwise-lab',
    label: 'Bitwise Operations',
    shortLabel: 'Bitwise',
    badge: '3',
    description: 'Run XOR brute-force, repeating-key XOR, bit shifts, and rotations.',
    icon: Cpu,
  },
  {
    id: 'reverse-eng',
    label: 'Reverse Engineering',
    shortLabel: 'RevEng',
    badge: '4',
    description: 'Inspect little/big endian words, float layouts, and byte-by-byte binary diffs.',
    icon: Boxes,
  },
  {
    id: 'networking',
    label: 'Networking',
    shortLabel: 'Net',
    badge: '5',
    description: 'Calculate IPv4/IPv6 CIDR subnets, netmasks, and RFC 5952 addresses.',
    icon: Network,
  },
  {
    id: 'calculator',
    label: 'Calculator',
    shortLabel: 'Calc',
    badge: '6',
    description: 'Evaluate hex, binary, and bitwise expressions with programmer registers.',
    icon: Calculator,
    isSecondary: true,
  },
];

const SUITE_TOOLS: {
  id: 'chef' | 'aperi' | 'shark' | 'integrations';
  href?: string;
  tabId?: ActiveTab;
  label: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'chef',
    href: '/chef',
    label: 'Chef',
    badge: 'CyberChef',
    description: 'Full GCHQ CyberChef recipe pipeline skinned for CyberCalc.',
    icon: ChefHat,
  },
  {
    id: 'aperi',
    href: '/aperi',
    label: 'Aperi',
    badge: "Aperi'Solve",
    description: 'Image steganography workbench: bit-plane decomposer, zsteg LSB, and PNG CRC repair.',
    icon: Layers,
  },
  {
    id: 'shark',
    href: '/shark',
    label: 'Shark',
    badge: 'PCAP',
    description: 'Wireshark-style packet dissector, TCP/UDP stream follower, and CTF flag hunter.',
    icon: Activity,
  },
  {
    id: 'integrations',
    tabId: 'integrations',
    label: 'Integrations',
    badge: 'Status',
    description: 'Health checks, cross-checks, dCode reference, and open-source notices.',
    icon: Puzzle,
  },
];

function corePillClass(isActive: boolean, isSecondary?: boolean): string {
  const state = isActive
    ? 'bg-[#0e172a] text-cyan-300 border border-cyan-500/50 shadow-neon-cyan'
    : isSecondary
      ? 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1424] opacity-85 border border-transparent'
      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1424] border border-transparent';
  return `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition-all duration-150 ${state}`;
}

function suitePillClass(isActive: boolean): string {
  const state = isActive
    ? 'bg-emerald-950/60 text-emerald-200 border border-emerald-400/60 shadow-sm'
    : 'bg-[#0b1322] text-emerald-300/90 hover:text-emerald-200 hover:bg-[#101c32] border border-emerald-500/25';
  return `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono whitespace-nowrap transition-all duration-150 ${state}`;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const activeLabel =
    CORE_LABS.find(t => t.id === activeTab)?.label ??
    SUITE_TOOLS.find(s => s.id === activeTab)?.label ??
    'Workbench';

  return (
    <>
      <nav className="border-b border-[#18233b] bg-[#070b12] px-3 sm:px-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 py-2">
          {/* Left: Hamburger Menu Button + Core Labs Section */}
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              data-testid="hamburger-menu-button"
              onClick={() => setDrawerOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-cyan-500/40 bg-[#0d1526] px-2.5 py-1.5 font-mono text-xs text-cyan-300 transition hover:border-cyan-400 hover:bg-[#13203a]"
              title="Open categorized tool & suite navigator"
            >
              <Menu className="h-4 w-4 text-cyan-400" />
              <span className="font-semibold">Menu</span>
              <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-200 lg:hidden">
                {activeLabel}
              </span>
            </button>

            <div className="mx-1 hidden h-5 w-px shrink-0 bg-[#1c2942] sm:block" />
            <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500 xl:inline">
              Core Labs
            </span>

            <div className="hidden items-center gap-1 md:flex">
              {CORE_LABS.map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                const className = corePillClass(isActive, tab.isSecondary);
                const content = (
                  <>
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.shortLabel}</span>
                  </>
                );
                if (!onTabChange) {
                  return (
                    <Link key={tab.id} href={`/?tab=${tab.id}`} className={className}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={className}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Open-Source Suites Section (Chef, Aperi, Shark) */}
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden h-5 w-px bg-[#1c2942] md:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-emerald-400/80 xl:inline">
              Suites
            </span>
            {SUITE_TOOLS.map(suite => {
              const isActive = activeTab === suite.id;
              const Icon = suite.icon;
              const className = suitePillClass(isActive);
              const content = (
                <>
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-300' : 'text-emerald-400/80'}`} />
                  <span className="font-medium">{suite.label}</span>
                  <span className="hidden rounded bg-emerald-500/15 px-1.5 py-0.2 font-mono text-[10px] text-emerald-300 sm:inline">
                    {suite.badge}
                  </span>
                </>
              );

              if (suite.href) {
                return (
                  <Link key={suite.id} href={suite.href} className={className}>
                    {content}
                  </Link>
                );
              }
              if (suite.tabId && onTabChange) {
                return (
                  <button
                    key={suite.id}
                    type="button"
                    onClick={() => onTabChange(suite.tabId!)}
                    className={className}
                  >
                    {content}
                  </button>
                );
              }
              return (
                <Link key={suite.id} href={`/?tab=${suite.tabId}`} className={className}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Slide-out Categorized Hamburger Drawer */}
      {drawerOpen && (
        <div
          data-testid="hamburger-drawer"
          className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="flex h-full w-full max-w-md flex-col border-r border-cyan-500/30 bg-[#080d18] p-5 text-slate-100 shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#18233b] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-cyber text-sm font-bold tracking-wider text-cyan-300">
                    CYBERCALC NAVIGATOR
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Student CTF &amp; Forensics Toolkit
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-testid="close-hamburger-drawer"
                onClick={() => setDrawerOpen(false)}
                className="rounded border border-slate-700 p-1.5 text-slate-400 hover:border-cyan-500/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: Core CyberCalc Labs */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  1 · Core CyberCalc Labs
                </span>
                <span className="font-mono text-[10px] text-slate-500">Instant In-Browser Math &amp; Bytes</span>
              </div>
              <div className="space-y-1.5">
                {CORE_LABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  const itemClass = `flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition ${
                    isActive
                      ? 'border-cyan-400/60 bg-[#0e1b31] text-cyan-200'
                      : 'border-[#152036] bg-[#0b111e] text-slate-300 hover:border-cyan-500/40'
                  }`;
                  const inner = (
                    <>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold">{tab.label}</span>
                          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                            {tab.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] leading-snug text-slate-400">
                          {tab.description}
                        </p>
                      </div>
                    </>
                  );

                  if (!onTabChange) {
                    return (
                      <Link
                        key={tab.id}
                        href={`/?tab=${tab.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className={itemClass}
                      >
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        onTabChange(tab.id);
                        setDrawerOpen(false);
                      }}
                      className={itemClass}
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Open-Source Suites */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>2 · Open-Source Power Suites</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">Zero-Docker Local Dupes</span>
              </div>
              <div className="space-y-2">
                {SUITE_TOOLS.map(suite => {
                  const isActive = activeTab === suite.id;
                  const Icon = suite.icon;
                  const itemClass = `flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition ${
                    isActive
                      ? 'border-emerald-400/60 bg-emerald-950/40 text-emerald-200'
                      : 'border-emerald-500/25 bg-[#0b1320] text-slate-200 hover:border-emerald-400/50'
                  }`;
                  const inner = (
                    <>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-emerald-200">
                            {suite.label}
                          </span>
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                            {suite.badge}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] leading-snug text-slate-400">
                          {suite.description}
                        </p>
                      </div>
                    </>
                  );

                  if (suite.href) {
                    return (
                      <Link
                        key={suite.id}
                        href={suite.href}
                        onClick={() => setDrawerOpen(false)}
                        className={itemClass}
                      >
                        {inner}
                      </Link>
                    );
                  }
                  if (suite.tabId && onTabChange) {
                    return (
                      <button
                        key={suite.id}
                        type="button"
                        onClick={() => {
                          onTabChange(suite.tabId!);
                          setDrawerOpen(false);
                        }}
                        className={itemClass}
                      >
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={suite.id}
                      href={`/?tab=${suite.tabId}`}
                      onClick={() => setDrawerOpen(false)}
                      className={itemClass}
                    >
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
