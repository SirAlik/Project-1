"use client";

import React, { useEffect, useState, startTransition } from "react";
import { QualityFormWrapper } from "./QualityFormWrapper";
import { EventRow } from "@/lib/types/student-affairs";
import { CaseRow } from "@/lib/types/counselor";
import { supabase } from "@/lib/db/supabase";
import { User, ShieldAlert, Heart, FileText, Loader2 } from "lucide-react";

interface StudentProfileData {
    id: string;
    name: string;
    class_id?: string | null;
    health_history?: { vision?: boolean; diabetes?: boolean } | null;
}

interface Props {
    studentsList: { id: string; name: string }[];
    classesList: { id: string; name: string }[];
    cases: CaseRow[];
    user?: unknown;
}

export function Form22_ComprehensiveProfile({ studentsList, classesList }: Props) {
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [studentData, setStudentData] = useState<StudentProfileData | null>(null);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(false);

    const loadStudentDetails = async (id: string) => {
        setLoading(true);
        try {
            // Fetch student profile including health/social data
            const { data: st, error: stErr } = await supabase
                .from("student_profiles")
                .select("*")
                .eq("id", id)
                .single();

            if (stErr) throw stErr;
            setStudentData(st);

            // Fetch history
            const { data: evs } = await supabase
                .from("events")
                .select("*")
                .eq("student_id", id)
                .order("created_at", { ascending: false })
                .limit(20);

            setEvents(evs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStudentId) {
            startTransition(async () => { await loadStudentDetails(selectedStudentId); });
        }
    }, [selectedStudentId]);

    const className = classesList.find(c => c.id === studentData?.class_id)?.name || "—";

    return (
        <QualityFormWrapper
            id="form-22-print"
            title="دراسة حالة شاملة / ملف الطالب"
            code="QF-71-C-2-2"
            fileName={`ملف_الطالب_الشامل_${studentData?.name || "عام"}`}
        >
            <div className="space-y-8">
                {/* Selection */}
                <div className="flex gap-4 items-end bg-stone-100/10 p-4 rounded-2xl border border-stone-200 print:hidden">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-stone-500 mr-2">اختر الطالب للمعاينة</label>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full bg-white/80 border border-stone-200 rounded-xl px-4 py-3 text-foreground outline-none focus:border-indigo-500 transition-colors appearance-none"
                            aria-label="اختر الطالب"
                        >
                            <option value="">— اختر الطالب —</option>
                            {studentsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                        <p className="text-stone-500">جاري جلب البيانات من السحاب...</p>
                    </div>
                ) : studentData ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Header Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/80 p-6 rounded-3xl border border-stone-200">
                                <User className="w-6 h-6 text-purple-400 mb-3" />
                                <h3 className="text-sm font-bold text-stone-500">اسم الطالب</h3>
                                <p className="text-lg font-bold text-foreground">{studentData.name}</p>
                                <p className="text-xs text-stone-500 mt-1">الفصل: {className}</p>
                            </div>
                            <div className="bg-white/80 p-6 rounded-3xl border border-stone-200">
                                <Heart className="w-6 h-6 text-rose-400 mb-3" />
                                <h3 className="text-sm font-bold text-stone-500">الحالة الصحية</h3>
                                <div className="space-y-1 mt-2">
                                    {studentData.health_history?.vision && <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 mr-1">ضعف نظر</span>}
                                    {studentData.health_history?.diabetes && <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 mr-1">سكري</span>}
                                    {!studentData.health_history && <p className="text-xs text-stone-500">لا توجد تنبيهات صحية مسجلة</p>}
                                </div>
                            </div>
                            <div className="bg-white/80 p-6 rounded-3xl border border-stone-200">
                                <ShieldAlert className="w-6 h-6 text-[hsla(var(--gold),.90)] mb-3" />
                                <h3 className="text-sm font-bold text-stone-500">سجل الانضباط</h3>
                                <p className="text-lg font-bold text-foreground">{events.filter(e => e.type === 'مخالفة').length} مخالفة</p>
                                <p className="text-xs text-stone-500 mt-1">إجمالي الغياب: {events.filter(e => e.type === 'غياب').length} أيام</p>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-stone-500" /> آخر السجلات (Real-time)
                            </h3>
                            <div className="overflow-hidden border border-stone-200 rounded-2xl">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-stone-100 text-stone-500 text-xs">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">التاريخ</th>
                                            <th className="px-6 py-4 font-bold">النوع</th>
                                            <th className="px-6 py-4 font-bold">الملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900">
                                        {events.map((ev) => (
                                            <tr key={ev.id} className="hover:bg-white/80 transition-colors">
                                                <td className="px-6 py-4 text-stone-600">{ev.event_date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${ev.type === 'غياب' ? 'bg-stone-200 text-stone-500' :
                                                        ev.type === 'تأخر' ? 'bg-[hsla(var(--gold),.10)] text-[hsl(var(--gold))]' :
                                                            'bg-rose-500/10 text-rose-500'
                                                        }`}>
                                                        {ev.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-stone-500">{ev.note || '—'}</td>
                                            </tr>
                                        ))}
                                        {events.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-10 text-center text-stone-500 italic">لا يوجد سجلات لهذا الطالب.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-stone-100/10 rounded-3xl border border-dashed border-stone-200">
                        <p className="text-stone-500">اختر طالباً من القائمة لعرض ملفه الشامل.</p>
                    </div>
                )}
            </div>
        </QualityFormWrapper>
    );
}
