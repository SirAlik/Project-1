"use client";

import React, { useEffect, useState } from "react";

export function DevTokenStrip() {
    const [tokens, setTokens] = useState<Record<string, string>>({});

    useEffect(() => {
        const updateTokens = () => {
            const style = getComputedStyle(document.documentElement);
            setTokens({
                "Bg": style.getPropertyValue("--background"),
                "Fg": style.getPropertyValue("--foreground"),
                "Card": style.getPropertyValue("--card"),
                "Primary": style.getPropertyValue("--primary"),
                "Border": style.getPropertyValue("--border"),
            });
        };

        // Initial update
        updateTokens();

        // Update on click (useful if something changes dynamically, though it shouldn't anymore)
        window.addEventListener("click", updateTokens);
        return () => window.removeEventListener("click", updateTokens);
    }, []);

    // HSL Preview Helper
    const ColorBlock = ({ hsl, label }: { hsl: string; label: string }) => (
        <div className="flex items-center gap-2 text-[10px] font-mono">
            <div
                className="w-4 h-4 rounded border border-white/20 bg-[hsl(var(--token-value))]"
                style={{ "--token-value": hsl } as React.CSSProperties}
            />
            <span className="opacity-70">{label}:</span>
            <span className="opacity-100">{hsl}</span>
        </div>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/90 text-white p-2 border-t border-white/10 flex items-center justify-center gap-6 pointer-events-none">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                BRAND LOCK: ON
            </span>
            <div className="flex gap-4">
                {Object.entries(tokens).map(([key, val]) => (
                    <ColorBlock key={key} label={key} hsl={val} />
                ))}
            </div>
        </div>
    );
}
