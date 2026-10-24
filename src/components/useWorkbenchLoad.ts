'use client';

import { useEffect, useRef } from 'react';
import { WorkbenchLoad, WorkbenchTab } from '@/types/analysis';

/** Apply a load request once per id, including while the lab is hidden. */
export function useWorkbenchLoad(
  loadRequest: WorkbenchLoad | null | undefined,
  tab: WorkbenchTab,
  apply: (payload: Record<string, string>) => void
) {
  const appliedId = useRef(0);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (!loadRequest || loadRequest.tab !== tab) return;
    if (loadRequest.id === appliedId.current) return;
    appliedId.current = loadRequest.id;
    applyRef.current(loadRequest.payload);
  }, [loadRequest, tab]);
}

/** Clear lab inputs when the workbench reset counter changes. */
export function useWorkbenchReset(resetId: number, clear: () => void) {
  const seen = useRef(resetId);
  const clearRef = useRef(clear);
  clearRef.current = clear;

  useEffect(() => {
    if (resetId === seen.current) return;
    seen.current = resetId;
    clearRef.current();
  }, [resetId]);
}
