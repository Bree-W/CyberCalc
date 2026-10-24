'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import AperiSolveView from '@/components/AperiSolveView';

export default function AperiPage() {
  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3]">
      <Navigation activeTab="aperi" />
      <AperiSolveView />
    </div>
  );
}
