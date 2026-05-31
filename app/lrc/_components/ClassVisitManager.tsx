import React, { useState } from "react";
import { VisitRow } from "@/lib/types/lrc";
import { Card } from "@/components/ui/Card";

interface Props {
    visits: VisitRow[];
    classes: { id: string; name: string }[];
    teachers: { id: string; name: string }[];
    onStartVisit: (cid: string, tid: string, period: number, topic: string) => void;
}

export function ClassVisitManager({ visits, classes, teachers, onStartVisit }: Props) {
    const [classId, setClassId] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [period, setPeriod] = useState(1);
    const [topic, setTopic] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onStartVisit(classId, teacherId, period, topic);
        setTopic("");
    }

    return (
        <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
                <Card title="تسجيل زيارة فصل" className="border-blue-500/20">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-400">الفصل</label>
                            <select required value={classId} onChange={e => setClassId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" aria-label="اختر الفصل">
                                <option value="">اختر الفصل...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400">المعلم المرافق</label>
                            <select required value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" aria-label="اختر المعلم المرافق">
                                <option value="">اختر المعلم...</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400">الحصة</label>
                            <select value={period} onChange={e => setPeriod(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" aria-label="اختر الحصة">
                                {[1, 2, 3, 4, 5, 6, 7].map(p => <option key={p} value={p}>الحصة {p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400">موضوع الزيارة</label>
                            <input required value={topic} onChange={e => setTopic(e.target.value)} placeholder="مثال: بحث عن تاريخ المملكة" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" />
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-sm font-bold shadow-lg transition active:scale-95">
                            بدء الزيارة وتسجيل الحضور الآلي
                        </button>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-8">
                <Card title="سجل الزيارات اليومي">
                    <div className="space-y-3">
                        <select
                            className="bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-sm focus:border-cyan-500/50 outline-none appearance-none"
                            aria-label="تصفية حسب الحالة"
                        >
                            <option>الكل</option>
                            <option>جارية</option>
                            <option>مكتملة</option>
                        </select>
                        {visits.length === 0 && <div className="text-zinc-500 text-center py-4">لا توجد زيارات مسجلة.</div>}
                        {visits.map(v => (
                            <div key={v.id} className="p-4 rounded-xl border border-white/5 bg-zinc-900/40">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-zinc-200">{v.class_name} <span className="text-zinc-500 text-sm font-normal">| {v.teacher_name}</span></div>
                                        <div className="text-sm text-blue-400 mt-1">{v.topic}</div>
                                    </div>
                                    <div className="text-center bg-zinc-800/50 p-2 rounded-lg min-w-[60px]">
                                        <div className="text-xs text-zinc-400">الحصة</div>
                                        <div className="text-lg font-bold text-white">{v.period_number ?? '-'}</div>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-zinc-500 flex justify-between">
                                    <span>{new Date(v.visit_date).toLocaleDateString("ar-SA")}</span>
                                    <span className="text-emerald-500">تم رصد الحضور آلياً ✓</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
