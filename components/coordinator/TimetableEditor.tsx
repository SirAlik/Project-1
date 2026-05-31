'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check, Search, X } from 'lucide-react';
import { assignTeacherToSlot } from '@/app/_actions/coordinator-classroom';
import { useRouter } from 'next/navigation';

interface TimetableSlot {
    id: string;
    day: number; // 0-6
    period: number; // 1-7
    teacher_id: string | null;
    teacher?: { id: string; full_name: string };
    subjects?: { id: string; name_ar: string };
    subject_id: string;
}

interface Teacher {
    id: string;
    full_name: string;
    email: string;
}

interface Props {
    slots: TimetableSlot[];
    teachers: Teacher[];
    classId: string;
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export function TimetableEditor({ slots, teachers }: Props) {
    const router = useRouter();
    const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Group slots by day/period for easy lookup
    const getSlot = (dayIndex: number, period: number) => {
        // Map visual day index (0=Sunday) to DB day index (0=Sunday)
        return slots.find(s => s.day === dayIndex && s.period === period);
    };

    const handleAssign = async (teacherId: string) => {
        if (!selectedSlot) return;
        setIsSaving(true);

        try {
            const res = await assignTeacherToSlot({ slotId: selectedSlot.id, teacherId });
            if (res.serverError) {
                alert(res.serverError);
            } else {
                setSelectedSlot(null);
                router.refresh(); // Refresh to show new data
            }
        } catch {
            alert('حدث خطأ غير متوقع');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredTeachers = teachers.filter(t =>
        t.full_name.includes(searchTerm) || t.email.includes(searchTerm)
    );

    return (
        <div className="space-y-8">
            {/* Grid */}
            <div className="overflow-x-auto pb-4">
                <div className="min-w-[1000px] grid grid-cols-[100px_repeat(7,1fr)] gap-2">
                    {/* Header Row */}
                    <div className="glass-panel p-4 flex items-center justify-center font-bold text-white/50">
                        اليوم / الحصة
                    </div>
                    {PERIODS.map(p => (
                        <div key={p} className="glass-panel p-3 text-center">
                            <span className="block text-xs text-white/40 mb-1">الحصة</span>
                            <span className="text-xl font-black text-[var(--primary)]">{p}</span>
                        </div>
                    ))}

                    {/* Days Rows */}
                    {DAYS.map((dayName, dayIndex) => (
                        <React.Fragment key={dayIndex}>
                            {/* Day Label */}
                            <div className="glass-panel p-4 flex items-center justify-center font-bold relative overflow-hidden group">
                                <span className="relative z-10">{dayName}</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Slots */}
                            {PERIODS.map(period => {
                                const slot = getSlot(dayIndex, period);
                                const hasTeacher = !!slot?.teacher_id;

                                return (
                                    <div
                                        key={`${dayIndex}-${period}`}
                                        onClick={() => slot && setSelectedSlot(slot)}
                                        className={`
                      relative p-3 rounded-xl border transition-all cursor-pointer min-h-[100px] flex flex-col justify-between
                      ${!slot
                                                ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
                                                : hasTeacher
                                                    ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10'
                                                    : 'border-white/10 bg-white/5 hover:border-yellow-500/50 hover:bg-yellow-500/5'
                                            }
                    `}
                                    >
                                        {!slot ? (
                                            <span className="text-xs text-center opacity-20">-</span>
                                        ) : (
                                            <>
                                                <div className="text-[10px] font-bold opacity-60 truncate">
                                                    {slot.subjects?.name_ar || 'بدون مادة'}
                                                </div>

                                                {hasTeacher ? (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <div className="w-5 h-5 rounded-full bg-[var(--primary)] text-black flex items-center justify-center text-[10px] font-bold">
                                                            {slot.teacher?.full_name[0]}
                                                        </div>
                                                        <span className="text-xs font-bold truncate">{slot.teacher?.full_name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="mt-auto flex justify-center">
                                                        <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-500 text-[9px] font-bold animate-pulse">
                                                            تعيين معلم
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Teacher Assignment Modal */}
            <AnimatePresence>
                {selectedSlot && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedSlot(null)}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <User className="text-[var(--primary)]" />
                                        تعيين معلم للحصة
                                    </h3>
                                    <p className="text-sm opacity-50 mt-1">
                                        {DAYS[selectedSlot.day]} • الحصة {selectedSlot.period} • {selectedSlot.subjects?.name_ar}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedSlot(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    aria-label="إغلاق النافذة"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                <input
                                    type="text"
                                    placeholder="ابحث عن معلم..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:border-[var(--primary)] transition-colors"
                                />
                            </div>

                            {/* Teacher List */}
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {filteredTeachers.map(teacher => (
                                    <button
                                        key={teacher.id}
                                        onClick={() => handleAssign(teacher.id)}
                                        disabled={isSaving}
                                        className={`
                      w-full flex items-center justify-between p-3 rounded-xl border border-white/5 
                      hover:bg-white/5 transition-all group text-right
                      ${selectedSlot.teacher_id === teacher.id ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30' : ''}
                    `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold">
                                                {teacher.full_name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm group-hover:text-[var(--primary)] transition-colors">
                                                    {teacher.full_name}
                                                </div>
                                                <div className="text-[10px] opacity-40">{teacher.email}</div>
                                            </div>
                                        </div>
                                        {selectedSlot.teacher_id === teacher.id && (
                                            <Check size={16} className="text-[var(--primary)]" />
                                        )}
                                    </button>
                                ))}

                                {filteredTeachers.length === 0 && (
                                    <div className="text-center py-8 opacity-40 text-sm">
                                        لا يوجد معلمين مطابقين للبحث
                                    </div>
                                )}
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
