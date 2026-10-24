'use client';

import React, { useState, useEffect } from 'react';
import { HistoryEntry, WorkbenchLoad } from '@/types/analysis';
import { SendTarget, ToolParcel } from '@/lib/send-to';
import SendToBar from './SendToBar';
import { useWorkbenchLoad, useWorkbenchReset } from './useWorkbenchLoad';
import { evaluateExpression, CalcEvalResult } from '@/lib/calculator';
import { Calculator, Delete, RotateCcw, History, Equal } from 'lucide-react';

interface StandardCalculatorProps {
  onTriggerEasterEgg: (expr: string) => void;
  onLogHistory: (item: HistoryEntry) => void;
  onSend?: (target: SendTarget, parcel: ToolParcel) => void;
  loadRequest?: WorkbenchLoad | null;
  resetId?: number;
  active?: boolean;
}

export default function StandardCalculator({
  onTriggerEasterEgg,
  onLogHistory,
  onSend,
  loadRequest,
  resetId = 0,
  active = false,
}: StandardCalculatorProps) {
  const [expression, setExpression] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [historyTape, setHistoryTape] = useState<Array<{ expr: string; result: string }>>([]);

  useWorkbenchLoad(loadRequest, 'calculator', payload => {
    if (payload.expression != null) {
      setExpression(payload.expression);
      setDisplayValue(payload.expression || '0');
    }
  });

  useWorkbenchReset(resetId, () => {
    setExpression('');
    setDisplayValue('0');
    setHistoryTape([]);
  });

  const handleInput = (val: string) => {
    setExpression(prev => prev + val);
    setDisplayValue(prev => (prev === '0' && !'+-*/%()'.includes(val) ? val : prev + val));
  };

  const handleClear = () => {
    setExpression('');
    setDisplayValue('0');
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
    setDisplayValue(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleCalculate = () => {
    if (!expression) return;

    const res: CalcEvalResult = evaluateExpression(expression);

    // Easter egg check: division by zero
    if (res.isDivisionByZero) {
      onLogHistory({
        tool: 'Standard Calculator',
        operation: 'Division by Zero Exception',
        inputSummary: expression,
        resultSummary: 'FATAL ERROR: REALITY DIVISION FAILURE (Triggered Easter Egg)',
        restoreTab: 'calculator',
        restore: { expression },
      });
      onTriggerEasterEgg(expression);
      return;
    }

    if (res.success && res.displayResult !== undefined) {
      const formatted = res.displayResult;
      setHistoryTape(prev => [{ expr: expression, result: formatted }, ...prev.slice(0, 9)]);
      setDisplayValue(formatted);
      onLogHistory({
        tool: 'Standard Calculator',
        operation: 'Evaluate Expression',
        inputSummary: expression,
        resultSummary: formatted,
        restoreTab: 'calculator',
        restore: { expression },
      });
      setExpression(formatted);
    } else {
      setDisplayValue('Error');
    }
  };

  // Keyboard support
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in another input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (/[0-9.]/.test(e.key)) {
        handleInput(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleInput(e.key);
      } else if (e.key === '(' || e.key === ')') {
        handleInput(e.key);
      } else if (e.key === '%') {
        handleInput('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expression, active]);

  const buttons = [
    { label: 'C', action: handleClear, style: 'text-red-400 bg-[#151c2e] hover:bg-[#1f2a45]' },
    { label: '(', action: () => handleInput('('), style: 'text-slate-300 bg-[#0f1523] hover:bg-[#182238]' },
    { label: ')', action: () => handleInput(')'), style: 'text-slate-300 bg-[#0f1523] hover:bg-[#182238]' },
    { label: '÷', action: () => handleInput('/'), style: 'text-cyan-400 bg-[#11192a] hover:bg-[#1b2640]' },

    { label: '7', action: () => handleInput('7'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '8', action: () => handleInput('8'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '9', action: () => handleInput('9'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '×', action: () => handleInput('*'), style: 'text-cyan-400 bg-[#11192a] hover:bg-[#1b2640]' },

    { label: '4', action: () => handleInput('4'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '5', action: () => handleInput('5'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '6', action: () => handleInput('6'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '-', action: () => handleInput('-'), style: 'text-cyan-400 bg-[#11192a] hover:bg-[#1b2640]' },

    { label: '1', action: () => handleInput('1'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '2', action: () => handleInput('2'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '3', action: () => handleInput('3'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '+', action: () => handleInput('+'), style: 'text-cyan-400 bg-[#11192a] hover:bg-[#1b2640]' },

    { label: '%', action: () => handleInput('%'), style: 'text-slate-300 bg-[#0f1523] hover:bg-[#182238]' },
    { label: '0', action: () => handleInput('0'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '.', action: () => handleInput('.'), style: 'text-slate-100 bg-[#0c121e] hover:bg-[#151f33]' },
    { label: '=', action: handleCalculate, style: 'text-black bg-cyan-400 hover:bg-cyan-300 font-bold shadow-neon-cyan' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-4">
      {onSend && (
        <SendToBar
          from="calculator"
          parcel={{ hex: '', text: expression || displayValue }}
          onSend={onSend}
          disabled={!expression && displayValue === '0'}
        />
      )}
      {/* Calculator Body */}
      <div className="bg-[#0b101c] border border-[#1a253e] rounded-2xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#18233a]">
          <div className="flex items-center space-x-2 text-slate-300">
            <Calculator className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-mono font-semibold">STANDARD CALCULATOR</span>
          </div>
          <button
            onClick={handleBackspace}
            className="p-1 text-slate-400 hover:text-slate-200 transition"
            title="Backspace"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-[#060a12] border border-[#18243c] rounded-xl p-4 mb-4 text-right">
          <div className="text-xs font-mono text-slate-500 min-h-[16px] truncate">
            {expression || ' '}
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-wider truncate mt-1">
            {displayValue}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2 font-mono text-base">
          {buttons.map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`h-12 rounded-xl flex items-center justify-center font-semibold transition active:scale-95 border border-[#1a253e] ${btn.style}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Tape Panel */}
      {historyTape.length > 0 && (
        <div className="bg-[#0b101c] border border-[#1a253e] rounded-xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 border-b border-[#18233a] pb-2 mb-2">
            <div className="flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Calculation Tape</span>
            </div>
            <button
              onClick={() => setHistoryTape([])}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {historyTape.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setExpression(item.result);
                  setDisplayValue(item.result);
                }}
                className="flex justify-between items-center p-1.5 rounded hover:bg-[#0e1628] cursor-pointer text-slate-300 transition"
              >
                <span className="text-slate-500">{item.expr} =</span>
                <span className="font-bold text-cyan-300">{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
