"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

interface ChartContainerProps {
    /** ارتفاع الرسم البياني بالبكسل — الافتراضي 300 */
    height?: number;
    children: ReactElement;
    className?: string;
}

/**
 * مكوّن موحَّد لتغليف كل رسوم Recharts.
 * يُلغي الحاجة لـ <div className="h-[...]"> + <ResponsiveContainer> في كل مكان.
 */
export function ChartContainer({ height = 300, children, className }: ChartContainerProps) {
    return (
        <div style={{ height }} className={`w-full${className ? ` ${className}` : ""}`}>
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    );
}
