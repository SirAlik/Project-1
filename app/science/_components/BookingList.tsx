import React from "react";
import { LabBooking } from "@/lib/types/science";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function BookingList({ bookings }: { bookings: LabBooking[] }) {
    if (bookings.length === 0) {
        return <div className="text-zinc-500 text-sm p-4 text-center">لا توجد حجوزات قادمة.</div>;
    }

    return (
        <div className="space-y-3">
            {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-zinc-800/50 border border-white/5">
                            <span className="text-xs text-zinc-400">حصة</span>
                            <span className="text-lg font-bold text-white">{b.period}</span>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-zinc-200">
                                {new Date(b.booking_date).toLocaleDateString("ar-SA", { weekday: 'long', day: 'numeric', month: 'short' })}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">
                                المعلم: {b.teacher_name}
                                {b.experiment_title && <span className="text-zinc-600"> | تجربة: {b.experiment_title}</span>}
                            </div>
                        </div>
                    </div>
                    <StatusBadge status={b.status} />
                </div>
            ))}
        </div>
    );
}
