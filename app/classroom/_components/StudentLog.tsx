import React from "react";
import { EventRow } from "@/lib/types/classroom";

interface Props {
    events: EventRow[];
    loading: boolean;
}

export function StudentLog({ events, loading }: Props) {
    function fmtTime(iso: string) {
        return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    }

    return (
        <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-sm shadow-lg h-full">
            <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                <h2 className="text-lg font-semibold text-foreground">سجل الأحداث</h2>
                <span className="text-xs text-muted-foreground">{events.length} سجل</span>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
            ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm italic">
                    لا توجد أحداث مسجلة لهذا الطالب اليوم.
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((e) => (
                        <div
                            key={e.id}
                            className="group flex flex-col gap-1 rounded-xl border border-border bg-muted/40 px-4 py-3 transition-all hover:bg-muted/60 hover:border-primary/20"
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${getTypeColor(e.type)}`}>
                                    {e.type}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">{fmtTime(e.created_at)}</span>
                            </div>

                            {e.note && (
                                <p className="text-xs text-muted-foreground/80 border-r-2 border-border pr-2 mt-1">
                                    {e.note}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getTypeColor(type: string) {
    if (type.includes("غياب") || type.includes("تأخر") || type.includes("واجب")) return "text-destructive";
    if (type.includes("شارك") || type.includes("نجم")) return "text-primary";
    if (type.includes("استئذان")) return "text-warning";
    return "text-foreground opacity-70";
}
