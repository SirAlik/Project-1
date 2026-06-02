import React, { useState } from "react";
import { BookRow, LoanRow } from "@/lib/types/lrc";
import { Card } from "@/components/ui/Card";

interface Props {
    books: BookRow[];
    loans: LoanRow[];
    students: { id: string; name: string }[];
    teachers: { id: string; name: string }[];
    onBorrow: (bid: string, uid: string, type: "student" | "teacher") => void;
    onReturn: (lid: string) => void;
}

export function LendingDesk({ books, loans, students, teachers, onBorrow, onReturn }: Props) {
    const [borrowerType, setBorrowerType] = useState<"student" | "teacher">("student");
    const [userId, setUserId] = useState("");
    const [bookSearch, setBookSearch] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    function handleBorrow(e: React.FormEvent) {
        e.preventDefault();
        if (userId && bookSearch) {
            onBorrow(bookSearch, userId, borrowerType);
            setUserId(""); setBookSearch("");
        }
    }

    const activeLoans = loans.filter(l => l.status === "active" || (l.status as string) === "overdue");
    const suggestions = books.filter(b => b.title.toLowerCase().includes(bookSearch.toLowerCase())).slice(0, 5);

    return (
        <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
                <Card title="إعارة جديدة" className="border-[hsla(var(--gold),.20)]">
                    <form onSubmit={handleBorrow} className="space-y-4">
                        <div className="flex gap-2 p-1 bg-stone-100 rounded-xl">
                            <button type="button" onClick={() => setBorrowerType("student")} className={`flex-1 py-1 rounded-lg text-sm transition-all duration-200 ${borrowerType === "student" ? "bg-[hsl(var(--gold-strong))] text-white shadow-lg" : "text-stone-500 hover:text-stone-600"}`}>طالب</button>
                            <button type="button" onClick={() => setBorrowerType("teacher")} className={`flex-1 py-1 rounded-lg text-sm transition-all duration-200 ${borrowerType === "teacher" ? "bg-[hsl(var(--gold-strong))] text-white shadow-lg" : "text-stone-500 hover:text-stone-600"}`}>معلم</button>
                        </div>

                        <select required value={userId} onChange={e => setUserId(e.target.value)} className="w-full bg-white border border-stone-200 focus:border-[hsla(var(--gold),.50)] outline-none rounded-xl p-3 text-sm transition-colors" title="اختر المستعير">
                            <option value="">{borrowerType === "student" ? "اختر الطالب..." : "اختر المعلم..."}</option>
                            {(borrowerType === "student" ? students : teachers).map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="اسم الكتاب..."
                                value={bookSearch}
                                onChange={e => { setBookSearch(e.target.value); setShowSuggestions(true); }}
                                onFocus={() => setShowSuggestions(true)}
                                className="w-full bg-white border border-stone-200 focus:border-[hsla(var(--gold),.50)] outline-none rounded-xl p-3 text-sm transition-colors"
                                required
                                aria-label="بحث عن كتاب للاستعارة"
                            />
                            {showSuggestions && bookSearch.length > 0 && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-stone-100 border border-stone-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    {suggestions.map(s => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => { setBookSearch(s.title); setShowSuggestions(false); }}
                                            className="w-full text-right px-4 py-2 text-sm text-stone-600 hover:bg-[hsla(var(--gold),.10)] hover:text-[hsl(var(--gold))] transition-colors border-b border-stone-200 last:border-0"
                                        >
                                            {s.title} <span className="text-[10px] text-stone-500">({s.available_copies} متاح)</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className="w-full bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] text-white py-2 rounded-xl text-sm font-bold shadow-lg shadow-[hsla(var(--gold),.20)] transition active:scale-95 disabled:opacity-50" disabled={!userId || !bookSearch}>
                            تسجيل إعارة
                        </button>
                        <p className="text-[10px] text-stone-500 text-center">سيتم إضافة الكتاب للفهرس تلقائياً إذا لم يكن موجوداً.</p>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-8">
                <Card title="الإعارات الجارية (للمتابعة)">
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {activeLoans.length === 0 && <div className="text-stone-500 text-center py-10 italic">لا توجد كتب معارة حالياً.</div>}
                        {activeLoans.map(l => {
                            const isOverdue = new Date(l.due_date) < new Date();
                            return (
                                <div key={l.id} className={`p-4 rounded-2xl border transition-all ${isOverdue ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/80 border-stone-200'} flex justify-between items-center group`}>
                                    <div>
                                        <div className="font-bold text-stone-700 group-hover:text-[hsl(var(--gold))] transition-colors">{l.book?.title ?? ''}</div>
                                        <div className="text-xs text-stone-500 flex items-center gap-2 mt-1">
                                            <span>المستعير: <span className="text-stone-600">{l.borrower_name}</span></span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${l.borrower_type === "student" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                                                {l.borrower_type === "student" ? "طالب" : "معلم"}
                                            </span>
                                        </div>
                                        <div className={`text-[10px] mt-2 flex items-center gap-1 ${isOverdue ? 'text-rose-400 font-bold animate-pulse' : 'text-stone-500'}`}>
                                            <Clock className="w-3 h-3" />
                                            موعـد الإرجاع: {new Date(l.due_date).toLocaleDateString("ar-SA")}
                                            {isOverdue && " (متأخر!)"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onReturn(l.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isOverdue ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-stone-200 hover:bg-stone-300 text-stone-600'}`}
                                    >
                                        استرجاع
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// Add simple clock icon for the overdue view
function Clock({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
