"use client";

import React, { useState } from "react";
import { useLRC } from "./_hooks/useLRC";
import { BookList } from "./_components/BookList";
import { LendingDesk } from "./_components/LendingDesk";
import { ClassVisitManager } from "./_components/ClassVisitManager";
import { BookingManager } from "./_components/BookingManager";
import { LrcDashboard } from "./_components/LrcDashboard";
import { generateLRCCertificate } from "./_components/CertificateGenerator";
import { KPICard } from "@/components/ui/KPICard";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import {
    BookOpen,
    Library,
    BookMarked,
    Users,
    Calendar,
    LayoutDashboard,
    ShieldCheck,
    Activity
} from "lucide-react";

export default function LRCPage() {
    const { state, actions } = useLRC();
    const [tab, setTab] = useState<"dashboard" | "books" | "lending" | "visits" | "bookings">("dashboard");

    return (
        <main className="min-h-screen text-[var(--text)] font-sans pb-20" dir="rtl">
            <div className="relative z-10 mx-auto max-w-7xl px-8 pt-16">
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-[hsla(var(--gold),.10)] rounded-lg flex items-center justify-center">
                                <Library className="w-4 h-4 text-[hsl(var(--gold))]" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">School OS • Library Resource Center</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            بوابة أمين <span className="text-[hsl(var(--gold))]">المصادر</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-left md:text-right hidden md:block">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-1">حالة النظام</div>
                            <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-pulse" />
                                متصل بالخادم
                            </div>
                        </div>

                        <nav className="flex p-1.5 glass-panel rounded-3xl overflow-hidden border">
                            {[
                                { id: "dashboard", label: "الرئيسية", icon: <LayoutDashboard className="w-4 h-4" /> },
                                { id: "lending", label: "الإعارة", icon: <BookMarked className="w-4 h-4" /> },
                                { id: "bookings", label: "الحجوزات", icon: <Calendar className="w-4 h-4" /> },
                                { id: "visits", label: "الزيارات", icon: <Users className="w-4 h-4" /> },
                                { id: "books", label: "الفهارس", icon: <BookOpen className="w-4 h-4" /> },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id as typeof tab)}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${tab === t.id
                                        ? "bg-[var(--surface)] text-[var(--primary)] border border-[var(--primary)]/20 shadow-xl"
                                        : "opacity-40 hover:opacity-100"
                                        }`}
                                >
                                    <span className={tab === t.id ? 'animate-pulse' : ''}>{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                {/* KPI Strip */}
                {state.stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <KPICard title="إجمالي الكتب" value={state.stats.totalBooks} color="primary" icon={BookOpen} />
                        <KPICard title="إعارات نشطة" value={state.stats.activeLoansCount} trend="neutral" color="primary" icon={BookMarked} />
                        <KPICard title="طلبات حجز" value={state.bookings.filter(b => b.status === "pending").length} trend="neutral" color="accent" icon={Calendar} />
                        <KPICard title="متأخرات" value={state.stats.overdueCount} trend={state.stats.overdueCount > 0 ? "down" : "up"} color="rose" icon={Activity} />
                    </div>
                )}

                {/* AI Insight */}
                <div className="mb-8">
                    <AIInsightCard contextType="lrc_usage" title="الرؤية الذكية — مركز مصادر التعلم" />
                </div>

                {state.msg && (
                    <div className="mb-8 p-4 glass-panel border border-[hsla(var(--gold),.20)] text-[hsl(var(--gold))] text-xs font-bold rounded-2xl animate-in fade-in slide-in-from-top-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 shadow-pulse" />
                            {state.msg}
                        </div>
                        <button onClick={() => actions.setMsg("")} className="opacity-40 hover:opacity-100 transition-opacity">إغلاق</button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
                        <div className="p-8">
                            {tab === "dashboard" && (
                                <LrcDashboard
                                    stats={state.stats}
                                    onGenerateCertificate={generateLRCCertificate}
                                />
                            )}

                            {tab === "bookings" && (
                                <BookingManager
                                    bookings={state.bookings}
                                    onUpdateStatus={actions.updateBookingStatus}
                                />
                            )}

                            {tab === "lending" && (
                                <LendingDesk
                                    books={state.books}
                                    loans={state.loans}
                                    students={state.students}
                                    teachers={state.teachers}
                                    onBorrow={actions.borrowBook}
                                    onReturn={actions.returnBook}
                                />
                            )}

                            {tab === "visits" && (
                                <ClassVisitManager
                                    visits={state.visits}
                                    classes={state.classes}
                                    teachers={state.teachers}
                                    onStartVisit={actions.startClassVisit}
                                />
                            )}

                            {tab === "books" && (
                                <BookList
                                    books={state.books}
                                    onAdd={actions.addBook}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
