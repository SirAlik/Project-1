"use client";

import React, { useState, useEffect, startTransition } from "react";
import { X, User, Zap, Home } from 'lucide-react';
import type { HealthVisit } from "@/lib/types/health";

interface VisitInput {
    student_id: string;
    student_name: string;
    class_id: string | null;
    complaint: string;
    visit_reason: string;
    action_taken: string;
    date: string;
    status: "completed" | "referred";
}

interface LogVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: { id: string; name: string } | null;
    className?: string;
    classId: string | null;
    onSubmit: (visit: VisitInput) => Promise<HealthVisit | null>;
}

export function LogVisitModal({ isOpen, onClose, student, className, classId, onSubmit }: LogVisitModalProps) {
    const [complaint, setComplaint] = useState("");
    const [actionTaken, setActionTaken] = useState("");
    const [visitReason, setVisitReason] = useState("صداع");
    const [loading, setLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState("");

    useEffect(() => {
        startTransition(() => {
            setCurrentTime(new Date().toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' }));
        });
    }, [isOpen]);

    if (!student) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit({
            student_id: student.id,
            student_name: student.name,
            class_id: classId,
            complaint,
            action_taken: actionTaken,
            visit_reason: visitReason,
            date: new Date().toISOString().split('T')[0],
            status: actionTaken.includes("تحويل") ? "referred" : "completed"
        });
        setLoading(false);
        onClose();
        setComplaint("");
        setActionTaken("");
    };

    const quickActions = [
        { label: "إصابة رياضية", reason: "إصابة رياضية", action: "تنظيف وتعقيم الجرح وتغطية بضمادة رطبة" },
        { label: "صداع مستمر", reason: "صداع", action: "راحة في العيادة وتطبيق كمادات باردة وتنبيه الأهل" },
        { label: "آلام بطن", reason: "ألم بطن", action: "راحة تامة وتوصية بمراجعة الطبيب وتتبع الحالة" },
        { label: "توعية صحية", reason: "فحص نظافة", action: "توجيه الطالب لأهمية النظافة الشخصية والقص الدوري" },
        { label: "تعب عام", reason: "إرهاق", action: "قياس العلامات الحيوية البسيطة والراحة والتهوية" },
        { label: "تحويل طارئ", reason: "أخرى", action: "تحويل فوري للمستشفى/المركز الصحي والتنسيق مع الإدارة" }
    ];

    const applyQuickAction = (action: typeof quickActions[0]) => {
        setVisitReason(action.reason);
        setActionTaken(action.action);
        setComplaint(action.label);
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? "visible" : "invisible"}`}>
            <div className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={onClose} />

            <div className={`relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out ${isOpen ? "scale-100 translate-y-0 opacity-100" : "scale-90 translate-y-12 opacity-0"}`}>

                {/* Modal Header */}
                <div className="p-8 border-b border-zinc-800/50 bg-gradient-to-l from-zinc-900/50 to-transparent flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 font-bold uppercase tracking-widest">نموذج فحص</span>
                            <span className="text-zinc-600 text-[10px]">•</span>
                            <span className="text-zinc-500 text-[10px] font-mono">{currentTime}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white italic tracking-tight">توثيق مراجعة طبية</h2>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                                <User className="w-3 h-3" />
                                <span>{student.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                                <Home className="w-3 h-3 text-emerald-500/50" />
                                <span>{className || "الفصل المختار"}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors" aria-label="إغلاق النافذة">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>

                <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Quick Actions Grid */}
                    <div className="mb-8">
                        <label className="block text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-4">اختصارات ذكية • Smart Actions</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {quickActions.map((qa) => (
                                <button
                                    key={qa.label}
                                    type="button"
                                    onClick={() => applyQuickAction(qa)}
                                    className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-zinc-800 group-hover:bg-emerald-500/20 transition-colors">
                                            <Zap className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400" />
                                        </div>
                                        <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">{qa.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">سبب الزيارة</label>
                                <select
                                    value={visitReason}
                                    onChange={(e) => setVisitReason(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-100 focus:ring-2 ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                                    title="سبب الزيارة"
                                >
                                    <option value="صداع">صداع</option>
                                    <option value="ألم بطن">ألم بطن</option>
                                    <option value="إصابة">إصابة رياضية</option>
                                    <option value="إرهاق">إرهاق / تعب</option>
                                    <option value="فحص نظافة">فحص نظافة</option>
                                    <option value="ارتفاع حرارة">ارتفاع حرارة</option>
                                    <option value="أخرى">أخرى</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">الشكوى الظاهرة</label>
                                <input
                                    type="text"
                                    value={complaint}
                                    onChange={(e) => setComplaint(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-pink-500/50 transition-colors"
                                    aria-label="اختر الفصل"
                                    placeholder="وصف الطالب للمشكلة..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">الإجراء المتخذ والتوصيات</label>
                            <textarea
                                value={actionTaken}
                                onChange={(e) => setActionTaken(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-4 text-sm text-zinc-100 h-32 resize-none outline-none focus:border-zinc-700 transition-colors"
                                placeholder="صف الإجراءات التي قمت بها بالتفصيل..."
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 rounded-3xl bg-zinc-100 text-black font-black text-sm hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-xl shadow-white/5 flex items-center justify-center gap-2 group"
                            >
                                {loading ? "جاري الحفظ..." : (
                                    <>
                                        <span>تأكيد وحفظ السجل</span>
                                        <div className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-[-4px] transition-transform">
                                            <ChevronDown className="w-3 h-3 rotate-90" />
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}

