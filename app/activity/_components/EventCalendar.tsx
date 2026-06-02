import React, { useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
} from "lucide-react";
import { ActivityEvent } from "@/lib/types/activity";

interface EventCalendarProps {
    events: ActivityEvent[];
    onSelectEvent: (event: ActivityEvent) => void;
}

export function EventCalendar({ events, onSelectEvent }: EventCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const prevMonthPadding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDay = (day: number) => {
        return events.filter(e => {
            const d = new Date(e.date);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

    const monthName = currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-white/80 border border-stone-200 rounded-[2.5rem] p-8 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-foreground flex items-center gap-3">
                    التقويم الشهري <CalendarIcon className="w-6 h-6 text-blue-400" />
                </h3>
                <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-stone-200">
                    <button aria-label="الشهر السابق" onClick={prevMonth} className="p-2 hover:bg-stone-200 rounded-xl text-stone-500 transition-all"><ChevronRight className="w-5 h-5" /></button>
                    <span className="text-xs font-black text-stone-600 min-w-[100px] text-center uppercase tracking-widest">{monthName}</span>
                    <button aria-label="الشهر التالي" onClick={nextMonth} className="p-2 hover:bg-stone-200 rounded-xl text-stone-500 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-3">
                {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-stone-500 uppercase pb-4 tracking-tighter">
                        {day}
                    </div>
                ))}

                {prevMonthPadding.map(i => (
                    <div key={`pad-${i}`} className="aspect-square bg-white/80 rounded-2xl border border-transparent" />
                ))}

                {days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                    return (
                        <div
                            key={day}
                            className={`group aspect-square p-2 bg-white/80 border border-stone-200 rounded-3xl relative hover:bg-white/80 hover:border-blue-500/30 transition-all cursor-pointer ${isToday ? 'ring-2 ring-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/5' : ''}`}
                        >
                            <span className={`text-[10px] font-black ${isToday ? 'text-blue-400' : 'text-stone-500'} group-hover:text-foreground transition-colors`}>{day}</span>

                            <div className="mt-1 space-y-1">
                                {dayEvents.slice(0, 2).map(event => (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                                        className={`h-1.5 w-full rounded-full transition-all group-hover:scale-y-125 ${event.type === 'competition' ? 'bg-[hsl(var(--gold))]' :
                                            event.type === 'meeting' ? 'bg-zinc-400' :
                                                'bg-blue-500'
                                            }`}
                                    />
                                ))}
                                {dayEvents.length > 2 && (
                                    <div className="h-1 text-[8px] font-black text-stone-500 text-center leading-[0]">+ {dayEvents.length - 2}</div>
                                )}
                            </div>

                            {dayEvents.length > 0 && (
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 flex gap-6 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">فعالية</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--gold))]" />
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">مسابقة</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">اجتماع</span>
                </div>
            </div>
        </div>
    );
}
