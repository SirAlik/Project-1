"use client";

import React, { useEffect, useState, useCallback, startTransition } from "react";
import { QualityFormWrapper } from "@/app/counselor/_components/QualityFormWrapper";
import { useStudentAffairs } from "../../_hooks/useStudentAffairs";
import { supabase } from "@/lib/db/supabase";

export function FormC53_CounselorReferral() {
    useStudentAffairs();
    type ReferralRow = { id: string; count: number; name: string; class: string };
    const [referrals, setReferrals] = useState<ReferralRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMonthlyReferrals = useCallback(async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from("attendance_scans")
            .select("student_id, students(name, class_id, classes(name))")
            .gte("scan_time", startOfMonth.toISOString());

        if (!error && data) {
            type ScanRow = { student_id: string; students: { name: string; classes: { name: string } | null } | null };
            const counts: Record<string, { count: number; name: string; class: string }> = {};
            (data as unknown as ScanRow[]).forEach((s) => {
                const id = s.student_id;
                if (!counts[id]) {
                    counts[id] = {
                        count: 0,
                        name: s.students?.name ?? "",
                        class: s.students?.classes?.name ?? ""
                    };
                }
                counts[id].count++;
            });

            const filtered = Object.entries(counts)
                .filter(([, val]) => val.count >= 3)
                .map(([id, val]) => ({ id, ...val }));

            setReferrals(filtered);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        startTransition(async () => { await loadMonthlyReferrals(); });
    }, [loadMonthlyReferrals]);

    return (
        <QualityFormWrapper
            id="form-c-5-3"
            title="نموذج تحويل للموجه الطلابي (تكرار التأخر)"
            code="QF71-C-5-3"
            fileName="counselor_referral_tardy"
        >
            <div className="space-y-6" dir="rtl">
                <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl mb-6">
                    <p className="text-sm text-rose-200">
                        🚨 يتم إدراج الطلاب في هذا النموذج تلقائياً عند تجاوز عدد مرات التأخر 3 مرات خلال الشهر الحالي.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-800">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-zinc-900/50 text-xs font-bold text-zinc-300">
                                <th className="p-3 border-b border-zinc-800">اسم الطالب</th>
                                <th className="p-3 border-b border-zinc-800">الفصل</th>
                                <th className="p-3 border-b border-zinc-800 text-center">مرات التأخر (هذا الشهر)</th>
                                <th className="p-3 border-b border-zinc-800">توصية الوكيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {referrals.map((r) => (
                                <tr key={r.id} className="text-sm hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold">{r.name}</td>
                                    <td className="p-3 text-zinc-400">{r.class}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-bold">
                                            {r.count} مرات
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-zinc-500 italic">
                                        توجيه الطالب للموجه الطلابي لدراسة حالة &quot;تكرار التأخر الصباحي&quot;
                                    </td>
                                </tr>
                            ))}
                            {referrals.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center text-zinc-600">
                                        لا يوجد طلاب تجاوزوا الحد المسموح للتأخر حالياً
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
                        <p className="font-bold text-sm">تحويل إلكتروني معتمد</p>
                    </div>
                </div>
            </div>
        </QualityFormWrapper>
    );
}
