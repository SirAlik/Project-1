import React from "react";
import { InventoryItem } from "@/lib/types/science";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export function InventoryList({ items }: { items: InventoryItem[] }) {
    if (items.length === 0) {
        return <div className="text-zinc-500 text-sm p-4">المخزون فارغ حالياً.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
                <Card key={item.id} className="relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-sm font-bold text-zinc-200">{item.name}</div>
                            <div className="text-xs text-zinc-400 mt-1">{item.category}</div>
                        </div>
                        <Pill>{item.quantity} {item.unit}</Pill>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">{item.location}</span>
                        <StatusIndicator status={item.status} />
                    </div>
                </Card>
            ))}
        </div>
    );
}

function StatusIndicator({ status }: { status: InventoryItem["status"] }) {
    const colors = {
        available: "bg-emerald-500",
        low_stock: "bg-[hsl(var(--gold))]",
        out_of_stock: "bg-rose-500"
    };
    const labels = {
        available: "متوفر",
        low_stock: "منخفض",
        out_of_stock: "نفد"
    };

    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${colors[status]} shadow-[0_0_8px_currentColor]`} />
            <span className="text-zinc-300">{labels[status]}</span>
        </div>
    );
}
