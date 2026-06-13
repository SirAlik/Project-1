'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ImportRow, validateImportData, ValidationRowResult, ImportResult } from '@/app/_actions/admin-import';
import { Search, AlertCircle, CheckCircle2, RefreshCw, ChevronRight, FileDown, ShieldCheck, ArrowLeft } from 'lucide-react';

const CHUNK_SIZE = 50;

interface DryRunDashboardProps {
    data: ImportRow[];
    onValidated: (result: ImportResult) => void;
    onProceed: () => void;
    onBack: () => void;
}

export function DryRunDashboard({ data, onValidated, onProceed, onBack }: DryRunDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [validationProgress, setValidationProgress] = useState(0);
    const [batchStatus, setBatchStatus] = useState('');
    const [validationStats, setValidationStats] = useState({ ready: 0, update: 0, error: 0 });
    const [displayResults, setDisplayResults] = useState<ValidationRowResult[]>([]);

    // Silent Store for High Performance
    const accumulatedResults = useRef<ValidationRowResult[]>([]);
    const validationStartedRef = useRef(false);

    useEffect(() => {
        if (validationStartedRef.current) return;
        validationStartedRef.current = true;

        let isCancelled = false;

        async function runChunkedValidation() {
            setLoading(true);
            accumulatedResults.current = [];
            setDisplayResults([]);
            const totalRows = data.length;
            const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

            for (let i = 0; i < totalChunks; i++) {
                if (isCancelled) break;

                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, totalRows);
                const chunk = data.slice(start, end);

                setBatchStatus(`جاري فحص الدفعة ${i + 1} من ${totalChunks}...`);

                // Client-Side Pre-validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const chunkWithIndices = chunk.map((row, idx) => ({
                    row,
                    index: start + idx
                }));

                const preValidatedResults: ValidationRowResult[] = (chunkWithIndices.map((entry) => {
                    const { row, index } = entry;
                    if (!row.email || !row.full_name) {
                        return { row: index + 1, success: false, isUpdate: false, error: 'بيانات ناقصة' };
                    }
                    if (!emailRegex.test(row.email)) {
                        return { row: index + 1, success: false, isUpdate: false, error: 'بريد غير صالح' };
                    }
                    return null;
                }) as (ValidationRowResult | null)[]).filter((r): r is ValidationRowResult => r !== null);

                // Filter out rows that failed pre-validation for server check
                const entriesToValidateOnServer = chunkWithIndices.filter((entry) => {
                    const { row } = entry;
                    return row.email && row.full_name && emailRegex.test(row.email);
                });

                try {
                    let serverResults: ValidationRowResult[] = [];
                    if (entriesToValidateOnServer.length > 0) {
                        const result = await validateImportData({ entries: entriesToValidateOnServer });
                        if (result.data) {
                            serverResults = result.data;
                        }
                    }

                    // Accumulate results silently
                    accumulatedResults.current.push(...preValidatedResults, ...serverResults);
                    setDisplayResults([...accumulatedResults.current]);

                    // Smooth progress update
                    const progressValue = Math.round(((i + 1) / totalChunks) * 100);
                    setValidationProgress(progressValue);

                    // Update stats in state to avoid reading ref during render
                    setValidationStats({
                        ready: accumulatedResults.current.filter(r => r.success && !r.isUpdate).length,
                        update: accumulatedResults.current.filter(r => r.success && r.isUpdate).length,
                        error: accumulatedResults.current.filter(r => !r.success).length
                    });
                } catch (err) {
                    console.error(`[Import] Chunk ${i} failed:`, err);
                    const errorResults = chunk.map((_, idx) => ({
                        row: start + idx + 1,
                        success: false,
                        isUpdate: false,
                        error: 'خطأ في الخادم'
                    }));
                    accumulatedResults.current.push(...errorResults);
                    setDisplayResults([...accumulatedResults.current]);

                    // Update stats on error too
                    setValidationStats({
                        ready: accumulatedResults.current.filter(r => r.success && !r.isUpdate).length,
                        update: accumulatedResults.current.filter(r => r.success && r.isUpdate).length,
                        error: accumulatedResults.current.filter(r => !r.success).length
                    });
                }
            }

            if (!isCancelled) {
                // Ensure 100% is seen and React stabilizes
                setTimeout(() => {
                    if (isCancelled) return;

                    setLoading(false);
                    const ready = accumulatedResults.current.filter(r => r.success && !r.isUpdate).length;
                    const updates = accumulatedResults.current.filter(r => r.success && r.isUpdate).length;
                    const errors = accumulatedResults.current.filter(r => !r.success).length;

                    onValidated({
                        success: errors === 0,
                        readyCount: ready,
                        updateCount: updates,
                        errorCount: errors,
                        errors: accumulatedResults.current.filter(r => !r.success).map(r => ({
                            row: r.row,
                            msg: r.error || 'خطأ غير معروف',
                            data: data[r.row - 1]
                        })),
                        summary: `تم التحقق من ${totalRows} صفوف.`
                    });
                }, 400); // Brief pause at 100% for transition
            }
        }

        runChunkedValidation();
        return () => { isCancelled = true; };
    }, [data, onValidated]);

    const filteredData = useMemo(() => {
        return data.filter(row =>
            row.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.phone?.includes(searchTerm)
        );
    }, [data, searchTerm]);

    const readyCount = validationStats.ready;
    const updateCount = validationStats.update;
    const errorCount = validationStats.error;

    const stats = [
        { label: 'إجمالي السجلات', value: data.length, icon: <RefreshCw size={14} />, color: 'bg-white/5 text-white' },
        { label: 'سجلات جديدة', value: readyCount, icon: <CheckCircle2 size={14} />, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { label: 'تحديث بيانات', value: updateCount, icon: <RefreshCw size={14} />, color: 'bg-[hsla(var(--accent-primary),.15)] text-[hsl(var(--accent-primary))] border-[hsla(var(--accent-primary),.25)]' },
        { label: 'أخطاء حرجة', value: errorCount, icon: <AlertCircle size={14} />, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-8">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex justify-between items-end mb-2">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">حالة المعالجة</span>
                        <p className="text-sm font-bold text-white transition-all">{batchStatus}</p>
                    </div>
                    <span className="text-2xl font-black text-primary tabular-nums">{validationProgress}%</span>
                </div>

                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${validationProgress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                    />
                </div>

                <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground bg-white/5 py-2 px-4 rounded-full border border-white/5">
                    <ShieldCheck size={12} className="text-primary" />
                    يتم التحقق في دفعات صغيرة لضمان استقرار الخادم
                </div>
            </div>

            {validationProgress === 100 && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setLoading(false)}
                    className="flex items-center gap-2 px-8 py-3 bg-primary text-black rounded-2xl font-black text-sm shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-all"
                >
                    مراجعة النتائج الآن
                    <ChevronRight size={18} />
                </motion.button>
            )}

            <button
                onClick={onBack}
                className="text-[10px] font-bold text-muted-foreground hover:text-rose-400 transition-colors"
            >
                إلغاء العملية والعودة
            </button>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`p-5 rounded-2xl border ${stat.color} flex flex-col gap-2`}
                    >
                        <div className="flex items-center justify-between opacity-60">
                            <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                            {stat.icon}
                        </div>
                        <span className="text-3xl font-black tabular-nums">{stat.value}</span>
                    </motion.div>
                ))}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                        type="text"
                        placeholder="ابحث بالاسم أو البريد أو رقم الجوال..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-12 pl-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>
                {errorCount > 0 && (
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold border border-white/10 transition-all">
                        <FileDown size={16} />
                        تصدير الأخطاء فقط
                    </button>
                )}
            </div>

            {/* Data Preview Table */}
            <div className="border border-white/5 rounded-3xl overflow-hidden bg-white/[0.02]">
                <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead className="sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/5 z-10">
                            <tr>
                                <th className="p-4 text-[10px] font-black text-muted uppercase tracking-tighter">الاسم</th>
                                <th className="p-4 text-[10px] font-black text-muted uppercase tracking-tighter">البريد الإلكتروني</th>
                                <th className="p-4 text-[10px] font-black text-muted uppercase tracking-tighter">الجوال</th>
                                <th className="p-4 text-[10px] font-black text-muted uppercase tracking-tighter">الدور</th>
                                <th className="p-4 text-[10px] font-black text-muted uppercase tracking-tighter text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, i) => {
                                const rowResult = displayResults.find(r => r.row === data.indexOf(row) + 1);
                                const error = rowResult?.error;
                                const isUpdate = rowResult?.isUpdate;
                                const isNew = rowResult?.success && !isUpdate;

                                return (
                                    <tr
                                        key={i}
                                        className={`border-b border-white/5 transition-colors ${error ? 'bg-rose-500/5 hover:bg-rose-500/10' : (isUpdate ? 'bg-[hsla(var(--accent-primary),.08)] hover:bg-[hsla(var(--accent-primary),.15)]' : 'hover:bg-white/5')}`}
                                    >
                                        <td className="p-4 text-sm font-bold text-white/90">{row.full_name}</td>
                                        <td className="p-4 text-xs font-mono text-muted">{row.email}</td>
                                        <td className="p-4 text-xs tabular-nums text-muted">{row.phone}</td>
                                        <td className="p-4 text-xs font-black text-primary/80 uppercase">{row.role}</td>
                                        <td className="p-4 text-center">
                                            {error ? (
                                                <div className="flex items-center justify-center gap-1 text-[8px] font-black bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full border border-rose-500/30">
                                                    <AlertCircle size={10} /> {error}
                                                </div>
                                            ) : isUpdate ? (
                                                <div className="flex items-center justify-center gap-1 text-[8px] font-black bg-[hsla(var(--accent-primary),.25)] text-[hsl(var(--accent-primary))] px-2 py-1 rounded-full border border-[hsla(var(--accent-primary),.35)]">
                                                    تحديث ملف
                                                </div>
                                            ) : isNew ? (
                                                <div className="flex items-center justify-center gap-1 text-[8px] font-black bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                                                    سجل جديد
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1 text-[8px] font-black bg-white/10 text-white/40 px-2 py-1 rounded-full border border-white/5">
                                                    غير محدد
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-3 text-muted hover:text-white transition-all text-xs font-bold"
                >
                    <ArrowLeft size={16} />
                    العودة لرفع الملف
                </button>
                <button
                    disabled={errorCount > 0}
                    onClick={onProceed}
                    className="flex items-center gap-2 px-10 py-4 bg-primary hover:bg-primary/90 text-black rounded-2xl font-black transition-all group disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/10"
                >
                    تأكيد المراجعة وبدء التنفيذ
                    <ChevronRight size={18} className="group-hover:translate-x-[-4px] transition-transform" />
                </button>
            </div>
        </div>
    );
}
