import React from "react";
import { LabBooking } from "@/lib/types/science";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function BookingList({ bookings }: { bookings: LabBooking[] }) {
    if (bookings.length === 0) {
        return <div className="text-stone-500 text-sm p-4 text-center">لا توجد حجوزات قادمة.</div>;
    }

    return (
        <div className="space-y-3">
            {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white/80 hover:bg-stone-100/80 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-stone-100/80 border border-stone-200">
                            <span className="text-xs text-stone-500">حصة</span>
                            <span className="text-lg font-bold text-foreground">{b.period}</span>
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-stone-700">
                                {new Date(b.booking_date).toLocaleDateString("ar-SA", { weekday: 'long', day: 'numeric', month: 'short' })}
                            </div>
                            <div className="text-xs text-stone-500 mt-0.5">
                                المعلم: {b.teacher_name}
                                {b.experiment_title && <span className="text-stone-500"> | تجربة: {b.experiment_title}</span>}
                            </div>
                        </div>
                    </div>
                    <StatusBadge status={b.status} />
                </div>
            ))}
        </div>
    );
}
