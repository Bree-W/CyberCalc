'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Navigation, { ActiveTab } from '@/components/Navigation';
import ByteDetectivePanel from '@/components/ByteDetectivePanel';
import HashDetectivePanel from '@/components/HashDetectivePanel';
import ConversionLab from '@/components/ConversionLab';
import BitwiseLab from '@/components/BitwiseLab';
import ReverseEngineeringLab from '@/components/ReverseEngineeringLab';
import NetworkingLab from '@/components/NetworkingLab';
import StandardCalculator from '@/components/StandardCalculator';
import FatalShutdownModal from '@/components/FatalShutdownModal';
import TraceHistoryModal from '@/components/TraceHistoryModal';
import { TraceHistoryItem } from '@/types/analysis';
import { Check } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('byte-detective');
  const [history, setHistory] = useState<TraceHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Easter Egg State
  const [isEasterEggActive, setIsEasterEggActive] = useState<boolean>(false);
  const [easterEggExpr, setEasterEggExpr] = useState<string>('42 / 0');

  // Cross-tool injection state
  const [byteDetectiveInput, setByteDetectiveInput] = useState<string>('');
  const [hashDetectiveInput, setHashDetectiveInput] = useState<string>('');

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLogHistory = (item: {
    tool: TraceHistoryItem['tool'];
    operation: string;
    inputSummary: string;
    params?: string;
    resultSummary: string;
  }) => {
    const newItem: TraceHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      ...item,
    };
    setHistory(prev => [newItem, ...prev.slice(0, 49)]); // keep last 50 session items
  };

  const handleResetWorkbench = () => {
    setByteDetectiveInput('');
    setHashDetectiveInput('');
    showToast('Workbench inputs reset');
  };

  const handleTriggerEasterEgg = (expr: string) => {
    setEasterEggExpr(expr);
    setIsEasterEggActive(true);
  };

  const handleRestoreFromEasterEgg = () => {
    setIsEasterEggActive(false);
    showToast('Workbench restored from reality division exception');
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3] flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onReset={handleResetWorkbench}
        historyCount={history.length}
      />

      {/* Main Tab Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Workbench Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0e172a] border border-cyan-500/50 text-cyan-300 px-4 py-2.5 rounded-lg shadow-neon-cyan font-mono text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Byte Detective */}
        {activeTab === 'byte-detective' && (
          <ByteDetectivePanel
            initialInput={byteDetectiveInput}
            onLogHistory={handleLogHistory}
          />
        )}

        {/* 1.5 Hash Detective */}
        {activeTab === 'hash-detective' && (
          <HashDetectivePanel
            initialHash={hashDetectiveInput}
            onLogHistory={handleLogHistory}
          />
        )}

        {/* 2. Conversion Lab */}
        {activeTab === 'conversion-lab' && (
          <ConversionLab onLogHistory={handleLogHistory} />
        )}

        {/* 3. Bitwise Operations */}
        {activeTab === 'bitwise-lab' && (
          <BitwiseLab onLogHistory={handleLogHistory} />
        )}

        {/* 4. Reverse Engineering */}
        {activeTab === 'reverse-eng' && (
          <ReverseEngineeringLab onLogHistory={handleLogHistory} />
        )}

        {/* 5. Networking */}
        {activeTab === 'networking' && (
          <NetworkingLab onLogHistory={handleLogHistory} />
        )}

        {/* 6. Standard Calculator */}
        {activeTab === 'calculator' && (
          <StandardCalculator
            onTriggerEasterEgg={handleTriggerEasterEgg}
            onLogHistory={handleLogHistory}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141e33] bg-[#070b13] py-4 px-4 text-center font-mono text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-bold">CYBERCALC</span>
            <span>— Forensic &amp; Cryptographic Data Workbench</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FatalShutdownModal
        isOpen={isEasterEggActive}
        onRestore={handleRestoreFromEasterEgg}
        expressionTriggered={easterEggExpr}
      />

      <TraceHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onClear={() => setHistory([])}
        onSelectHistoryItem={item => {
          if (item.tool === 'Byte Detective') {
            setActiveTab('byte-detective');
            setByteDetectiveInput(item.inputSummary);
          } else if (item.tool === 'Hash Detective') {
            setActiveTab('hash-detective');
            setHashDetectiveInput(item.inputSummary);
          }
          showToast(`Loaded "${item.operation}"`);
        }}
      />
    </div>
  );
}
