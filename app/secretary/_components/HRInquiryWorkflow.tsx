import React, { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, MessageSquare, ShieldCheck, TrendingDown, Clock, Calendar } from "lucide-react";
import { HRInquiry } from "@/lib/types/secretary";

interface Props {
    inquiries: HRInquiry[];
    onUpdateInquiry: (id: string, updates: Partial<HRInquiry>) => void;
}

export function HRInquiryWorkflow({ inquiries, onUpdateInquiry }: Props) {
    const [filter, setFilter] = useState<HRInquiry["status"] | "all">("pending_justification");
    const [selectedInquiry, setSelectedInquiry] = useState<HRInquiry | null>(null);

    const filtered = inquiries.filter(i => filter === "all" || i.status === filter);

    const getStatusStyles = (status: HRInquiry["status"]) => {
        switch (status) {
            case "pending_justification": return "bg-[hsla(var(--gold),.15)] text-[hsl(var(--gold))] border-[hsla(var(--gold),.25)]";
            case "justified": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "not_justified": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            case "deducted": return "bg-stone-200 text-stone-500 border-stone-300";
            default: return "bg-stone-200 text-stone-500 border-stone-300";
        }
    };

    const getStatusLabel = (status: HRInquiry["status"]) => {
        switch (status) {
            case "pending_justification": return "بانتظار الرد";
            case "justified": return "تم قبول العذر";
            case "not_justified": return "لم يقبل العذر";
            case "deducted": return "تم الخصم";
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/80 p-6 rounded-[2rem] border border-stone-200">
                <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-[hsl(var(--gold))]" />
                        سير عمل الاستفسارات (HR)
                    </h3>
                    <p className="text-stone-500 text-sm mt-1">إدارة تبريرات التأخر والغياب واتخاذ القرارات الإدارية.</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shrink-0">
                    {[
                        { id: "pending_justification", label: "معلقة" },
                        { id: "justified", label: "مقبولة" },
                        { id: "not_justified", label: "مرفوضة" },
                        { id: "all", label: "الكل" }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id as HRInquiry["status"] | "all")}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === t.id ? 'bg-stone-200 text-stone-700 shadow-sm' : 'text-stone-500 hover:text-stone-600'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filtered.map(inquiry => (
                    <div key={inquiry.id} className="bg-white/80 border border-stone-200 p-6 rounded-[2.5rem] hover:border-stone-300 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                            <div className="flex items-start gap-4">
                                <div className={`p-4 rounded-3xl border ${getStatusStyles(inquiry.status)}`}>
                                    {inquiry.type === 'late' ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold text-lg">{inquiry.employee?.name || 'موظف'}</span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${getStatusStyles(inquiry.status)} uppercase`}>
                                            {getStatusLabel(inquiry.status)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-stone-500 uppercase">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {inquiry.type === 'late' ? 'تأخر' : 'غياب'}</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {inquiry.incident_date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                                {inquiry.status === "pending_justification" && (
                                    <button
                                        onClick={() => setSelectedInquiry(inquiry)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all"
                                    >
                                        <MessageSquare className="w-4 h-4" /> تسجيل التبرير
                                    </button>
                                )}
                                {inquiry.status === "not_justified" && (
                                    <button
                                        onClick={() => setSelectedInquiry(inquiry)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-rose-500/20"
                                    >
                                        <TrendingDown className="w-4 h-4" /> اتخاذ قرار الخصم
                                    </button>
                                )}
                                {["justified", "deducted"].includes(inquiry.status) && (
                                    <div className="flex items-center gap-2 text-stone-500 text-[10px] font-bold bg-white px-4 py-2 rounded-xl border border-stone-200">
                                        <CheckCircle className="w-3 h-3 text-emerald-400" /> تمت المعالجة
                                    </div>
                                )}
                            </div>
                        </div>

                        {inquiry.justification && (
                            <div className="mt-6 p-4 bg-white/80 rounded-2xl border border-stone-200">
                                <p className="text-[10px] font-black text-stone-500 uppercase mb-2">تبرير الموظف:</p>
                                <p className="text-stone-500 text-xs italic">&quot;{inquiry.justification}&quot;</p>
                            </div>
                        )}
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="bg-white/80 border border-stone-200 p-12 rounded-[2.5rem] text-center">
                        <ShieldCheck className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <h4 className="text-stone-500 font-bold">لا توجد استفسارات بهذا التصنيف حالياً</h4>
                    </div>
                )}
            </div>

            {/* Inquiry Processing Modal */}
            {selectedInquiry && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-200/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-stone-100 border border-stone-200 w-full max-w-md rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="text-white text-xl font-bold">معالجة استفسار</h4>
                                    <p className="text-stone-500 text-xs mt-1">{selectedInquiry.employee?.name}</p>
                                </div>
                                <button onClick={() => setSelectedInquiry(null)} className="text-stone-500 hover:text-foreground transition-colors">إغلاق</button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const updates: Partial<HRInquiry> = {};

                                if (selectedInquiry.status === "pending_justification") {
                                    updates.justification = formData.get("justification")?.toString() ?? null;
                                    updates.justification_date = new Date().toISOString().split('T')[0];
                                    updates.status = formData.get("decision")?.toString() as HRInquiry["status"] | undefined;
                                } else if (selectedInquiry.status === "not_justified") {
                                    updates.deduction_days = parseInt(formData.get("days")?.toString() ?? "0");
                                    updates.status = "deducted";
                                }

                                onUpdateInquiry(selectedInquiry.id, updates);
                                setSelectedInquiry(null);
                            }} className="space-y-6">
                                {selectedInquiry.status === "pending_justification" ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">تبرير الموظف</label>
                                            <textarea name="justification" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-xs text-foreground font-bold h-24" required aria-label="تبرير الموظف" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">قرار المدير</label>
                                            <select name="decision" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-xs text-foreground font-bold appearance-none" aria-label="قرار المدير">
                                                <option value="justified">قبول العذر (حفظ بدون حسم)</option>
                                                <option value="not_justified">رفض العذر (تجهيز قرار حسم)</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                            <p className="text-[10px] font-bold text-rose-400">تحذير: هذا الإجراء سيولد &quot;قرار حسم&quot; رسمي (QF71-A-3-3)</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">عدد أيام الحسم</label>
                                            <input name="days" type="number" step="0.5" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-xs text-foreground font-bold" required defaultValue="1" aria-label="عدد أيام الحسم" />
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-lg shadow-indigo-500/20">
                                    تحديث الحالة
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
