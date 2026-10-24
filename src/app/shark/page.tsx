'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import SharkView from '@/components/SharkView';

export default function SharkPage() {
  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3]">
      <Navigation activeTab="shark" />
      <SharkView />
    </div>
  );
}
