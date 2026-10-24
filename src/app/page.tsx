'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Navigation, { ActiveTab, isActiveTab } from '@/components/Navigation';
import ByteDetectivePanel from '@/components/ByteDetectivePanel';
import HashDetectivePanel from '@/components/HashDetectivePanel';
import ConversionLab from '@/components/ConversionLab';
import BitwiseLab from '@/components/BitwiseLab';
import ReverseEngineeringLab from '@/components/ReverseEngineeringLab';
import NetworkingLab from '@/components/NetworkingLab';
import StandardCalculator from '@/components/StandardCalculator';
import FatalShutdownModal from '@/components/FatalShutdownModal';
import TraceHistoryModal from '@/components/TraceHistoryModal';
import IntegrationsPanel from '@/components/IntegrationsPanel';
import { buildCyberChefUrl, chefWindowPath } from '@/integrations/index.ts';
import AttributionDrawer from '@/components/AttributionDrawer';
import { TraceHistoryItem, WorkbenchLoad } from '@/types/analysis';
import { AnalystAction } from '@/lib/analyst';
import { routeParcel, saveParcel, SendTarget, stageAperi, takePending, ToolParcel } from '@/lib/send-to';
import { Check } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('byte-detective');
  const [history, setHistory] = useState<TraceHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isNoticesOpen, setIsNoticesOpen] = useState<boolean>(false);

  // Easter Egg State
  const [isEasterEggActive, setIsEasterEggActive] = useState<boolean>(false);
  const [easterEggExpr, setEasterEggExpr] = useState<string>('42 / 0');
  const [loadRequest, setLoadRequest] = useState<WorkbenchLoad | null>(null);
  const [resetId, setResetId] = useState(0);
  const loadSeq = useRef(0);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const pushLoad = (tab: ActiveTab, payload: Record<string, string>) => {
    loadSeq.current += 1;
    setActiveTab(tab);
    setLoadRequest({ id: loadSeq.current, tab, payload });
  };

  const handleLogHistory = (item: Omit<TraceHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: TraceHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      ...item,
    };
    setHistory(prev => [newItem, ...prev.slice(0, 49)]); // keep last 50 session items
  };

  const handleResetWorkbench = () => {
    setResetId(id => id + 1);
    showToast('Workbench inputs reset');
  };

  const deliver = (target: SendTarget, parcel: ToolParcel) => {
    const route = routeParcel(target, parcel);
    if (route.kind === 'reject') {
      showToast(route.toast);
      return;
    }
    if (route.kind === 'load') {
      pushLoad(route.tab, route.payload);
      showToast(route.toast);
      return;
    }
    if (route.kind === 'chef') {
      saveParcel(parcel);
      showToast(route.toast);
      router.push(route.href);
      return;
    }
    if (!stageAperi(parcel)) {
      showToast('That image is too large to hand off in this tab');
      return;
    }
    showToast(route.toast);
    router.push('/aperi');
  };

  const handleAnalystAction = (
    action: Exclude<AnalystAction, 'none' | 'decode-base64'>,
    hex: string,
    text: string
  ) => {
    if (action === 'single-byte-xor') {
      pushLoad('bitwise-lab', { subtab: 'single-key-bruteforce', brute: hex.replace(/\s+/g, '') });
      showToast('Model chose single-byte XOR');
    } else if (action === 'repeating-xor') {
      pushLoad('bitwise-lab', { subtab: 'repeating-xor', data: hex });
      showToast('Model chose repeating-key XOR');
    } else if (action === 'endianness') {
      pushLoad('reverse-eng', { subtab: 'endianness', input: hex.split(/\s+/).slice(0, 16).join(' ') });
      showToast('Model chose endianness');
    } else if (action === 'identify-hash') {
      pushLoad('hash-detective', { input: text });
      showToast('Model chose hash identification');
    } else if (action === 'open-cyberchef') {
      deliver('chef', { hex, text });
    } else if (action === 'inspect-image') {
      deliver('aperi', { hex, text });
    }
  };

  const handleTriggerEasterEgg = (expr: string) => {
    setEasterEggExpr(expr);
    setIsEasterEggActive(true);
  };

  const handleRestoreFromEasterEgg = () => {
    setIsEasterEggActive(false);
    showToast('Workbench restored from reality division exception');
  };

  useEffect(() => {
    const pending = takePending();
    if (pending && isActiveTab(pending.tab)) {
      pushLoad(pending.tab, pending.payload);
      showToast(pending.toast);
      return;
    }
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && isActiveTab(tab)) setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3] flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenNotices={() => setIsNoticesOpen(true)}
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

        {/* Labs stay mounted so switching tabs keeps what you typed. */}
        <div className={activeTab === 'byte-detective' ? undefined : 'hidden'}>
          <ByteDetectivePanel
            loadRequest={loadRequest}
            resetId={resetId}
            onLogHistory={handleLogHistory}
            onOpenInCyberChef={handoff => {
              const built = buildCyberChefUrl(handoff.recipe, handoff.bytes);
              router.push(chefWindowPath(built.url));
            }}
            onSend={deliver}
            onApplyAnalyst={handleAnalystAction}
          />
        </div>
        <div className={activeTab === 'hash-detective' ? undefined : 'hidden'}>
          <HashDetectivePanel
            loadRequest={loadRequest}
            resetId={resetId}
            onLogHistory={handleLogHistory}
            onSend={deliver}
          />
        </div>
        <div className={activeTab === 'conversion-lab' ? undefined : 'hidden'}>
          <ConversionLab loadRequest={loadRequest} resetId={resetId} onLogHistory={handleLogHistory} onSend={deliver} />
        </div>
        <div className={activeTab === 'bitwise-lab' ? undefined : 'hidden'}>
          <BitwiseLab loadRequest={loadRequest} resetId={resetId} onLogHistory={handleLogHistory} onSend={deliver} />
        </div>
        <div className={activeTab === 'reverse-eng' ? undefined : 'hidden'}>
          <ReverseEngineeringLab loadRequest={loadRequest} resetId={resetId} onLogHistory={handleLogHistory} onSend={deliver} />
        </div>
        <div className={activeTab === 'networking' ? undefined : 'hidden'}>
          <NetworkingLab loadRequest={loadRequest} resetId={resetId} onLogHistory={handleLogHistory} onSend={deliver} />
        </div>
        <div className={activeTab === 'calculator' ? undefined : 'hidden'}>
          <StandardCalculator
            active={activeTab === 'calculator'}
            loadRequest={loadRequest}
            resetId={resetId}
            onTriggerEasterEgg={handleTriggerEasterEgg}
            onLogHistory={handleLogHistory}
            onSend={deliver}
          />
        </div>
        <div className={activeTab === 'integrations' ? undefined : 'hidden'}>
          <IntegrationsPanel loadRequest={loadRequest} onSend={deliver} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141e33] bg-[#070b13] py-4 px-4 text-center font-mono text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-bold">CYBERCALC</span>
            <span>— Forensic &amp; Cryptographic Data Workbench</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Labs &amp; CyberChef stay in the browser</span>
            <span>•</span>
            <span>Aperi&apos;Solve runs locally</span>
            <span>•</span>
            <span>Open model is opt-in</span>
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
          if (item.restoreTab && item.restore) {
            pushLoad(item.restoreTab, item.restore);
            showToast(`Loaded "${item.operation}"`);
            return;
          }
          showToast('This entry has no stored input to reload');
        }}
      />
      <AttributionDrawer isOpen={isNoticesOpen} onClose={() => setIsNoticesOpen(false)} />
    </div>
  );
}
