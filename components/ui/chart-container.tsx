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
 *
 * سبب تمرير height كرقم لـ ResponsiveContainer مباشرةً (لا "100%"):
 * Recharts 3 يبدأ بـ containerHeight=-1 قبل قياس DOM.
 * عند height="100%" تُحسب calculatedHeight=-1 فيُصدر تحذير البناء.
 * عند height={number} تُحسب calculatedHeight=number>0 فلا تحذير.
 * الـ width تبقى "100%" لأن العرض التجاوبي يُحسب من ResizeObserver في المتصفح.
 */
export function ChartContainer({ height = 300, children, className }: ChartContainerProps) {
    return (
        <div className={`w-full${className ? ` ${className}` : ""}`}>
            <ResponsiveContainer width="100%" height={height}>
                {children}
            </ResponsiveContainer>
        </div>
    );
}
