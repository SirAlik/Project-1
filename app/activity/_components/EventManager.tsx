import React, { useState } from "react";
import {
    Plus,
    Calendar as CalendarIcon,
    List,
} from "lucide-react";
import { ActivityEvent } from "@/lib/types/activity";
import { EventCalendar } from "./EventCalendar";
import { EventList } from "./EventList";

type EventFormInput = Omit<ActivityEvent, "id" | "created_at" | "participants_count">;

interface EventManagerProps {
    events: ActivityEvent[];
    onAddEvent: (event: EventFormInput) => void;
    onUpdateEvent: (id: string, updates: Partial<ActivityEvent>) => void;
    onDeleteEvent: (id: string) => void;
}

export function EventManager({
    events,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent
}: EventManagerProps) {
    const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);

    const handleSelectEvent = (event: ActivityEvent) => {
        setSelectedEvent(event);
        // In a full implementation, this could open an edit/detail modal
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-700">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        إدارة الفعاليات والنشاطات <CalendarIcon className="w-7 h-7 text-blue-400" />
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest italic">الخطة التشغيلية والمخرجات (QF71-G-4-1)</p>
                </div>

                <div className="flex gap-4">
                    <div className="flex p-1.5 bg-zinc-900 rounded-2xl border border-zinc-800">
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                            <CalendarIcon className="w-3 h-3" /> التقويم
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-zinc-300"}`}
                        >
                            <List className="w-3 h-3" /> القائمة
                        </button>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl text-xs font-black transition-all shadow-xl shadow-blue-900/40 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> فعالية جديدة
                    </button>
                </div>
            </div>

            {/* View Content */}
            {viewMode === "calendar" ? (
                <EventCalendar events={events} onSelectEvent={handleSelectEvent} />
            ) : (
                <EventList events={events} onUpdate={onUpdateEvent} onDelete={onDeleteEvent} />
            )}

            {/* Detailed Modal */}
            {(showAddModal || selectedEvent) && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => { setShowAddModal(false); setSelectedEvent(null); }}
                    onSubmit={(data) => {
                        if (selectedEvent) onUpdateEvent(selectedEvent.id, data);
                        else onAddEvent(data);
                        setShowAddModal(false);
                        setSelectedEvent(null);
                    }}
                />
            )}
        </div>
    );
}

// --- Sub-Component: EventModal ---

function EventModal({ event, onClose, onSubmit }: { event: ActivityEvent | null; onClose: () => void; onSubmit: (data: EventFormInput) => void }) {
    const [formData, setFormData] = useState({
        title: event?.title || "",
        type: event?.type || "event",
        date: event?.date || new Date().toISOString().split('T')[0],
        location: event?.location || "",
        target_audience: event?.target_audience || "جميع المراحل",
        outcome: event?.outcome || "",
        notes: event?.notes || ""
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-in slide-in-from-bottom-12 duration-500">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl relative">
                <div className="p-10 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center text-right">
                    <div>
                        <h3 className="text-xl font-black text-white">{event ? 'تعديل الفعالية' : 'جدولة فعالية مدرسية'}</h3>
                        <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">تعبئة بيانات النشاط (QF71-G-4-1)</p>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-[2rem]">
                        <CalendarIcon className="w-8 h-8 text-blue-400" />
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2 block">مسمى الفعالية/المسابقة</label>
                        <input
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-8 py-5 text-sm focus:border-blue-500 outline-none transition-all text-right placeholder:text-zinc-800"
                            placeholder="مثال: مسابقة القرآن الكريم السنوية"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            aria-label="مسمى الفعالية"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase mr-2 block">نوع الحدث</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-6 py-5 text-xs font-black appearance-none text-right"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as ActivityEvent['type'] })}
                                aria-label="نوع الحدث"
                            >
                                <option value="event">فعالية عامة</option>
                                <option value="competition">مسابقة</option>
                                <option value="meeting">اجتماع نشاط</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase mr-2 block">تاريخ التنفيذ</label>
                            <input
                                type="date"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-6 py-5 text-xs font-black text-right"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                aria-label="تاريخ التنفيذ"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase mr-2 block">الموقع</label>
                            <input
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-6 py-5 text-xs font-black text-right"
                                placeholder="صالة المدرسة"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                aria-label="الموقع"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase mr-2 block">المستهدفون</label>
                            <input
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-6 py-5 text-xs font-black text-right"
                                value={formData.target_audience}
                                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                                aria-label="المستهدفون"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase mr-2 block">المخرجات/النتائج</label>
                        <textarea
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl px-8 py-5 text-xs font-bold text-right min-h-[100px]"
                            placeholder="اكتب أبرز النتائج أو المخرجات..."
                            value={formData.outcome}
                            onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                            aria-label="المخرجات أو النتائج"
                        />
                    </div>
                </div>

                <div className="p-10 bg-zinc-900/50 flex gap-4">
                    <button
                        disabled={!formData.title}
                        onClick={() => onSubmit(formData)}
                        className="flex-1 bg-white hover:bg-zinc-200 text-black py-6 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-20 shadow-xl shadow-white/5"
                    >
                        حفظ البيانات
                    </button>
                    <button
                        onClick={onClose}
                        className="px-12 py-6 bg-zinc-800 text-zinc-500 rounded-3xl text-[10px] font-black transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}
