'use client';

import React from 'react';
import {
  Binary,
  Hash,
  ArrowLeftRight,
  Cpu,
  Boxes,
  Network,
  Calculator,
} from 'lucide-react';

export type ActiveTab =
  | 'byte-detective'
  | 'hash-detective'
  | 'conversion-lab'
  | 'bitwise-lab'
  | 'reverse-eng'
  | 'networking'
  | 'calculator';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    {
      id: 'byte-detective' as ActiveTab,
      label: 'Byte Detective',
      badge: 'Core',
      icon: Binary,
      accent: 'cyan',
    },
    {
      id: 'hash-detective' as ActiveTab,
      label: 'Hash Detective',
      badge: '1.5',
      icon: Hash,
      accent: 'teal',
    },
    {
      id: 'conversion-lab' as ActiveTab,
      label: 'Conversion Lab',
      badge: '2',
      icon: ArrowLeftRight,
      accent: 'emerald',
    },
    {
      id: 'bitwise-lab' as ActiveTab,
      label: 'Bitwise Operations',
      badge: '3',
      icon: Cpu,
      accent: 'cyan',
    },
    {
      id: 'reverse-eng' as ActiveTab,
      label: 'Reverse Engineering',
      badge: '4',
      icon: Boxes,
      accent: 'teal',
    },
    {
      id: 'networking' as ActiveTab,
      label: 'Networking',
      badge: '5',
      icon: Network,
      accent: 'cyan',
    },
    {
      id: 'calculator' as ActiveTab,
      label: 'Calculator',
      badge: '6',
      icon: Calculator,
      accent: 'slate',
      isSecondary: true,
    },
  ];

  return (
    <nav className="border-b border-[#18233b] bg-[#070b12] px-4 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-2 py-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-mono whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? tab.id === 'calculator'
                    ? 'bg-[#1a233a] text-slate-200 border border-slate-600 shadow-sm'
                    : 'bg-[#0e172a] text-cyan-300 border border-cyan-500/50 shadow-neon-cyan'
                  : tab.isSecondary
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1424] opacity-80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d1424]'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? tab.id === 'calculator'
                      ? 'text-slate-300'
                      : 'text-cyan-400'
                    : 'text-slate-400'
                }`}
              />
              <span className="font-medium">{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-[#141d2f] text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
