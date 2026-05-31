import React, { useState } from "react";
import { CorrespondenceRow } from "@/lib/types/secretary";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";

interface Props {
    letters: CorrespondenceRow[];
    onAdd: (l: Omit<CorrespondenceRow, "id" | "created_at" | "attachment_url" | "status">) => void;
    onUpdateStatus: (id: string, s: string) => void;
    onDelete: (id: string) => void;
}

export function CorrespondenceTable({ letters, onAdd, onUpdateStatus, onDelete }: Props) {
    const [filter, setFilter] = useState<"incoming" | "outgoing">("incoming");
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [subject, setSubject] = useState("");
    const [sender, setSender] = useState("");
    const [receiver, setReceiver] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const filtered = letters.filter(l => l.type === filter);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onAdd({
            type: filter,
            subject,
            sender: filter === "incoming" ? sender : "المدرسة",
            receiver: filter === "outgoing" ? receiver : "المدرسة",
            date
        });
        setIsFormOpen(false);
        setSubject(""); setSender(""); setReceiver("");
    }

    return (
        <Card className="min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <div className="flex bg-zinc-900/50 p-1 rounded-xl">
                    <button
                        onClick={() => setFilter("incoming")}
                        className={`px-4 py-2 rounded-lg text-sm transition ${filter === "incoming" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        وارد
                    </button>
                    <button
                        onClick={() => setFilter("outgoing")}
                        className={`px-4 py-2 rounded-lg text-sm transition ${filter === "outgoing" ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        صادر
                    </button>
                </div>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition"
                >
                    {isFormOpen ? "إلغاء" : "+ تسجيل جديد"}
                </button>
            </div>

            {isFormOpen && (
                <form onSubmit={handleSubmit} className="mb-8 p-4 bg-zinc-900/30 border border-white/5 rounded-2xl animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-400">الموضوع</label>
                            <input required value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" title="الموضوع" />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400">التاريخ</label>
                            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" title="التاريخ" />
                        </div>
                        {filter === "incoming" ? (
                            <div>
                                <label className="text-xs text-zinc-400">من (الجهة المرسلة)</label>
                                <input required value={sender} onChange={e => setSender(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" title="الجهة المرسلة" />
                            </div>
                        ) : (
                            <div>
                                <label className="text-xs text-zinc-400">إلى (الجهة المستقبلة)</label>
                                <input required value={receiver} onChange={e => setReceiver(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" title="الجهة المستقبلة" />
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold">حفظ</button>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="text-zinc-500 border-b border-white/5">
                        <tr>
                            <th className="pb-3 pr-2">#</th>
                            <th className="pb-3">الموضوع</th>
                            <th className="pb-3">{filter === "incoming" ? "المرسل" : "المستقبل"}</th>
                            <th className="pb-3">التاريخ</th>
                            <th className="pb-3">الحالة</th>
                            <th className="pb-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-zinc-500">لا توجد سجلات.</td>
                            </tr>
                        )}
                        {filtered.map((l, idx) => (
                            <tr key={l.id} className="group hover:bg-white/5 transition-colors">
                                <td className="py-3 pr-2 text-zinc-600">{idx + 1}</td>
                                <td className="py-3 font-medium text-zinc-200">
                                    <input
                                        type="text"
                                        value={l.subject}
                                        className="bg-transparent border-none outline-none w-full"
                                        readOnly
                                        aria-label={`الموضوع: ${l.subject}`}
                                    />
                                </td>
                                <td className="py-3 text-zinc-400">{filter === "incoming" ? l.sender : l.receiver}</td>
                                <td className="py-3 text-zinc-500">{new Date(l.date).toLocaleDateString("ar-SA")}</td>
                                <td className="py-3"><StatusBadge status={l.status} /></td>
                                <td className="py-3 flex gap-2">
                                    {l.status === 'received' && (
                                        <button onClick={() => onUpdateStatus(l.id, 'processed')} className="text-xs text-blue-400 hover:text-blue-300">معالجة</button>
                                    )}
                                    {l.status === 'processed' && (
                                        <button onClick={() => onUpdateStatus(l.id, 'archived')} className="text-xs text-zinc-400 hover:text-zinc-300">أرشفة</button>
                                    )}
                                    <button onClick={() => onDelete(l.id)} className="text-xs text-rose-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition">حذف</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
