"use client";

import React from "react";
import { QualityFormWrapper } from "@/app/counselor/_components/QualityFormWrapper";
import { useStudentAffairs } from "../../_hooks/useStudentAffairs";

export function FormC51_MorningTardy() {
    const { state } = useStudentAffairs();

    // Filter events for "late" today using attendance
    const tardyEvents = state.attendance.filter(a => a.status === 'late');
    const today = new Date();

    return (
        <QualityFormWrapper
            id="form-c-5-1"
            title="سجل التأخر الصباحي"
            code="QF71-C-5-1"
            fileName="record_morning_tardy"
        >
            <div className="space-y-6" dir="rtl">
                <div className="flex justify-between items-center text-sm text-stone-500 mb-4">
                    <span>التاريخ: {today.toLocaleDateString("ar-SA")}</span>
                    <span>اليوم: {new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(today)}</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-stone-200">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-white/80 text-xs font-bold text-stone-600">
                                <th className="p-3 border-b border-stone-200">م</th>
                                <th className="p-3 border-b border-stone-200 text-right">اسم الطالب</th>
                                <th className="p-3 border-b border-stone-200">الفصل</th>
                                <th className="p-3 border-b border-stone-200">وقت الحضور</th>
                                <th className="p-3 border-b border-stone-200">مدة التأخر</th>
                                <th className="p-3 border-b border-stone-200">الإجراء المتخذ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {tardyEvents.map((e, i) => (
                                <tr key={e.id} className="text-sm hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-stone-500">{i + 1}</td>
                                    <td className="p-3 font-bold">{e.student?.name || "طالب"}</td>
                                    <td className="p-3 text-stone-500">{"—"}</td>
                                    <td className="p-3 text-stone-500 font-mono">
                                        {e.time_in ? new Date(`1970-01-01T${e.time_in}`).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' }) : "—"}
                                    </td>
                                    <td className="p-3 font-bold text-[hsl(var(--accent-primary))]">
                                        {e.excuse_reason || "غير محدد"}
                                    </td>
                                    <td className="p-3 text-xs text-stone-500">
                                        رصد تلقائي
                                    </td>
                                </tr>
                            ))}
                            {tardyEvents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-stone-500">
                                        لا يوجد متأخرون مرصودون لهذا اليوم
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-10">
                    <div className="p-4 rounded-xl border border-stone-200 bg-stone-100/10">
                        <p className="text-xs text-stone-500 mb-8">وكيل شؤون الطلاب:</p>
                        <div className="h-px bg-stone-200 w-1/2 mb-2" />
                        <p className="font-bold text-sm">أ/ {state.currentUserName || "................"}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-stone-200 bg-stone-100/10 text-left">
                        <p className="text-xs text-stone-500 mb-8">الختم الرسمي:</p>
                        <div className="w-24 h-24 border-2 border-dashed border-stone-200 rounded-full mx-auto flex items-center justify-center text-[10px] text-zinc-700">
                            PLACE STAMP HERE
                        </div>
                    </div>
                </div>
            </div>
        </QualityFormWrapper>
    );
}
