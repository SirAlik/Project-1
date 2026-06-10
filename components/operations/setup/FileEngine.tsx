'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { motion } from 'framer-motion';
import { Upload, ChevronRight, Mail, User, Phone, Shield } from 'lucide-react';
import { ImportRow } from '@/app/_actions/admin-import';

interface FileEngineProps {
    onDataLoaded: (data: ImportRow[]) => void;
}

const REQUIRED_FIELDS = [
    { key: 'full_name', label: 'الاسم الكامل', icon: <User size={14} /> },
    { key: 'email', label: 'البريد الإلكتروني', icon: <Mail size={14} /> },
    { key: 'phone', label: 'رقم الجوال', icon: <Phone size={14} /> },
    { key: 'role', label: 'الدور (student/teacher)', icon: <Shield size={14} /> }
];

export function FileEngine({ onDataLoaded }: FileEngineProps) {
    const [fileRows, setFileRows] = useState<Record<string, string>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isParsing, setIsParsing] = useState(false);
    const parserRef = useRef<{ abort: () => void } | null>(null);

    const clearState = useCallback(() => {
        if (parserRef.current) parserRef.current.abort();
        setFileRows([]);
        setHeaders([]);
        setMapping({});
        setIsParsing(false);
    }, []);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Clear previous state completely
        clearState();

        const file = acceptedFiles[0];
        setIsParsing(true);

        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            worker: true,
            complete: (results) => {
                setFileRows(results.data);
                setIsParsing(false);
                if (results.meta.fields) {
                    setHeaders(results.meta.fields);
                    const autoMap: Record<string, string> = {};
                    results.meta.fields.forEach(h => {
                        const lowH = h.toLowerCase();
                        if (lowH.includes('name')) autoMap['full_name'] = h;
                        if (lowH.includes('email')) autoMap['email'] = h;
                        if (lowH.includes('phone') || lowH.includes('mobile') || lowH.includes('جوال')) autoMap['phone'] = h;
                        if (lowH.includes('role')) autoMap['role'] = h;
                        if (lowH.includes('parent')) autoMap['parent_phone'] = h;
                    });
                    setMapping(autoMap);
                }
            },
            error: (err) => {
                console.error('CSV Parsing Error:', err);
                setIsParsing(false);
            }
        });
    }, [clearState]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false
    });

    const handleProceed = () => {
        const formattedData = fileRows.map((row) => ({
            full_name: row[mapping['full_name']],
            email: row[mapping['email']],
            phone: row[mapping['phone']] || '',
            role: row[mapping['role']] || 'student',
            parent_phone: row[mapping['parent_phone']] || ''
        }));
        onDataLoaded(formattedData as ImportRow[]);
    };

    return (
        <div className="space-y-8">
            {isParsing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-bold text-primary animate-pulse">جاري قراءة الملف...</p>
                </div>
            ) : fileRows.length === 0 ? (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center transition-all ${isDragActive ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20'}`}
                >
                    <input {...getInputProps()} aria-label="رفع ملف البيانات" />
                    <motion.div
                        animate={{ y: isDragActive ? -10 : 0 }}
                        className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6"
                    >
                        <Upload size={40} className={isDragActive ? 'text-primary' : 'text-white/40'} />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-2">قم بسحب ملف الـ CSV المخصص للمدرسة</h3>
                    <p className="text-muted text-sm text-center max-w-sm">أو اضغط هنا لاختيار الملف من جهازك. تأكد من احتواء الملف على الأسماء والبريد الإلكتروني والسجل المدني.</p>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold">مطابقة الأعمدة</h3>
                            <p className="text-xs text-muted">قم بربط رؤوس الملف مع حقول النظام الأساسية</p>
                        </div>
                        <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20">
                            تم العثور على {fileRows.length} صف
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {REQUIRED_FIELDS.map(field => (
                            <div key={field.key} className="glass-panel p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                                        {field.icon}
                                    </div>
                                    <span className="text-sm font-bold">{field.label}</span>
                                </div>
                                <select
                                    value={mapping[field.key] || ''}
                                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                    className="bg-black/40 border border-white/10 rounded-lg text-xs p-2 focus:ring-1 focus:ring-primary outline-none"
                                    aria-label={`اختر عمود لـ ${field.label}`}
                                >
                                    <option value="">اختر العمود...</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-6">
                        <button
                            onClick={handleProceed}
                            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-black rounded-2xl font-black transition-all group shadow-lg shadow-primary/10"
                            aria-label="تأكيد المطابقة والمتابعة"
                        >
                            تأكيد المطابقة والمتابعة
                            <ChevronRight size={18} className="group-hover:translate-x-[-4px] transition-transform" />
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
