import React from "react";

export function TabBtn({
    active,
    onClick,
    children,
    icon
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${active
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
        >
            {icon && icon}
            {children}
        </button>
    );
}

// Previously in page.tsx as separate buttons, we can make a container if needed but the primitive is enough.
