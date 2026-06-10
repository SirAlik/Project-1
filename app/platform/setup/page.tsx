'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, ShieldCheck, Building2, AlertCircle } from 'lucide-react';
import { FileEngine } from '@/components/operations/setup/FileEngine';
import { DryRunDashboard } from '@/components/operations/setup/DryRunDashboard';
import { ExecutionEngine } from '@/components/operations/setup/ExecutionEngine';
import { ImportRow, ImportResult } from '@/app/_actions/admin-import';

const steps = [
    { id: 'select', title: 'اختيار المدرسة', icon: <Building2 size={20} /> },
    { id: 'upload', title: 'رفع الملف والمطابقة', icon: <Upload size={20} /> },
    { id: 'preview', title: 'فحص البيانات (Pre-flight)', icon: <FileSpreadsheet size={20} /> },
    { id: 'execute', title: 'تنفيذ الاستيراد', icon: <ShieldCheck size={20} /> }
];

interface School {
    id: string;
    name_ar: string;
    name_en: string;
}

/**
 * Admin Setup Page - System Owner Only
 * ====================================
 * System owners must select a target school before importing.
 * For school coordinators, use /school/[id]/setup instead.
 */
export default function AdminSetupPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [parsedData, setParsedData] = useState<ImportRow[]>([]);
    const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
    const [loadingSchools, setLoadingSchools] = useState(true);

    // Fetch available schools on mount
    useEffect(() => {
        async function fetchSchools() {
            try {
                const res = await fetch('/api/platform/schools');
                if (res.ok) {
                    const data = await res.json();
                    setSchools(data.schools || []);
                }
            } catch (err) {
                console.error('Failed to fetch schools:', err);
            } finally {
                setLoadingSchools(false);
            }
        }
        fetchSchools();
    }, []);

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const handleValidated = useCallback((result: ImportResult) => {
        setValidationResult(result);
    }, []);

    const handleSchoolSelect = (schoolId: string) => {
        setSelectedSchoolId(schoolId);
        nextStep();
    };

    const selectedSchool = schools.find(s => s.id === selectedSchoolId);

    return (
        <div className="min-h-screen bg-background text-foreground p-6 lg:p-12 overflow-x-hidden" dir="rtl">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-4xl font-black text-foreground mb-2"
                    >
                        إعداد المدرسة الذكية
                    </motion.h1>
                    <p className="text-muted-foreground text-sm">
                        محرك الاستيراد الإداري - بناء الهيكل الأكاديمي والبيانات.
                        {selectedSchool && (
                            <span className="mr-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                                {selectedSchool.name_ar}
                            </span>
                        )}
                    </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-between mb-12 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2" />
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <motion.div
                                animate={{
                                    backgroundColor: index <= currentStep ? 'var(--primary)' : 'hsl(var(--muted))',
                                    scale: index === currentStep ? 1.2 : 1
                                }}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border border-border ${index <= currentStep ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                            >
                                {index < currentStep ? <CheckCircle2 size={18} /> : step.icon}
                            </motion.div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-card border border-border rounded-[2rem] p-8 min-h-[500px] relative overflow-hidden shadow-sm">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            {/* Step 0: School Selection */}
                            {currentStep === 0 && (
                                <div className="py-12">
                                    <div className="text-center mb-8">
                                        <Building2 size={48} className="mx-auto mb-4 text-primary" />
                                        <h2 className="text-2xl font-black mb-2 text-foreground">اختر المدرسة الهدف</h2>
                                        <p className="text-muted-foreground text-sm">حدد المدرسة التي تريد استيراد البيانات إليها</p>
                                    </div>

                                    {loadingSchools ? (
                                        <div className="flex justify-center">
                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : schools.length === 0 ? (
                                        <div className="text-center p-6 bg-[hsla(var(--gold),.15)] border border-[hsla(var(--gold),.25)] rounded-2xl">
                                            <AlertCircle size={32} className="mx-auto mb-3 text-[hsl(var(--gold))]" />
                                            <p className="font-bold text-[hsl(var(--gold))]">لا توجد مدارس مسجلة</p>
                                            <p className="text-sm text-muted-foreground mt-1">قم بإضافة مدرسة جديدة أولاً من لوحة التحكم</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                                            {schools.map((school) => (
                                                <button
                                                    key={school.id}
                                                    onClick={() => handleSchoolSelect(school.id)}
                                                    className="p-6 rounded-2xl border border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/30 transition-all text-right group"
                                                >
                                                    <Building2 size={24} className="mb-3 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                                                    <h3 className="font-bold text-lg text-foreground">{school.name_ar}</h3>
                                                    <p className="text-xs text-muted-foreground mt-1">{school.name_en}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 1: File Upload */}
                            {currentStep === 1 && (
                                <FileEngine
                                    onDataLoaded={(data) => {
                                        setParsedData(data);
                                        nextStep();
                                    }}
                                />
                            )}

                            {/* Step 2: DryRun Preview */}
                            {currentStep === 2 && (
                                <DryRunDashboard
                                    data={parsedData}
                                    onValidated={handleValidated}
                                    onProceed={nextStep}
                                    onBack={prevStep}
                                />
                            )}

                            {/* Step 3: Execution */}
                            {currentStep === 3 && selectedSchoolId && (
                                <ExecutionEngine
                                    data={parsedData}
                                    validation={validationResult}
                                    onBack={prevStep}
                                    schoolId={selectedSchoolId}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
