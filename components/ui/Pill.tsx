import React from "react";

export interface PillProps {
    children: React.ReactNode;
    className?: string;
    color?: "zinc" | "amber" | "rose" | "emerald" | "blue" | "violet";
}

export function Pill({ children, className = "", color = "zinc" }: PillProps) {
    const colors = {
        zinc: "border-border bg-muted text-muted-foreground",
        amber: "border-warning/20 bg-warning/10 text-warning",
        rose: "border-destructive/20 bg-destructive/10 text-destructive",
        emerald: "border-success/20 bg-success/10 text-success",
        blue: "border-primary/20 bg-primary/10 text-primary",
        violet: "border-accent/20 bg-accent/10 text-accent"
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md shadow-sm transition-all duration-300 ${colors[color] || colors.zinc} ${className}`}>
            {children}
        </span>
    );
}
