import React, { useState } from "react";
import { LeaveRow } from "@/lib/types/secretary";
import { LeaveFormInput } from "@/app/secretary/_hooks/useSecretary";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";

interface Props {
    leaves: LeaveRow[];
    onAdd: (l: LeaveFormInput) => void;
    onUpdateStatus: (id: string, s: string) => void;
}

export function LeaveRequestForm({ leaves, onAdd, onUpdateStatus }: Props) {
    const [name, setName] = useState("");
    const [type, setType] = useState("annual");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [reason, setReason] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onAdd({
            employee_name: name,
            start_date: start,
            end_date: end,
            type,
            reason
        });
        setName(""); setReason(""); setStart(""); setEnd("");
    }

    return (
        <div className="grid gap-6 lg:grid-cols-12">
            {/* List */}
            <div className="lg:col-span-8">
                <Card title="سجل الإجازات">
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {leaves.length === 0 && <div className="text-center text-stone-500 py-4">لا توجد طلبات.</div>}
                        {leaves.map(l => (
                            <div key={l.id} className="p-3 rounded-xl border border-stone-200 bg-white/80 flex justify-between items-center group">
                                <div>
                                    <div className="font-bold text-stone-700">{l.employee_name} <span className="text-xs text-stone-500 font-normal">({l.type})</span></div>
                                    <div className="text-xs text-stone-500">من {new Date(l.start_date).toLocaleDateString("ar-SA")} إلى {new Date(l.end_date).toLocaleDateString("ar-SA")}</div>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <StatusBadge status={l.status} />
                                    {l.status === 'pending' && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => onUpdateStatus(l.id, 'approved')} className="bg-emerald-500/20 text-emerald-300 p-1 px-2 rounded text-xs hover:bg-emerald-500/30">✓</button>
                                            <button onClick={() => onUpdateStatus(l.id, 'rejected')} className="bg-rose-500/20 text-rose-300 p-1 px-2 rounded text-xs hover:bg-rose-500/30">✕</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Form */}
            <div className="lg:col-span-4">
                <Card title="تسجيل طلب إجازة">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="text-xs text-stone-500">اسم الموظف</label>
                            <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm" aria-label="اسم الموظف" />
                        </div>
                        <div>
                            <label className="text-xs text-stone-500">نوع الإجازة</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm" aria-label="نوع الإجازة">
                                <option value="annual">سنوية</option>
                                <option value="sick">مرضية</option>
                                <option value="emergency">اضطرارية</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-stone-500">من</label>
                                <input
                                    type="date"
                                    value={start}
                                    onChange={e => setStart(e.target.value)}
                                    className="w-full bg-stone-200/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500/50 outline-none transition-all"
                                    aria-label="تاريخ البداية"
                                />            </div>
                            <div>
                                <label className="text-xs text-stone-500">إلى</label>
                                <input required type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm" aria-label="تاريخ النهاية" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-stone-500">السبب</label>
                            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full bg-white border border-stone-300 rounded-xl p-2 text-sm" title="السبب" />
                        </div>
                        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition active:scale-95">
                            رفع الطلب
                        </button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
