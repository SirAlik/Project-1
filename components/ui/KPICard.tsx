import React from "react";
import { LucideIcon } from "lucide-react";
import { AIExplainButton } from "@/components/ui/AIExplainButton";

interface Props {
    title: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
    icon?: LucideIcon;
    color?: "emerald" | "rose" | "blue" | "amber" | "indigo" | "violet" | "primary" | "accent" | "destructive" | "muted";
    /** Metric ID for AI Advisor integration */
    metricId?: string;
}

export function KPICard({ title, value, trend, icon: Icon, color = "primary", metricId }: Props) {
    const colors: Record<string, string> = {
        emerald: "bg-success/20 text-success",
        rose: "bg-destructive/20 text-destructive",
        blue: "bg-primary/20 text-primary",
        amber: "bg-accent-primary/20 text-accent-primary",
        indigo: "bg-primary/20 text-primary",
        violet: "bg-accent/20 text-accent",
        primary: "bg-primary/20 text-primary",
        accent: "bg-accent/20 text-accent",
        destructive: "bg-destructive/20 text-destructive",
        muted: "bg-text-secondary/20 text-text-secondary",
    };

    // Trend colors for dark surface
    const trendUpClass = "bg-primary/30 text-primary";
    const trendDownClass = "bg-destructive/30 text-destructive";

    return (
        <div className="surface-block p-6 group relative overflow-hidden hover:-translate-y-0.5 hover:shadow-[var(--shadow-depth-hover)] transition-all duration-200 ease-out">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 ${colors[color] || colors.primary} rounded-xl transition-transform group-hover:scale-110`}>
                    {Icon && <Icon className="w-5 h-5" />}
                </div>
                <div className="flex items-center gap-2">
                    {metricId && (
                        <AIExplainButton
                            metricId={metricId}
                            metricTitle={title}
                            value={value}
                        />
                    )}
                    {trend && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend === "up" ? trendUpClass : trendDownClass}`}>
                            {trend === "up" ? "▲" : "▼"}
                        </span>
                    )}
                </div>
            </div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{title}</p>
            <h4 className="text-2xl font-bold text-text-primary mt-1">{value}</h4>

            {/* Subtle glow effect on hover */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${colors[color] || colors.primary} opacity-0 group-hover:opacity-20 blur-2xl transition-opacity`} />
        </div>
    );
}

