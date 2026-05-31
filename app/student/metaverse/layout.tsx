'use client';

import React from 'react';
import { BottomNav } from '@/components/metaverse/BottomNav';

export default function MetaverseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="min-h-screen bg-background text-foreground pb-24 overflow-x-hidden relative font-body"
        >
            {/* Antigravity Dots Mask */}
            <div className="antigravity-dots" />

            {/* Background Subtle Gradient Glows (Aurora Blend Effect) */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-accent/10 blur-[150px] rounded-full" />
            </div>

            {/* Glitch Overlay (Triggered by corruption level) */}
            {/* <GlitchOverlay level={1} /> */}

            <main className="relative z-10 p-4 max-w-lg mx-auto">
                {children}
            </main>

            <BottomNav />
        </div>
    );
}
