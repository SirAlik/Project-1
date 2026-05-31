import React from "react";
import { BookRow, LoanRow, VisitRow } from "@/lib/types/lrc";

interface Props {
    books: BookRow[];
    loans: LoanRow[];
    visits: VisitRow[];
}

export function LrcStats({ books, loans, visits }: Props) {
    const totalBooks = books.reduce((acc, b) => acc + b.total_copies, 0);
    const activeLoans = loans.filter(l => l.status === 'active').length;
    const totalVisits = visits.length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/10 backdrop-blur-sm">
                <div className="text-sm text-zinc-400">المخزون الكلي</div>
                <div className="text-3xl font-bold text-indigo-400 mt-1">{totalBooks}</div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[hsla(var(--gold),.10)] to-[hsla(var(--gold-strong),.10)] border border-[hsla(var(--gold),.20)] backdrop-blur-sm">
                <div className="text-sm text-zinc-400">كتب معارة</div>
                <div className="text-3xl font-bold text-[hsl(var(--gold))] mt-1">{activeLoans}</div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/10 backdrop-blur-sm">
                <div className="text-sm text-zinc-400">زيارات الفصول</div>
                <div className="text-3xl font-bold text-blue-400 mt-1">{totalVisits}</div>
            </div>
        </div>
    );
}
