"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDown, Layers } from "lucide-react";

interface ClassSelectorProps {
    classes: { id: string; name: string }[];
    selectedClassId: string | null;
    onSelect: (id: string) => void;
}

export function ClassSelector({ classes, selectedClassId, onSelect }: ClassSelectorProps) {
    // Extract unique grades if names follow "1/A" or "الصف الأول" pattern
    // For now, let's keep it simple and just group them if there are many
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Layers className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-100 italic">اختيار الفصل الدراسي</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Select Grade & Section</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    aria-label={isExpanded ? "طي القائمة" : "توسيع القائمة"}
                >
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {classes.map((cls) => (
                        <button
                            key={cls.id}
                            onClick={() => onSelect(cls.id)}
                            className={`group relative p-3 rounded-2xl border transition-all overflow-hidden ${selectedClassId === cls.id
                                ? "bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                                }`}
                            aria-label={`اختر الفصل ${cls.name}`}
                        >
                            <div className="relative z-10">
                                <span className={`text-xs font-bold block transition-colors ${selectedClassId === cls.id ? "text-emerald-300" : "text-zinc-500 group-hover:text-zinc-300"
                                    }`}>
                                    {cls.name}
                                </span>
                            </div>
                            {selectedClassId === cls.id && (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                            )}
                        </button>
                    ))}
                    {classes.length === 0 && (
                        <p className="col-span-full text-center py-6 text-zinc-600 text-xs italic">
                            ... لا توجد فصول دراسية متاحة حالياً
                        </p>
                    )}
                </div>
            )}
        </Card>
    );
}

