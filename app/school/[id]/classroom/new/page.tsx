'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Layers, Check, Loader2, AlertTriangle, School, BookOpen } from 'lucide-react';
import { createClass } from '@/app/_actions/coordinator-classroom';
import { supabase } from '@/lib/db/supabase';

interface Stage { id: string; name: string; code: string; }

export default function NewClassroomPage() {
    const router = useRouter();
    const params = useParams();
    const schoolId = params.id as string;

    const [isLoading, setIsLoading]   = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [stages, setStages]         = useState<Stage[]>([]);
    const [formData, setFormData]     = useState({
        name:       '',
        gradeLevel: '',
        gender:     'boy' as 'boy' | 'girl' | 'mixed',
        stageId:    '',
    });

    const [nameStatus,      setNameStatus]      = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [isCheckingName,  setIsCheckingName]  = useState(false);
    const [timer,           setTimer]           = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        async function fetchStages() {
            const { data } = await supabase
                .from('school_stages')
                .select('id, name, code')
                .eq('school_id', schoolId)
                .order('grade_from');
            setStages(data ?? []);
        }
        if (schoolId) fetchStages();
    }, [schoolId]);

    const checkAvailability = async (name: string) => {
        if (!name || name.length < 2) { setNameStatus('idle'); setIsCheckingName(false); return; }
        setIsCheckingName(true);
        setNameStatus('checking');
        try {
            const { checkClassName } = await import('@/app/_actions/coordinator-classroom');
            const res = await checkClassName({ schoolId, name });
            setNameStatus(res?.data?.available ? 'available' : 'taken');
        } catch {
            setNameStatus('idle');
        } finally {
            setIsCheckingName(false);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, name: val }));
        if (timer) clearTimeout(timer);
        setNameStatus('idle');
        if (val.length >= 2) {
            setIsCheckingName(true);
            setTimer(setTimeout(() => checkAvailability(val), 500));
        } else {
            setIsCheckingName(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.stageId) { setError('يرجى اختيار المرحلة الدراسية'); return; }
        setIsLoading(true);
        setError(null);
        try {
            const res = await createClass({
                schoolId,
                name:       formData.name,
                gradeLevel: formData.gradeLevel,
                gender:     formData.gender,
                stageId:    formData.stageId,
            });
            if (res.serverError || res.validationErrors) {
                setError(res.serverError || 'حدث خطأ في البيانات المدخلة');
                return;
            }
            router.push(`/school/${schoolId}/classroom`);
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    const grades = [
        'الصف الأول ابتدائي',   'الصف الثاني ابتدائي',  'الصف الثالث ابتدائي',
        'الصف الرابع ابتدائي',  'الصف الخامس ابتدائي',  'الصف السادس ابتدائي',
        'الصف الأول متوسط',     'الصف الثاني متوسط',    'الصف الثالث متوسط',
        'الصف الأول ثانوي',     'الصف الثاني ثانوي',    'الصف الثالث ثانوي',
    ];

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 lg:p-12 flex items-center justify-center font-sans" dir="rtl">
            <div className="max-w-2xl w-full">
                <div className="mb-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mx-auto mb-6 text-[var(--primary)]"
                    >
                        <Layers size={32} />
                    </motion.div>
                    <h1 className="text-3xl font-black mb-2">إضافة فصل دراسي جديد</h1>
                    <p className="opacity-60 text-sm">أضف فصلاً جديداً لتوزيع الطلاب وإدارة الجداول.</p>
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="glass-panel p-8 rounded-[2rem] border border-stone-200"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* المرحلة الدراسية (school_stage) */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold opacity-80">المرحلة التعليمية</label>
                            {stages.length === 0 ? (
                                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                                    <BookOpen size={16} className="flex-shrink-0" />
                                    <span className="font-bold">لا توجد مراحل دراسية مُعدَّة — أضف المراحل من إعدادات المدرسة أولاً</span>
                                </div>
                            ) : (
                                <div className="relative">
                                    <BookOpen size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                                    <select
                                        required
                                        className="w-full bg-white/5 border border-stone-200 rounded-xl px-4 py-3 pr-10 appearance-none focus:border-[var(--primary)] focus:bg-[var(--primary)]/5 transition-colors outline-none font-bold text-sm"
                                        value={formData.stageId}
                                        onChange={e => setFormData(prev => ({ ...prev, stageId: e.target.value }))}
                                    >
                                        <option value="" disabled className="bg-stone-100">اختر المرحلة...</option>
                                        {stages.map(s => (
                                            <option key={s.id} value={s.id} className="bg-stone-100">{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* اسم الفصل */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold opacity-80">اسم الفصل</label>
                            <div className="relative">
                                <input
                                    required
                                    type="text"
                                    placeholder="مثال: رابع أول، خامس ب..."
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:outline-none focus:bg-[var(--primary)]/5 transition-colors font-bold pl-10
                                    ${nameStatus === 'available' ? 'border-green-500/50' : nameStatus === 'taken' ? 'border-red-500/50' : 'border-stone-200 focus:border-[var(--primary)]'}`}
                                    value={formData.name}
                                    onChange={handleNameChange}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                    {isCheckingName && <Loader2 size={16} className="animate-spin opacity-50" />}
                                    {nameStatus === 'available' && <Check size={16} className="text-green-500" />}
                                    {nameStatus === 'taken' && <span className="text-xs font-bold text-red-500">مستخدم</span>}
                                </div>
                            </div>
                            {nameStatus === 'taken' && (
                                <p className="text-xs text-red-400 font-bold mr-1">هذا الاسم مستخدم مسبقاً</p>
                            )}
                        </div>

                        {/* الصف الدراسي */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold opacity-80">الصف الدراسي</label>
                            <div className="relative">
                                <School size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                                <select
                                    required
                                    aria-label="الصف الدراسي"
                                    className="w-full bg-white/5 border border-stone-200 rounded-xl px-4 py-3 pr-10 appearance-none focus:border-[var(--primary)] focus:bg-[var(--primary)]/5 transition-colors outline-none font-bold text-sm"
                                    value={formData.gradeLevel}
                                    onChange={e => setFormData(prev => ({ ...prev, gradeLevel: e.target.value }))}
                                >
                                    <option value="" disabled className="bg-stone-100">اختر الصف...</option>
                                    {grades.map(grade => (
                                        <option key={grade} value={grade} className="bg-stone-100">{grade}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* نوع الفصل */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold opacity-80">نوع الفصل</label>
                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    { id: 'boy',   label: 'بنين'   },
                                    { id: 'girl',  label: 'بنات'   },
                                    { id: 'mixed', label: 'مشترك' },
                                ] as { id: 'boy' | 'girl' | 'mixed'; label: string }[]).map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, gender: option.id }))}
                                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                                            formData.gender === option.id
                                                ? 'bg-[var(--primary)] text-black border-[var(--primary)]'
                                                : 'bg-white/5 border-stone-200 hover:bg-white/10'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                                <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                                <span className="text-sm font-bold">{error}</span>
                            </div>
                        )}

                        <div className="pt-6 flex items-center justify-between border-t border-stone-200">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 rounded-xl hover:bg-white/5 text-sm font-bold transition-colors opacity-60 hover:opacity-100"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || stages.length === 0}
                                className="px-8 py-3 bg-[var(--primary)] text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                <span>حفظ وإنشاء</span>
                            </button>
                        </div>

                    </form>
                </motion.div>
            </div>
        </div>
    );
}
