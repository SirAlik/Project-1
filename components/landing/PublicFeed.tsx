"use client";

import React, { useState } from "react";
import { Award, Trophy, Rocket, ArrowLeft } from "lucide-react";

const FEED_ITEMS = [
    { id: 1, type: "activity", title: "مهرجان الرياضة المدرسية", date: "اليوم", category: "الأنشطة", icon: Rocket },
    { id: 2, type: "achievement", title: "المركز الأول في مسابقة الروبوت", date: "أمس", category: "الإنجازات", icon: Trophy },
    { id: 3, type: "initiative", title: "ساعة قراءة في المكتبة", date: "قبل يومين", category: "المبادرات", icon: Award },
    { id: 4, type: "activity", title: "زيارة علمية لمدينة الملك عبد العزيز", date: "الأسبوع الماضي", category: "الأنشطة", icon: Rocket },
    { id: 5, type: "achievement", title: "الميدالية الذهبية في أولمبياد الرياضيات", date: "الأسبوع الماضي", category: "الإنجازات", icon: Trophy },
];

export function PublicFeed() {
    const [filter, setFilter] = useState<"all" | "activity" | "achievement">("all");

    const filtered = FEED_ITEMS.filter(item => filter === "all" || item.type === filter);

    // Determine active class only after hydration to prevent mismatch
    const getTabClass = (tabId: string) => {
        const isActive = filter === tabId;
        return `px-6 py-2.5 rounded-xl text-xs font-black transition-all ${isActive ? "bg-white text-[var(--primary)] shadow-xl" : "opacity-40 hover:opacity-100"}`;
    };

    return (
        <section className="glass-panel p-10 rounded-[3rem] border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <div>
                    <h3 className="text-3xl font-bold mb-2">أحدث المستجدات</h3>
                    <p className="text-sm opacity-40 font-medium tracking-tight">آخر الأخبار والإنجازات في مدارس الفلاح</p>
                </div>

                <div className="flex p-1.5 glass-panel rounded-2xl border border-white/5">
                    {([
                        { id: "all" as const, label: "الكل" },
                        { id: "activity" as const, label: "الأنشطة" },
                        { id: "achievement" as const, label: "الإنجازات" },
                    ]).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={getTabClass(tab.id)}
                            aria-label={`فلتر ${tab.label}`}
                            suppressHydrationWarning
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {filtered.map((item, idx) => (
                    <div
                        key={item.id}
                        className="group flex items-center justify-between p-6 rounded-3xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all duration-500 animate-in fade-in slide-in-from-right-4 stagger-animate"
                        data-stagger={idx}
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-[var(--primary)] transition-transform group-hover:scale-110">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-500">{item.category}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">{item.date}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="w-10 h-10 rounded-full glass-panel border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500"
                            aria-label="عرض التفاصيل"
                            suppressHydrationWarning
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <button
                    className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity border-b border-transparent hover:border-[var(--primary)] pb-1"
                    suppressHydrationWarning
                >
                    View All Updates
                </button>
            </div>
        </section>
    );
}

