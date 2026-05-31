"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import { Upload, FileText, Shield, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export interface ImportField {
    key: string;
    label: string;
    icon?: React.ReactNode;
    required?: boolean;
    validate?: (value: string) => string | null; // returns error message or null
}

interface GlobalImportStudioProps {
    title?: string;
    description?: string;
    requiredFields: ImportField[];
    onDataReady: (data: Record<string, string>[]) => void;
}

export function GlobalImportStudio({ title, description, requiredFields, onDataReady }: GlobalImportStudioProps) {
    const [fileRows, setFileRows] = useState<Record<string, string>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [, setIsParsing] = useState(false);
    const [validationErrors, setValidationErrors] = useState<{ row: number, errors: string[] }[]>([]);
    const [previewMode, setPreviewMode] = useState(false);

    // Auto-map helpers
    const getAutoMap = (headers: string[], fields: ImportField[]) => {
        const map: Record<string, string> = {};
        headers.forEach(h => {
            const lowerH = h.toLowerCase();
            fields.forEach(f => {
                if (lowerH.includes(f.key) || lowerH.includes(f.label.toLowerCase())) {
                    map[f.key] = h;
                }
            });
        });
        return map;
    };

    const validateData = (data: Record<string, string>[], currentMapping: Record<string, string>) => {
        const errors: { row: number, errors: string[] }[] = [];
        const uniqueChecks: Record<string, Set<string>> = {};

        requiredFields.forEach(f => {
            if (f.key === 'email' || f.key === 'national_id') uniqueChecks[f.key] = new Set();
        });

        data.forEach((row, idx) => {
            const rowErrors: string[] = [];

            requiredFields.forEach(field => {
                const val = row[currentMapping[field.key]];

                // 1. Missing Required
                if (field.required && !val) {
                    rowErrors.push(`${field.label} مطلوب`);
                }

                if (val) {
                    // 2. Custom Validation
                    if (field.validate) {
                        const err = field.validate(val);
                        if (err) rowErrors.push(err);
                    }

                    // 3. Email Format
                    if (field.key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        rowErrors.push("صيغة البريد الإلكتروني غير صحيحة");
                    }

                    // 4. Global Duplicates (in this file)
                    if (uniqueChecks[field.key]) {
                        if (uniqueChecks[field.key].has(val)) {
                            rowErrors.push(`تكرار في ${field.label}`);
                        } else {
                            uniqueChecks[field.key].add(val);
                        }
                    }
                }
            });

            if (rowErrors.length > 0) {
                errors.push({ row: idx + 2, errors: rowErrors }); // +2 for header and 0-index
            }
        });

        return errors;
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        setIsParsing(true);
        setValidationErrors([]);
        setPreviewMode(false);

        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setFileRows(results.data);
                setIsParsing(false);
                if (results.meta.fields) {
                    setHeaders(results.meta.fields);
                    setMapping(getAutoMap(results.meta.fields, requiredFields));
                }
            },
            error: (err) => {
                console.error("CSV Error", err);
                setIsParsing(false);
            }
        });
    }, [requiredFields]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        multiple: false
    });

    const runValidation = () => {
        const errors = validateData(fileRows, mapping);
        setValidationErrors(errors);
        setPreviewMode(true);

        if (errors.length === 0) {
            // Transform data
            const cleanData = fileRows.map(row => {
                const obj: Record<string, string> = {};
                requiredFields.forEach(f => {
                    obj[f.key] = row[mapping[f.key]];
                });
                return obj;
            });
            onDataReady(cleanData);
        }
    };

    const reset = () => {
        setFileRows([]);
        setPreviewMode(false);
        setValidationErrors([]);
    };

    return (
        <Card className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{title || "استيراد البيانات"}</h3>
                <p className="text-muted-foreground text-sm">{description || "قم برفع ملف CSV لمعالجة البيانات"}</p>
            </div>

            {!fileRows.length ? (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Upload size={32} className={isDragActive ? 'text-primary' : 'text-muted-foreground'} />
                    </div>
                    <p className="font-bold text-lg text-foreground">سحب وإفلات الملف هنا</p>
                    <p className="text-muted-foreground text-xs">يدعم CSV, Excel</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Header: File Info & Reset */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">ملف جاهز للمعالجة</p>
                                <p className="text-xs text-muted-foreground">{fileRows.length} سجل تم العثور عليه</p>
                            </div>
                        </div>
                        <button onClick={reset} className="p-2 hover:text-destructive transition-colors text-muted-foreground" aria-label="إعادة تعيين">
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {/* Mapping Section */}
                    {!previewMode && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <h4 className="text-sm font-bold opacity-60 uppercase tracking-widest text-muted-foreground">مطابقة الأعمدة</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {requiredFields.map(f => (
                                    <div key={f.key} className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            {f.icon}
                                            <span className="text-sm font-bold text-foreground">{f.label} {f.required && <span className="text-destructive">*</span>}</span>
                                        </div>
                                        <select
                                            value={mapping[f.key] || ''}
                                            onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                                            className="bg-background border border-input rounded-lg text-xs p-2 w-[180px] outline-none focus:border-primary text-foreground"
                                            aria-label={`اختر العمود لـ ${f.label}`}
                                        >
                                            <option value="">اختر العمود...</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={runValidation}
                                    className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
                                    aria-label="فحص ومطابقة البيانات"
                                >
                                    فحص ومطابقة
                                    <Shield size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Validation Results */}
                    {previewMode && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            {validationErrors.length > 0 ? (
                                <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20">
                                    <div className="flex items-center gap-3 mb-4 text-destructive">
                                        <AlertTriangle size={24} />
                                        <h4 className="text-lg font-bold">تم العثور على {validationErrors.length} مشكلة</h4>
                                    </div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {validationErrors.map((err, idx) => (
                                            <div key={idx} className="flex gap-2 text-xs p-2 rounded bg-background/50">
                                                <span className="font-mono font-bold opacity-50 text-foreground">Row {err.row}:</span>
                                                <span className="text-destructive">{err.errors.join(", ")}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={() => setPreviewMode(false)} className="text-xs font-bold underline opacity-60 hover:opacity-100 text-foreground" aria-label="تصحيح مطابقة الأعمدة">
                                            تصحيح المطابقة
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-4">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h4 className="text-xl font-black text-emerald-500 mb-2">البيانات سليمة 100%</h4>
                                    <p className="text-sm opacity-60 mb-6 text-muted-foreground">جميع الحقول متطابقة ولا توجد أخطاء في التنسيق.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            )}
        </Card>
    );
}
