import React from "react";
import { BookingRow } from "@/lib/types/lrc";
import { Card } from "@/components/ui/Card";
import { Check, X, Calendar, User, Users, BookOpen } from "lucide-react";

interface Props {
    bookings: BookingRow[];
    onUpdateStatus: (id: string, status: "approved" | "rejected" | "rescheduled") => void;
}

export function BookingManager({ bookings, onUpdateStatus }: Props) {
    const pending = bookings.filter(b => b.status === "pending");
    const history = bookings.filter(b => b.status !== "pending");

    return (
        <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-12">
                <Card title="طلبات الحجز المعلقة" className="border-primary/20 bg-primary/5">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pending.length === 0 && (
                            <div className="col-span-full text-center py-8 text-muted-foreground">لا توجد طلبات حجز معلقة حالياً.</div>
                        )}
                        {pending.map(b => (
                            <div key={b.id} className="p-4 rounded-xl border border-primary/20 bg-surface-soft shadow-xl space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div className="text-left px-2 py-1 rounded bg-muted text-[10px] font-bold text-muted-foreground">
                                        الحصة {b.period_number ?? '-'}
                                    </div>
                                </div>

                                <div>
                                    <div className="font-bold text-foreground flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" /> {b.teacher_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                        <Users className="w-4 h-4 text-muted-foreground" /> {b.class_name}
                                    </div>
                                    <div className="text-sm text-primary flex items-center gap-2 mt-2">
                                        <BookOpen className="w-4 h-4" /> {b.subject}
                                    </div>
                                </div>

                                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                                    التاريخ: {new Date(b.booking_date).toLocaleDateString("ar-SA")}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => onUpdateStatus(b.id, "approved")}
                                        className="flex-1 bg-primary hover:opacity-90 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                                    >
                                        <Check className="w-3 h-3" /> قبول
                                    </button>
                                    <button
                                        onClick={() => onUpdateStatus(b.id, "rejected")}
                                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                                    >
                                        <X className="w-3 h-3" /> رفض
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-12">
                <Card title="سجل الطلبات السابقة">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="pb-3 pr-4">المعلم</th>
                                    <th className="pb-3 text-center">الفصل</th>
                                    <th className="pb-3 text-center">المادة</th>
                                    <th className="pb-3 text-center">التاريخ</th>
                                    <th className="pb-3 text-left pl-4">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {history.map(b => (
                                    <tr key={b.id} className="hover:bg-surface-soft transition-colors">
                                        <td className="py-4 pr-4 font-medium">{b.teacher_name}</td>
                                        <td className="py-4 text-center">{b.class_name}</td>
                                        <td className="py-4 text-center text-muted-foreground">{b.subject}</td>
                                        <td className="py-4 text-center text-xs">{new Date(b.booking_date).toLocaleDateString("ar-SA")}</td>
                                        <td className="py-4 text-left pl-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${b.status === "approved" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                }`}>
                                                {b.status === "approved" ? "مقبول" : "مرفوض"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-muted-foreground italic">لا يوجد سجل للطلبات السابقة.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
