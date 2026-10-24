'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { CYBERCHEF_ORIGIN, CYBERCHEF_SANDBOX, cyberChefHomeUrl } from '@/integrations/index.ts';

export default function ChefPage() {
  const [src, setSrc] = useState(cyberChefHomeUrl());

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('recipe=') || hash.includes('theme=')) {
      setSrc(`${CYBERCHEF_ORIGIN}/${hash}`);
    }
  }, []);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#06090e]">
      <Navigation activeTab="chef" />
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
