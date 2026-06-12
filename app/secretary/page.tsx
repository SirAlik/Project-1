"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSecretary } from "./_hooks/useSecretary";
import { KPICard } from "@/components/ui/KPICard";
import { CorrespondenceTable } from "./_components/CorrespondenceTable";
import { LeaveRequestForm } from "./_components/LeaveRequestForm";
import {
    Mail,
    Users,
    Calendar,
    FileText,
    ShieldCheck,
    LayoutDashboard,
    Zap,
    Plus,
    ChevronRight,
    CalendarDays,
    ClipboardList,
} from "lucide-react";

type SecretaryTab = "dashboard" | "correspondence" | "staff" | "reports";

export default function SecretaryPage() {
    const { state, actions } = useSecretary();
    const [tab, setTab] = useState<SecretaryTab>("dashboard");

    return (
        <main className="min-h-screen text-foreground font-sans pb-20" dir="rtl">
            <div className="relative z-10 mx-auto max-w-7xl px-8 pt-16">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">سِدرة • Administrative Office</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            نظام السكرتارية <span className="text-primary">الذكي</span>
                        </h1>
                    </div>
                    <div className="px-5 py-2.5 glass-panel border border-primary/20 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_var(--primary)]"></div>
                        <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">متصل • {new Date().toLocaleDateString('ar-SA')}</span>
                    </div>
                </header>

                {/* KPI Strip — بيانات حقيقية فقط */}
                {state.stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <KPICard
                            title="وارد جديد"
                            value={state.stats.incomingPending}
                            icon={Mail}
                            color="destructive"
                        />
                        <KPICard
                            title="صادر (إجمالي)"
                            value={state.stats.outgoingTotal}
                            icon={FileText}
                            color="accent"
                        />
                        <KPICard
                            title="إجازات معلقة"
                            value={state.stats.activeLeaves}
                            icon={Calendar}
                            color="primary"
                        />
                        <KPICard
                            title="في إجازة اليوم"
                            value={state.stats.onLeaveToday}
                            icon={Users}
                            color="accent"
                        />
                    </div>
                )}

                {state.msg && (
                    <div className="mb-8 p-4 glass-panel border border-primary/20 text-primary text-xs font-bold rounded-2xl animate-in fade-in slide-in-from-top-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4" />
                            {state.msg}
                        </div>
                        <button onClick={() => actions.setMsg("")} className="opacity-40 hover:opacity-100 transition-opacity">إغلاق</button>
                    </div>
                )}

                {/* Navigation Hub */}
                <nav className="mb-10 p-1.5 glass-panel rounded-3xl flex gap-1 overflow-x-auto no-scrollbar">
                    {[
                        { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
                        { id: "correspondence", label: "الصادر والوارد", icon: Mail },
                        { id: "staff", label: "شؤون الموظفين", icon: Users },
                        { id: "reports", label: "التقارير", icon: FileText },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as SecretaryTab)}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${tab === t.id
                                ? "bg-card text-primary shadow-xl"
                                : "opacity-40 hover:opacity-100"
                                }`}
                        >
                            <t.icon className={`w-4 h-4 ${tab === t.id ? 'animate-pulse' : ''}`} />
                            {t.label}
                        </button>
                    ))}
                </nav>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {tab === "dashboard" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 glass-card p-12 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>
                                <div className="relative z-10 max-w-lg">
                                    <div className="w-20 h-20 glass-panel rounded-3xl mb-8 flex items-center justify-center mx-auto border-t">
                                        <LayoutDashboard className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-3xl font-bold mb-4">مركز القيادة الإداري</h3>
                                    <p className="opacity-60 text-sm leading-relaxed mb-10">
                                        تم دمج النماذج الرسمية في سير عملك اليومي. ابدأ بمعالجة البريد أو إدارة الإجازات، وسيقوم النظام بتجهيز المستندات المطلوبة آلياً وفق معايير الجودة.
                                    </p>
                                    <div className="flex gap-4 justify-center">
                                        <button onClick={() => setTab('correspondence')} className="px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">الصادر والوارد</button>
                                        <button onClick={() => setTab('staff')} className="px-8 py-3.5 glass-panel rounded-2xl text-xs font-bold uppercase tracking-widest border hover:bg-muted/5 transition-colors">شؤون الموظفين</button>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <h4 className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 px-2">
                                    <Zap className="w-3 h-3" /> التحديثات الذكية
                                </h4>
                                <div className="space-y-4">
                                    <aside className="glass-card p-6 border-r-4 border-r-primary">
                                        <div className="flex gap-4 items-start">
                                            <div className="p-3 glass-panel rounded-2xl"><Zap className="w-4 h-4 text-primary shadow-pulse" /></div>
                                            <div>
                                                <p className="text-sm font-bold">الأتمتة اللحظية</p>
                                                <p className="text-[10px] opacity-40 mt-1 leading-relaxed">توليد تلقائي لـ 14 نموذج QF حسب نشاطك اليومي المعتمد.</p>
                                            </div>
                                        </div>
                                    </aside>
                                    <aside className="glass-card p-6 border-r-4 border-r-accent">
                                        <div className="flex gap-4 items-start">
                                            <div className="p-3 glass-panel rounded-2xl"><ShieldCheck className="w-4 h-4 text-accent" /></div>
                                            <div>
                                                <p className="text-sm font-bold">تكامل البيانات</p>
                                                <p className="text-[10px] opacity-40 mt-1 leading-relaxed">جميع السجلات مرتبطة الآن بهوية الموظف الموحدة بنجاح.</p>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </div>

                            {/* روابط سريعة للأنظمة الفعلية */}
                            <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Link
                                    href="/secretary/staff-attendance"
                                    className="glass-card p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <CalendarDays className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">سجل الحضور</p>
                                        <p className="text-[11px] opacity-50 mt-0.5">تسجيل وإدارة حضور الموظفين — نظام متعدد المدارس</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-30 mr-auto rtl:rotate-180 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                </Link>

                                <Link
                                    href="/secretary/hr-tickets"
                                    className="glass-card p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <ClipboardList className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">تذاكر المساءلة</p>
                                        <p className="text-[11px] opacity-50 mt-0.5">إدارة مساءلات الحضور وإطلاق مسارات الموافقة</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-30 mr-auto rtl:rotate-180 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                </Link>

                                <Link
                                    href="/meetings"
                                    className="glass-card p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Calendar className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">الاجتماعات</p>
                                        <p className="text-[11px] opacity-50 mt-0.5">جدولة الاجتماعات وإعداد المحاضر الرسمية</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 opacity-30 mr-auto rtl:rotate-180 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {tab === "correspondence" && (
                        <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
                            <CorrespondenceTable
                                letters={state.letters}
                                onAdd={actions.addLetter}
                                onUpdateStatus={actions.updateLetterStatus}
                                onDelete={actions.deleteLetter}
                            />
                        </div>
                    )}

                    {tab === "staff" && (
                        <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
                            <LeaveRequestForm
                                leaves={state.leaves}
                                onAdd={actions.addLeave}
                                onUpdateStatus={actions.updateLeaveStatus}
                            />
                        </div>
                    )}

                    {tab === "reports" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-700">
                            <article className="glass-card p-10 flex flex-col justify-center items-center text-center group border-b-4 border-b-primary/50 hover:border-b-primary">
                                <div className="w-16 h-16 glass-panel rounded-3xl mb-8 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText className="w-8 h-8 text-primary" />
                                </div>
                                <h4 className="font-bold text-xl mb-3">مركز النماذج الوزارية</h4>
                                <p className="opacity-40 text-[10px] font-black uppercase tracking-widest mb-10">14 نموذج QF مخصص معتمد</p>
                                <button className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/10">تصفح النماذج</button>
                            </article>

                            <article className="glass-panel p-10 border border-current/5 border-dashed flex flex-col items-center justify-center text-center opacity-40 group hover:opacity-100 transition-opacity rounded-[2.5rem]">
                                <Plus className="w-10 h-10 mb-4 group-hover:rotate-90 transition-transform" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic">جاري أتمتة المزيد...</p>
                            </article>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
