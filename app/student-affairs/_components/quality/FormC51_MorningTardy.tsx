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
                <div className="flex justify-between items-center text-sm text-zinc-400 mb-4">
                    <span>التاريخ: {today.toLocaleDateString("ar-SA")}</span>
                    <span>اليوم: {new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(today)}</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-800">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-zinc-900/50 text-xs font-bold text-zinc-300">
                                <th className="p-3 border-b border-zinc-800">م</th>
                                <th className="p-3 border-b border-zinc-800 text-right">اسم الطالب</th>
                                <th className="p-3 border-b border-zinc-800">الفصل</th>
                                <th className="p-3 border-b border-zinc-800">وقت الحضور</th>
                                <th className="p-3 border-b border-zinc-800">مدة التأخر</th>
                                <th className="p-3 border-b border-zinc-800">الإجراء المتخذ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {tardyEvents.map((e, i) => (
                                <tr key={e.id} className="text-sm hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-zinc-500">{i + 1}</td>
                                    <td className="p-3 font-bold">{e.student?.name || "طالب"}</td>
                                    <td className="p-3 text-zinc-400">{"—"}</td>
                                    <td className="p-3 text-zinc-400 font-mono">
                                        {e.time_in ? new Date(`1970-01-01T${e.time_in}`).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' }) : "—"}
                                    </td>
                                    <td className="p-3 font-bold text-[hsl(var(--gold))]">
                                        {e.excuse_reason || "غير محدد"}
                                    </td>
                                    <td className="p-3 text-xs text-zinc-500">
                                        رصد تلقائي
                                    </td>
                                </tr>
                            ))}
                            {tardyEvents.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-zinc-600">
                                        لا يوجد متأخرون مرصودون لهذا اليوم
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-10">
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/10">
                        <p className="text-xs text-zinc-500 mb-8">وكيل شؤون الطلاب:</p>
                        <div className="h-px bg-zinc-800 w-1/2 mb-2" />
                        <p className="font-bold text-sm">أ/ {state.currentUserName || "................"}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/10 text-left">
                        <p className="text-xs text-zinc-500 mb-8">الختم الرسمي:</p>
                        <div className="w-24 h-24 border-2 border-dashed border-zinc-800 rounded-full mx-auto flex items-center justify-center text-[10px] text-zinc-700">
                            PLACE STAMP HERE
                        </div>
                    </div>
                </div>
            </div>
        </QualityFormWrapper>
    );
}
