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
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="text-sm text-muted-foreground">المخزون الكلي</div>
                <div className="text-3xl font-bold text-foreground mt-1">{totalBooks}</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="text-sm text-muted-foreground">كتب معارة</div>
                <div className="text-3xl font-bold text-primary mt-1">{activeLoans}</div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                <div className="text-sm text-muted-foreground">زيارات الفصول</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">{totalVisits}</div>
            </div>
        </div>
    );
}
