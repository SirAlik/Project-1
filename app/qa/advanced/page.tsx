"use client";

import React, { useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { useQA } from "../_hooks/useQA";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default function AdvancedAnalyticsPage() {
    useQA();

    const [forecastData, setForecastData] = useState<number[]>([]);
    const [scatterData, setScatterData] = useState<{ x: number, y: number }[]>([]);

    useEffect(() => {
        startTransition(() => {
            setForecastData(Array.from({ length: 7 }).map((_, i) => 85 + Math.sin(i) * 10));
            setScatterData(Array.from({ length: 20 }).map(() => ({
                x: Math.random() * 90,
                y: Math.random() * 90
            })));
        });
    }, []);

    return (
        <main className="min-h-screen bg-black text-zinc-100 font-sans" dir="rtl">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-full h-[300px] bg-indigo-900/10 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
                <header className="mb-8 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/qa" className="text-zinc-500 hover:text-white transition">← عودة</Link>
                        <Pill>Confidential</Pill>
                    </div>
                    <h1 className="text-3xl font-bold text-white">
                        Advanced Analytics (الإحصائيات المتقدمة)
                    </h1>
                    <p className="mt-2 text-zinc-500">
                        تحليل الاتجاهات طويلة المدى والعلاقات المتبادلة بين المؤشرات (Read-Only)
                    </p>
                </header>

                <div className="space-y-8 pb-12">
                    {/* Section 1: Forecasting Trend */}
                    <section>
                        <h2 className="text-xl font-bold text-indigo-400 mb-4 flex justify-between items-center">
                            1. التنبؤ بالحضور (7-Day Forecast)
                            <span className="text-xs font-normal text-zinc-500">خوارزمية تنبؤية تعتمد على الاتجاهات السابقة</span>
                        </h2>
                        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 h-[300px] relative overflow-hidden">
                            <div className="absolute inset-x-6 top-1/2 border-t border-white/5 border-dashed"></div>
                            <div className="h-full flex items-end gap-2 relative z-10">
                                {forecastData.map((val, i) => {
                                    return (
                                        <div key={i} className="flex-1 flex flex-col justify-end group">
                                            <div className="w-full bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-all rounded-t-lg border-t-2 border-indigo-400 border-dashed" style={{ height: `${val}%` }} />
                                            <div className="text-[10px] text-center text-zinc-500 mt-2">{['أحد', 'ثنين', 'ثلث', 'ربع', 'خميس', 'سبت', 'أحد'][i]}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Correlation Analysis */}
                    <section className="grid lg:grid-cols-2 gap-6">
                        <Card title="2. العلاقة: التأخر الصباحي vs السلوك" className="bg-zinc-950/50">
                            <div className="h-[250px] relative border-l border-b border-white/10 m-6">
                                {/* Heatmap Scatter Plot */}
                                {scatterData.map((pt, i) => (
                                    <div key={i} className="absolute w-3 h-3 bg-[hsla(var(--gold),.40)] rounded-full blur-[2px]"
                                        style={{ left: `${pt.x}%`, bottom: `${pt.y}%` }}
                                    />
                                ))}
                                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--gold))] to-transparent rotate-[-30deg]"></div>
                                </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 px-4 pb-4">
                                تشير البيانات إلى وجود معامل ارتباط (r=0.68) بين التأخر الدراسي وتكرار المخالفات السلوكية.
                            </p>
                        </Card>

                        <Card title="3. جودة ومنطقية البيانات (Data Quality)" className="bg-zinc-950/50">
                            <div className="space-y-4 p-4">
                                <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <div>
                                        <p className="text-sm font-bold">بلاك بوكس الطلاب</p>
                                        <p className="text-[10px] text-zinc-500 text-right">لا توجد ثغرات زمنية</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs">99%</div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-[hsla(var(--gold),.05)] border border-[hsla(var(--gold),.10)]">
                                    <div>
                                        <p className="text-sm font-bold">انتظام التحصيل</p>
                                        <p className="text-[10px] text-zinc-500 text-right">اكتشاف فجوة في بيانات الصف الخامس</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[hsla(var(--gold),.20)] flex items-center justify-center text-[hsl(var(--gold))] text-xs text-center">82%</div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <div>
                                        <p className="text-sm font-bold">دقة التوقيت</p>
                                        <p className="text-[10px] text-zinc-500 text-right">طوابع زمنية متداخلة مكتشفة</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-500 text-xs">94%</div>
                                </div>
                            </div>
                        </Card>
                    </section>

                    {/* Section 3: Risk Scoring Logic */}
                    <Card title="4. معايير مؤشر الخطورة (EWS Weight Distribution)" className="bg-zinc-950/50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                            {[
                                { label: "الغياب", val: "40%", desc: "تأثير مرتفع جداً" },
                                { label: "السلوك", val: "30%", desc: "تكرار المخالفات" },
                                { label: "التحصيل", val: "20%", desc: "التراجع المفاجئ" },
                                { label: "الاستئذان", val: "10%", desc: "كثرة الخروج" },
                            ].map((w, i) => (
                                <div key={i} className="p-4 rounded-2xl border border-white/5 bg-zinc-900/20 text-center">
                                    <p className="text-2xl font-black text-indigo-400">{w.val}</p>
                                    <p className="text-sm font-bold mt-1">{w.label}</p>
                                    <p className="text-[10px] text-zinc-600 mt-1">{w.desc}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
}
