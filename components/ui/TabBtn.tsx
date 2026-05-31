import React from "react";

interface Props {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

export function TabBtn({ active, onClick, children, icon }: Props) {
    return (
        <button
            onClick={onClick}
            className={`
        relative rounded-xl border px-4 py-2 text-sm font-bold transition-all duration-300 flex items-center gap-2
        ${active
                    ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }
      `}
        >
            {icon && icon}
            {children}
            {active && (
                <span className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-1/2 bg-primary/50 blur-sm" />
            )}
        </button>
    );
}
