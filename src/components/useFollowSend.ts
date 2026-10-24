'use client';

import { useRouter } from 'next/navigation';
import { routeParcel, saveParcel, SendTarget, stageAperi, stagePending, ToolParcel } from '@/lib/send-to';

/** Leave Chef or Aperi and open another tool with the current bytes. */
export function useFollowSend() {
  const router = useRouter();
  return (target: SendTarget, parcel: ToolParcel): string => {
    const route = routeParcel(target, parcel);
    if (route.kind === 'reject') return route.toast;
    if (route.kind === 'load') {
      stagePending(route);
      router.push(`/?tab=${route.tab}`);
      return route.toast;
    }
    if (route.kind === 'chef') {
      saveParcel(parcel);
      router.push(route.href);
      return route.toast;
    }
    if (!stageAperi(parcel)) return 'That image is too large to hand off in this tab';
    router.push('/aperi');
    return route.toast;
  };
}
