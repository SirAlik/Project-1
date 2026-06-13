import React, { useState } from "react";
import {
    Trophy,
    Users,
    Target,
    MapPin,
    CheckCircle2,
    MoreHorizontal,
    Clock,
    Search
} from "lucide-react";
import { ActivityEvent } from "@/lib/types/activity";

interface EventListProps {
    events: ActivityEvent[];
    onUpdate: (id: string, updates: Partial<ActivityEvent>) => void;
    onDelete?: (id: string) => void;
}

export function EventList({ events, onUpdate }: EventListProps) {
    const [filterType, setFilterType] = useState<string>("all");
    const [search, setSearch] = useState("");

    const filteredEvents = events.filter(e => {
        const matchesType = filterType === "all" || e.type === filterType;
        const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 p-6 rounded-[2rem] border border-stone-200">
                <div className="relative flex-1 w-full">
                    <input
                        className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-3 text-xs focus:border-blue-500 outline-none pr-12"
                        placeholder="بحث عن فعالية أو مسابقة..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="بحث عن فعالية"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {[
                        { id: "all", label: "الكل" },
                        { id: "event", label: "فعاليات" },
                        { id: "competition", label: "مسابقات" },
                        { id: "meeting", label: "اجتماعات" },
                    ].map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setFilterType(type.id)}
                            className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type.id
                                ? "bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300"
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredEvents.map(event => (
                    <div key={event.id} className="group bg-white/80 border border-stone-200 hover:border-blue-500/30 rounded-3xl p-6 transition-all duration-500 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-full bg-blue-500/5 -skew-x-12 translate-x-16" />

                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                            <div className="flex flex-col items-center justify-center w-20 h-20 bg-stone-100 border border-stone-200 rounded-3xl group-hover:border-blue-500/50 transition-all">
                                <span className="text-[10px] font-black text-stone-500 uppercase">{new Date(event.date).toLocaleDateString('ar-SA', { weekday: 'short' })}</span>
                                <span className="text-2xl font-black text-foreground leading-none mt-1">{new Date(event.date).getDate()}</span>
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mt-1">{new Date(event.date).toLocaleDateString('ar-SA', { month: 'short' })}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {event.type === 'competition' && <Trophy className="w-3.5 h-3.5 text-[hsl(var(--accent-primary))]" />}
                                    {event.type === 'meeting' && <Users className="w-3.5 h-3.5 text-stone-500" />}
                                    {event.type === 'event' && <Target className="w-3.5 h-3.5 text-blue-500" />}
                                    <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest">{event.type}</span>
                                </div>
                                <h4 className="text-base font-black text-foreground">{event.title}</h4>
                                <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500 font-bold">
                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-zinc-700" /> {event.location || "لم يحدد"}</span>
                                    <span className="flex items-center gap-1"><Target className="w-3 h-3 text-zinc-700" /> {event.target_audience || "الجميع"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 relative z-10 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                                <p className="text-[8px] font-black text-stone-500 mb-1 uppercase tracking-tighter">مخرجات الفعالية</p>
                                <p className="text-xs font-bold text-stone-500 max-w-[200px] truncate">{event.outcome || "قيد التنفيذ..."}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onUpdate(event.id, { outcome: "تم الإنجاز بنجاح" })}
                                    className={`p-3 rounded-2xl border transition-all ${event.outcome ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-stone-100 border-stone-200 text-stone-500 hover:text-emerald-400 hover:bg-emerald-500/10"}`}
                                    aria-label="تسجيل إنجاز الفعالية"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button aria-label="خيارات إضافية" className="p-3 bg-stone-100 text-stone-500 hover:text-foreground rounded-2xl border border-stone-200 transition-all">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredEvents.length === 0 && (
                    <div className="text-center py-20 bg-white/80 border border-stone-200 border-dashed rounded-[3rem]">
                        <Clock className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <p className="text-xs font-black text-zinc-700 uppercase tracking-widest">لا توجد فعاليات تطابق البحث</p>
                    </div>
                )}
            </div>
        </div>
    );
}
