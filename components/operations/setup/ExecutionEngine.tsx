'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImportRow, ImportResult, executeImport } from '@/app/_actions/admin-import';
import { CheckCircle2, Printer, ShieldCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ExecutionEngineProps {
    data: ImportRow[];
    validation: ImportResult | null;
    onBack: () => void;
    /** Required: School ID for multi-tenant import */
    schoolId?: string;
}

export function ExecutionEngine({ data, validation, onBack, schoolId }: ExecutionEngineProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [resultCount, setResultCount] = useState({ created: 0, updated: 0, errors: 0 });

    const handleStart = async () => {
        setStatus('running');
        // Simple chunking for progress simulation (since real EventSource is overkill for this mock-up level)
        const chunkSize = 10;
        let localCreated = 0;
        let localUpdated = 0;
        let localErrors = 0;

        // Require schoolId for multi-tenant imports
        if (!schoolId) {
            console.error('[ExecutionEngine] No schoolId provided!');
            setStatus('error');
            return;
        }

        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            // Call the new multi-tenant executeImport with schoolId
            const result = await executeImport({ rows: chunk, schoolId });

            if (result.data) {
                localCreated += result.data.created;
                localUpdated += result.data.updated;
                localErrors += result.data.errors;
            } else if (result.serverError) {
                console.error('[ExecutionEngine] Server error:', result.serverError);
                localErrors += chunk.length;
            }

            setResultCount({ created: localCreated, updated: localUpdated, errors: localErrors });
            setProgress(Math.round(((i + chunk.length) / data.length) * 100));
        }

        setStatus('completed');
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("Sidra — Login Cards", 105, 20, { align: "center" });

        let y = 40;
        data.forEach((student, index) => {
            if (index > 0 && index % 4 === 0) {
                doc.addPage();
                y = 40;
            }

            doc.setDrawColor(200, 200, 200);
            doc.rect(10, y, 190, 40);
            doc.setFontSize(14);
            doc.text(`Name: ${student.full_name}`, 20, y + 10);
            doc.setFontSize(10);
            doc.text(`Email: ${student.email}`, 20, y + 20);
            doc.text(`Temp Password: ChangeMe123!`, 20, y + 25);
            doc.text(`Role: ${student.role}`, 20, y + 30);

            y += 50;
        });

        doc.save('school_login_cards.pdf');
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-8">
            {status === 'idle' && (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-6"
                >
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
                        <ShieldCheck size={48} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black">هل أنت جاهز لبدء التنفيذ؟</h3>
                        <p className="text-muted text-sm max-w-md mx-auto mt-2">
                            سيتم إنشاء {validation?.readyCount} حساب جديد وتحديث {validation?.updateCount} ملف شخصي. لا يمكن التراجع عن هذه العملية.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 justify-center">
                        <button onClick={onBack} className="px-8 py-3 text-muted hover:text-white font-bold transition-all">إلغاء</button>
                        <button
                            onClick={handleStart}
                            className="px-12 py-3 bg-primary text-black font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                        >
                            ابدأ التنفيذ الآن
                        </button>
                    </div>
                </motion.div>
            )}

            {status === 'running' && (
                <div className="w-full max-w-md space-y-6 text-center">
                    <div className="relative w-48 h-48 mx-auto">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle className="text-white/5 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                            <motion.circle
                                className="text-primary stroke-current"
                                strokeWidth="8"
                                strokeLinecap="round"
                                fill="transparent"
                                r="40" cx="50" cy="50"
                                initial={{ strokeDasharray: "0 251" }}
                                animate={{ strokeDasharray: `${(progress / 100) * 251} 251` }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black tabular-nums">{progress}%</span>
                            <span className="text-[10px] uppercase font-bold text-muted">قيد المزامنة</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold">جاري إنشاء الحسابات...</h4>
                        <p className="text-[10px] text-muted font-mono uppercase">Sentinel Auth Connector: Active</p>
                    </div>
                </div>
            )}

            {status === 'completed' && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center space-y-8 w-full max-w-2xl"
                >
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
                        <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black text-green-400">اكتمل الاستيراد بنجاح!</h3>
                        <p className="text-muted">تم تنفيذ كافة العمليات وتحديث سجلات الطلاب والمعلمين.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-blue-400">{resultCount.created}</span>
                            <span className="text-[10px] font-bold text-muted uppercase">مستخدم جديد</span>
                        </div>
                        <div className="text-center border-x border-white/10">
                            <span className="block text-2xl font-black text-[hsl(var(--accent-primary))]">{resultCount.updated}</span>
                            <span className="text-[10px] font-bold text-muted uppercase">تم تحديثهم</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-black text-rose-400">{resultCount.errors}</span>
                            <span className="text-[10px] font-bold text-muted uppercase">فشل</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4">
                        <button
                            onClick={generatePDF}
                            className="flex items-center gap-3 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all w-full sm:w-auto"
                        >
                            <Printer size={20} />
                            طباعة بطاقات الدخول (PDF)
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 transition-all w-full sm:w-auto"
                        >
                            بدء دورة إعداد جديدة
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
