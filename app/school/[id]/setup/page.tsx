'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FileEngine } from '@/components/operations/setup/FileEngine';
import { DryRunDashboard } from '@/components/operations/setup/DryRunDashboard';
import { ExecutionEngine } from '@/components/operations/setup/ExecutionEngine';
import { ImportRow, ImportResult } from '@/app/_actions/admin-import';
import { useParams } from 'next/navigation';

const steps = [
    { id: 'upload', title: 'رفع الملف والمطابقة', icon: <Upload size={20} /> },
    { id: 'preview', title: 'فحص البيانات (Pre-flight)', icon: <FileSpreadsheet size={20} /> },
    { id: 'execute', title: 'تنفيذ الاستيراد', icon: <ShieldCheck size={20} /> }
];

export default function SchoolSetupPage() {
    const params = useParams();
    const schoolId = params.id as string;

    const [currentStep, setCurrentStep] = useState(0);
    const [parsedData, setParsedData] = useState<ImportRow[]>([]);
    const [validationResult, setValidationResult] = useState<ImportResult | null>(null);

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const handleValidated = useCallback((result: ImportResult) => {
        setValidationResult(result);
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6 lg:p-12 overflow-x-hidden" dir="rtl">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2"
                    >
                        إعداد المدرسة الذكية
                    </motion.h1>
                    <p className="text-muted text-sm">محرك الاستيراد - رفع بيانات الطلاب والمعلمين.
                        <span className="mr-2 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20">
                            School ID: {schoolId?.slice(0, 8)}...
                        </span>
                    </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-between mb-12 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -z-10 -translate-y-1/2" />
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <motion.div
                                animate={{
                                    backgroundColor: index <= currentStep ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    scale: index === currentStep ? 1.2 : 1
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border border-stone-200 ${index <= currentStep ? 'text-black' : 'text-stone-400'}`}
                            >
                                {index < currentStep ? <CheckCircle2 size={18} /> : step.icon}
                            </motion.div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${index <= currentStep ? 'text-primary' : 'text-stone-400'}`}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="glass-panel p-8 min-h-[500px] relative overflow-hidden backdrop-blur-3xl border-stone-200">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            {currentStep === 0 && (
                                <FileEngine
                                    onDataLoaded={(data) => {
                                        setParsedData(data);
                                        nextStep();
                                    }}
                                />
                            )}
                            {currentStep === 1 && (
                                <DryRunDashboard
                                    data={parsedData}
                                    onValidated={handleValidated}
                                    onProceed={nextStep}
                                    onBack={prevStep}
                                />
                            )}
                            {currentStep === 2 && (
                                <ExecutionEngine
                                    data={parsedData}
                                    validation={validationResult}
                                    onBack={prevStep}
                                    schoolId={schoolId}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
