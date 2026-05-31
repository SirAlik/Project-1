'use client';

import dynamic from 'next/dynamic';

{/* DensityToggle import removed */ }

const SyncPill = dynamic(() => import('@/components/ui/SyncPill').then(mod => mod.SyncPill), {
    ssr: false,
    loading: () => <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] w-32 h-8 rounded-full bg-white/5 animate-pulse" />
});

export function ClientOverlays() {
    return (
        <>
            {/* DensityToggle removed */}
            <SyncPill />
        </>
    );
}
