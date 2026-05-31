"use client";

import React from "react";
import { KPICard } from "@/components/ui/KPICard";
import Link from "next/link";
import {
    FlaskConical,
    Library,
    HeartPulse,
    GraduationCap,
    Calendar,
    ClipboardList
} from "lucide-react";

export default function EducationalAffairsPage() {
    const stats = {
        lessonPlans: 92,
        labUsage: 12,
        libraryVisitors: 45,
        healthVisits: 8,
    };

    return (
        <main className="min-h-screen text-[var(--text)] font-sans pb-20" dir="rtl">
            <div className="relative z-10 mx-auto max-w-7xl px-8 pt-16">
                <header className="mb-12 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-4 h-4 text-[var(--primary)]" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">School OS • Academic Division</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            وكيل الشؤون <span className="text-[var(--primary)]">التعليمية</span>
                        </h1>
                    </div>
                </header>

                {/* KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <KPICard
                        title="اكتمال الخطط الدراسية"
                        value={`%${stats.lessonPlans}`}
                        color="primary"
                        icon={ClipboardList}
                    />
                    <KPICard
                        title="حجوزات المختبر (أسبوعي)"
                        value={stats.labUsage}
                        color="accent"
                        icon={FlaskConical}
                    />
                    <KPICard
                        title="زوار المكتبة (اليوم)"
                        value={stats.libraryVisitors}
                        color="primary"
                        icon={Library}
                    />
                    <KPICard
                        title="الزيارات الصحية"
                        value={stats.healthVisits}
                        color="accent"
                        icon={HeartPulse}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content Hub */}
                    <section className="lg:col-span-8">
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xl font-bold">إدارة الوحدات التعليمية</h2>
                            <div className="h-[1px] flex-1 bg-current opacity-10"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ModuleLink
                                href="/classroom"
                                title="الكادر التعليمي"
                                desc="إدارة الصفوف، سجلات الحضور، والتحصيل الدراسي الشامل."
                                icon={<GraduationCap className="w-6 h-6" />}
                                color="primary"
                            />
                            <ModuleLink
                                href="/lrc"
                                title="أمين مصادر التعلم"
                                desc="إدارة المكتبة الذكية، عمليات الاستعارة، وجدولة القاعات."
                                icon={<Library className="w-6 h-6" />}
                                color="primary"
                            />
                            <ModuleLink
                                href="/science"
                                title="محضر المختبر"
                                desc="تجهيز التجارب العلمية، إدارة العهدة الجرد الدوري."
                                icon={<FlaskConical className="w-6 h-6" />}
                                color="accent"
                            />
                            <ModuleLink
                                href="/health"
                                title="الموجّه الصحي"
                                desc="سجلات العيادة الرقمية، المتابعة الصحية، والتوعية."
                                icon={<HeartPulse className="w-6 h-6" />}
                                color="accent"
                            />
                        </div>
                    </section>

                    {/* Operational Insights side */}
                    <aside className="lg:col-span-4 space-y-6">
                        <h2 className="text-xl font-bold mb-8">رؤى تشغيلية</h2>
                        <div className="glass-card p-6 border-r-4 border-r-[var(--primary)]">
                            <div className="flex items-center gap-3 mb-4">
                                <Calendar className="w-5 h-5 text-[var(--primary)]" />
                                <h3 className="font-bold">توزيع حصص الانتظار</h3>
                            </div>
                            <p className="text-xs opacity-60 leading-relaxed mb-4">
                                تم توزيع ٣ حصص انتظار اليوم بناءً على مؤشرات الغياب اللحظية.
                            </p>
                            <button className="text-[10px] font-bold text-[var(--primary)] hover:underline uppercase tracking-widest">عرض التفاصيل</button>
                        </div>

                        <div className="glass-card p-6 border-r-4 border-r-[var(--accent)]">
                            <div className="flex items-center gap-3 mb-4">
                                <ClipboardList className="w-5 h-5 text-[var(--accent)]" />
                                <h3 className="font-bold">الزيارات الإشرافية</h3>
                            </div>
                            <p className="text-xs opacity-60 leading-relaxed mb-4">
                                متبقي زيارتين لهذا الأسبوع لإكمال خطة الإشراف السداسية.
                            </p>
                            <div className="w-full bg-current/5 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[var(--accent)] h-full w-[60%] rounded-full"></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}

function ModuleLink({ href, title, desc, icon, color }: { href: string, title: string, desc: string, icon: React.ReactNode, color: 'primary' | 'accent' }) {
    return (
        <Link href={href}>
            <div className="glass-card p-8 group hover:translate-y-[-4px] transition-all cursor-pointer border-b-2 border-transparent hover:border-b-[var(--primary)]/50">
                <div className={`w-12 h-12 glass-panel rounded-xl flex items-center justify-center mb-6 text-[var(--${color})] group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-xs opacity-50 leading-relaxed italic">{desc}</p>
            </div>
        </Link>
    );
}
