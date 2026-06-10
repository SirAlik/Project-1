'use client';

import React, { useState } from 'react';
import {
    Users, BookOpen, Clock, Save,
    Trash2, Copy
} from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    useDraggable,
    useDroppable,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import { createToast } from '@/lib/metaverse/toast-engine';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

interface SlotContent {
    subjectId: string;
    teacherId: string;
    subjectName: string;
    teacherName: string;
}

export interface ClassItem    { id: string; name: string; }
export interface TeacherItem  { id: string; full_name: string; }
export interface SubjectItem  { id: string; name_ar: string; }
export interface TimetableSlotRow {
    class_id: string; teacher_id: string; subject_id: string;
    day: number; period: number;
}

interface DragData { id: string; type: 'subject' | 'teacher'; label: string; }

function DraggableAssignment({ id, type, label, icon }: {
    id: string; type: 'subject' | 'teacher'; label: string; icon: React.ReactNode
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `${type}-${id}`,
        data: { id, type, label }
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`p-3 bg-muted/50 border border-border rounded-xl flex items-center gap-3 cursor-grab hover:bg-muted transition-all active:scale-95 group ${isDragging ? 'opacity-50 z-50' : ''}`}
        >
            <div className={`w-8 h-8 rounded-lg ${type === 'subject' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'} flex items-center justify-center group-hover:bg-opacity-40 transition-colors`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{label}</span>
                {type === 'teacher' && (
                    <span className="text-[8px] text-muted-foreground tracking-wide uppercase">Teacher Verified</span>
                )}
            </div>
        </div>
    );
}

function TimetableSlotCell({ id, day, period, content, conflict }: {
    id: string; day: number; period: number; content?: SlotContent; conflict?: string
}) {
    const { isOver, setNodeRef } = useDroppable({ id, data: { day, period } });

    return (
        <div
            ref={setNodeRef}
            className={`p-1 border-l border-border/50 min-h-[120px] transition-all relative group ${isOver ? 'bg-primary/5' : 'hover:bg-muted/5'}`}
        >
            <div className={`w-full h-full rounded-xl border border-dashed transition-all p-2 flex flex-col gap-2 ${content ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border/50'} ${conflict ? 'border-destructive/50 bg-destructive/10 animate-pulse' : ''}`}>
                {content ? (
                    <>
                        <div className="flex items-center gap-2">
                            <BookOpen size={10} className="text-primary" />
                            <span className="text-[10px] font-black text-foreground">{content.subjectName}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-60">
                            <Users size={10} className="text-accent" />
                            <span className="text-[10px] font-bold text-muted-foreground">{content.teacherName}</span>
                        </div>
                        <button aria-label="حذف الحصة" className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                            <Trash2 size={12} />
                        </button>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity">
                        <span className="text-[8px] font-black uppercase text-center text-muted-foreground">Drop Here</span>
                    </div>
                )}
            </div>
            {conflict && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-destructive text-[8px] font-black px-2 py-1 rounded-full shadow-lg border border-destructive/50 text-destructive-foreground">
                        CONFLICT: {conflict}
                    </div>
                </div>
            )}
        </div>
    );
}

export interface TimetableInitialData {
    classes:  ClassItem[];
    teachers: TeacherItem[];
    subjects: SubjectItem[];
    allSlots: TimetableSlotRow[];
}

export function TimetableClient({ classes, teachers, subjects, allSlots }: TimetableInitialData) {
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [slots, setSlots] = useState<Record<string, SlotContent>>({});
    const [activeDrag, setActiveDrag] = useState<DragData | null>(null);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDrag(event.active.data.current as DragData);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDrag(null);
        if (!over) return;

        const slotData = over.data.current as { day: number; period: number } | undefined;
        if (!slotData) return;
        const { day, period } = slotData;
        const dragData = active.data.current as DragData | undefined;
        if (!dragData) return;

        if (dragData.type === 'teacher') {
            const isBusy = allSlots.find(
                s => s.teacher_id === dragData.id && s.day === day && s.period === period && s.class_id !== selectedClass?.id
            );
            if (isBusy) {
                createToast('error', `المعلم مشغول في فصل آخر (${isBusy.class_id}) بهذا الوقت!`);
                return;
            }
        }

        const slotId = String(over.id);
        setSlots(prev => {
            const current = prev[slotId] ?? { subjectId: '', teacherId: '', subjectName: '', teacherName: '' };
            if (dragData.type === 'subject') {
                return { ...prev, [slotId]: { ...current, subjectId: dragData.id, subjectName: dragData.label } };
            }
            return { ...prev, [slotId]: { ...current, teacherId: dragData.id, teacherName: dragData.label } };
        });
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="min-h-screen bg-background text-foreground p-6 lg:p-12" dir="rtl">
                <div className="max-w-[1700px] mx-auto space-y-12">
                    <header className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h1 className="text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic tracking-tighter">
                                Timetable Master
                            </h1>
                            <p className="text-muted-foreground text-xs font-bold mt-2 uppercase tracking-[0.3em]">
                                Neural Schedule Optimizer v4.2
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-3xl border border-border backdrop-blur-3xl shadow-sm">
                            <select
                                value={selectedClass?.id ?? ''}
                                onChange={e => setSelectedClass(classes.find(c => c.id === e.target.value) ?? null)}
                                className="bg-muted/50 border border-border rounded-2xl px-8 py-3 text-sm font-black focus:ring-1 focus:ring-primary outline-none min-w-[200px] text-foreground"
                                aria-label="اختر الفصل لتعديل الجدول"
                            >
                                <option value="">اختر الفصل المستهدف...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="h-8 w-px bg-border hidden md:block" />
                            <button className="flex items-center gap-2 px-8 py-3 bg-muted/50 hover:bg-muted text-foreground font-black rounded-2xl transition-all text-xs">
                                <Copy size={14} /> نسخ الجدول
                            </button>
                            <button className="flex items-center gap-2 px-10 py-3 bg-primary text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm">
                                <Save size={16} /> حفظ ومزامنة
                            </button>
                        </div>
                    </header>

                    <div className="grid grid-cols-12 gap-8 items-start">
                        <aside className="col-span-12 lg:col-span-3 space-y-6 sticky top-8">
                            <div className="bg-card border border-border rounded-[2rem] p-6 space-y-4 shadow-sm">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <BookOpen size={14} className="text-primary" /> المواد الدراسية
                                </h3>
                                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {subjects.map(s => (
                                        <DraggableAssignment key={s.id} id={s.id} type="subject" label={s.name_ar} icon={<BookOpen size={14} />} />
                                    ))}
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-[2rem] p-6 space-y-4 shadow-sm">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Users size={14} className="text-accent" /> المعلمون
                                </h3>
                                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {teachers.map(t => (
                                        <DraggableAssignment key={t.id} id={t.id} type="teacher" label={t.full_name} icon={<Users size={14} />} />
                                    ))}
                                </div>
                            </div>
                        </aside>

                        <main className="col-span-12 lg:col-span-9">
                            <div className="bg-card overflow-hidden border border-border rounded-[2rem] shadow-sm">
                                <div className="grid grid-cols-8 border-b border-border bg-muted/20">
                                    <div className="p-4 border-l border-border/50 text-[10px] font-black text-muted-foreground uppercase text-center flex items-center justify-center">
                                        <Clock size={14} className="opacity-40 ml-2" /> الوقت
                                    </div>
                                    {PERIODS.map(p => (
                                        <div key={p} className="p-4 border-l border-border/50 text-[10px] font-black text-muted-foreground uppercase text-center">
                                            الحصة {p}
                                        </div>
                                    ))}
                                </div>
                                {DAYS.map((day, dIdx) => (
                                    <div key={day} className="grid grid-cols-8 border-b border-border/50 group relative">
                                        <div className="p-6 border-l border-border/50 bg-muted/10 flex items-center justify-center min-h-[120px]">
                                            <span className="text-sm font-black text-muted-foreground group-hover:text-primary transition-colors origin-center -rotate-90 md:rotate-0 tracking-tighter">{day}</span>
                                        </div>
                                        {PERIODS.map(period => (
                                            <TimetableSlotCell
                                                key={`${dIdx}-${period}`}
                                                id={`${dIdx}-${period}`}
                                                day={dIdx}
                                                period={period}
                                                content={slots[`${dIdx}-${period}`]}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </main>
                    </div>
                </div>
            </div>

            <DragOverlay dropAnimation={null}>
                {activeDrag ? (
                    <div className={`p-4 rounded-2xl border bg-card shadow-2xl flex items-center gap-3 ${activeDrag.type === 'subject' ? 'border-primary/50 text-primary' : 'border-accent/50 text-accent'}`}>
                        {activeDrag.type === 'subject' ? <BookOpen size={18} /> : <Users size={18} />}
                        <span className="text-sm font-black text-foreground">{activeDrag.label}</span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
