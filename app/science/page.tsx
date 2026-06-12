"use client";

import React, { useState } from "react";
import { useScience } from "./_hooks/useScience";
import { InventoryList } from "./_components/InventoryList";
import { BookingList } from "./_components/BookingList";
import { RequestModal } from "./_components/RequestModal";
import {
    Beaker,
    TestTube2,
    Calendar,
    Box,
    ShieldCheck,
    Info,
    ChevronLeft
} from "lucide-react";

export default function SciencePage() {
    const { state, actions } = useScience();
    const [tab, setTab] = useState<"inventory" | "bookings">("bookings");
    const [showModal, setShowModal] = useState(false);

    return (
        <main className="min-h-screen text-[var(--text)] font-sans pb-20" dir="rtl">
            <div className="relative z-10 mx-auto max-w-7xl px-8 pt-16">
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                                <Beaker className="w-4 h-4 text-cyan-500" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">سِدرة • Science Laboratory</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            المختبر <span className="text-cyan-500">العلمي</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <nav className="flex p-1.5 glass-panel rounded-3xl overflow-hidden border">
                            {([
                                { id: "bookings", label: "سجل الحجوزات", icon: <Calendar className="w-4 h-4" /> },
                                { id: "inventory", label: "المخزون والأدوات", icon: <Box className="w-4 h-4" /> },
                            ] as { id: "bookings" | "inventory"; label: string; icon: React.ReactNode }[]).map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${tab === t.id
                                        ? "bg-white text-cyan-500 shadow-xl"
                                        : "opacity-40 hover:opacity-100"
                                        }`}
                                >
                                    <span className={tab === t.id ? 'animate-pulse' : ''}>{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </nav>

                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-2xl text-xs font-bold shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2"
                        >
                            حجز جديد <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {state.msg && (
                    <div className="mb-8 p-4 glass-panel border border-cyan-500/20 text-cyan-500 text-xs font-bold rounded-2xl animate-in fade-in slide-in-from-top-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 shadow-pulse" />
                            {state.msg}
                        </div>
                        <button onClick={() => actions.setMsg("")} className="opacity-40 hover:opacity-100 transition-opacity">إغلاق</button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {tab === "bookings" && (
                        <div className="grid gap-8 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
                                    <div className="p-8">
                                        <h3 className="text-xl font-bold mb-8">الحجوزات القادمة</h3>
                                        <BookingList bookings={state.bookings} />
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-4 space-y-8">
                                <div className="glass-card p-8">
                                    <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest mb-6">إحصائيات سريعة</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-6 rounded-2xl glass-panel border border-stone-200 text-center flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-full bg-[hsla(var(--gold),.15)] flex items-center justify-center mb-4">
                                                <TestTube2 className="w-5 h-5 text-[hsl(var(--gold))]" />
                                            </div>
                                            <div className="text-3xl font-bold">{state.bookings.filter(b => b.status === 'pending').length}</div>
                                            <div className="text-[10px] uppercase font-bold opacity-40 tracking-widest">قيد الانتظار</div>
                                        </div>
                                        <div className="p-6 rounded-2xl glass-panel border border-stone-200 text-center flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div className="text-3xl font-bold">{state.bookings.filter(b => b.status === 'approved').length}</div>
                                            <div className="text-[10px] uppercase font-bold opacity-40 tracking-widest">مؤكد</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2rem] glass-card border-t-4 border-t-cyan-500 shadow-pulse">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Info className="w-5 h-5 text-cyan-500" />
                                        <h3 className="font-bold">تعليمات المختبر</h3>
                                    </div>
                                    <ul className="text-sm opacity-60 space-y-3">
                                        <li className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                            يجب الحجز قبل ٢٤ ساعة على الأقل.
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                            تأكد من توفر المواد الكيميائية المطلوبة.
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                            اتبع إجراءات السلامة دائماً.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === "inventory" && (
                        <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
                            <div className="p-10">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-bold">المخزون والأدوات</h3>
                                    <div className="relative group max-w-sm w-full">
                                        <input
                                            placeholder="بحث في المخزون..."
                                            className="w-full bg-white/5 border border-stone-200 rounded-2xl px-6 py-3.5 text-sm outline-none focus:border-cyan-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <InventoryList items={state.inventory} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <RequestModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={actions.requestBooking}
                experiments={state.experiments}
            />
        </main>
    );
}
