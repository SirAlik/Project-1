"use client";

import React, { useState } from "react";
import { ClipboardCheck, Utensils, History, Sparkles } from "lucide-react";
import type { HygieneLog, CanteenCheck } from "@/lib/types/health";

interface ClassItem { id: string; name: string }
type HygieneFormInput = Pick<HygieneLog, "class_id" | "check_date" | "notes">;
type CanteenFormInput = Pick<CanteenCheck, "check_date"> & { cleanliness_score: number; food_variety_score: number; notes: string | null };

interface ComplianceManagerProps {
    hygieneLogs: HygieneLog[];
    canteenChecks: CanteenCheck[];
    classes: ClassItem[];
    onAddHygiene: (log: HygieneFormInput) => void;
    onAddCanteen: (check: CanteenFormInput) => void;
}

export function ComplianceManager({ hygieneLogs, canteenChecks, classes, onAddHygiene, onAddCanteen }: ComplianceManagerProps) {
    const [activeTab, setActiveTab] = useState<"hygiene" | "canteen" | "history">("hygiene");

    // Hygiene Form State
    const [hygieneForm, setHygieneForm] = useState({
        class_id: "",
        check_date: new Date().toISOString().split('T')[0],
        notes: ""
    });

    // Canteen Form State
    const [canteenForm, setCanteenForm] = useState({
        check_date: new Date().toISOString().split('T')[0],
        cleanliness_score: 5,
        food_variety_score: 5,
        notes: ""
    });

    const handleHygieneSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hygieneForm.class_id) return;
        onAddHygiene(hygieneForm);
        setHygieneForm({ ...hygieneForm, class_id: "", notes: "" });
    };

    const handleCanteenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddCanteen(canteenForm);
        setCanteenForm({ ...canteenForm, notes: "" });
    };

    return (
        <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="flex gap-2 p-1 bg-white rounded-2xl border border-stone-200 self-start">
                {[
                    { id: "hygiene", label: "فحص النظافة", icon: ClipboardCheck },
                    { id: "canteen", label: "فحص المقصف", icon: Utensils },
                    { id: "history", label: "السجل", icon: History },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as "hygiene" | "canteen" | "history")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? "bg-emerald-500/20 text-emerald-400 shadow-inner" : "text-stone-500 hover:text-stone-600"
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "hygiene" && (
                <form onSubmit={handleHygieneSubmit} className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 mr-2">الصف الدراسي</label>
                            <select
                                className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                                value={hygieneForm.class_id}
                                onChange={(e) => setHygieneForm({ ...hygieneForm, class_id: e.target.value })}
                                aria-label="اختر الصف الدراسي"
                            >
                                <option value="">اختر الصف...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 mr-2">تاريخ الفحص</label>
                            <input
                                type="date"
                                className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                                value={hygieneForm.check_date}
                                onChange={(e) => setHygieneForm({ ...hygieneForm, check_date: e.target.value })}
                                aria-label="تاريخ فحص النظافة"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 mr-2">الملاحظات (أطوال الشعر، الأظافر، الزي)</label>
                        <textarea
                            className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none min-h-[100px]"
                            placeholder="اكتب الملاحظات التفصيلية هنا..."
                            value={hygieneForm.notes}
                            onChange={(e) => setHygieneForm({ ...hygieneForm, notes: e.target.value })}
                            aria-label="ملاحظات فحص النظافة"
                        />
                    </div>
                    <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all">
                        حفظ تقرير النظافة
                    </button>
                </form>
            )}

            {activeTab === "canteen" && (
                <form onSubmit={handleCanteenSubmit} className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-stone-500 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--gold))]" /> مستوى النظافة والتعقيم (1-5)
                            </label>
                            <input
                                type="range" min="1" max="5" step="1"
                                className="w-full accent-emerald-500"
                                value={canteenForm.cleanliness_score}
                                onChange={(e) => setCanteenForm({ ...canteenForm, cleanliness_score: parseInt(e.target.value) })}
                                aria-label="مستوى النظافة والتعقيم"
                            />
                            <div className="flex justify-between text-[10px] text-stone-500 font-bold px-1">
                                <span>ضعيف</span>
                                <span>ممتاز</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-stone-500 flex items-center gap-2">
                                <Utensils className="w-3.5 h-3.5 text-blue-500" /> توافر الأصناف الصحية (1-5)
                            </label>
                            <input
                                type="range" min="1" max="5" step="1"
                                className="w-full accent-emerald-500"
                                value={canteenForm.food_variety_score}
                                onChange={(e) => setCanteenForm({ ...canteenForm, food_variety_score: parseInt(e.target.value) })}
                                aria-label="توافر الأصناف الصحية"
                            />
                            <div className="flex justify-between text-[10px] text-stone-500 font-bold px-1">
                                <span>ضعيف</span>
                                <span>ممتاز</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 mr-2">ملاحظات إضافية (جودة الطعام، التخزين)</label>
                        <textarea
                            className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none min-h-[100px]"
                            placeholder="اكتب ملاحظات فحص المقصف..."
                            value={canteenForm.notes}
                            onChange={(e) => setCanteenForm({ ...canteenForm, notes: e.target.value })}
                            aria-label="ملاحظات فحص المقصف"
                        />
                    </div>
                    <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all">
                        حفظ تقرير المقصف
                    </button>
                </form>
            )}

            {activeTab === "history" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <h4 className="text-sm font-bold text-stone-500">آخر التقارير المسجلة</h4>
                    <div className="space-y-2">
                        {([...hygieneLogs, ...canteenChecks] as (HygieneLog | CanteenCheck)[])
                            .sort((a, b) => new Date(b.created_at || b.check_date).getTime() - new Date(a.created_at || a.check_date).getTime())
                            .slice(0, 10)
                            .map((log, i) => {
                                const isHygiene = "class_id" in log;
                                return (
                                    <div key={i} className="p-3 rounded-xl bg-white/80 border border-stone-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isHygiene ? "bg-emerald-500/10 text-emerald-500" : "bg-[hsla(var(--gold),.10)] text-[hsl(var(--gold))]"}`}>
                                                {isHygiene ? <ClipboardCheck className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-700">
                                                    {isHygiene
                                                        ? `فحص نظافة: ${classes.find(c => c.id === (log as HygieneLog).class_id)?.name || "صف غير معروف"}`
                                                        : "فحص المقصف المدرسي"}
                                                </p>
                                                <p className="text-[10px] text-stone-500">{log.check_date}</p>
                                            </div>
                                        </div>
                                        {!isHygiene && (
                                            <div className="flex gap-1">
                                                <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded-full text-stone-500">نظافة {(log as CanteenCheck).hygiene_score}/5</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
}
