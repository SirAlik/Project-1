"use client";

import React, { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { bulkInsertStudentsDirect } from "../_actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    classes: { id: string; name: string }[];
}

export function BulkUploadModal({ isOpen, onClose, onSuccess, classes }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const parseCSV = (text: string): Record<string, string>[] => {
        const lines = text.split("\n");
        const headers = lines[0].split(",").map(h => h.trim());

        return lines.slice(1).map(line => {
            const values = line.split(",").map(v => v.trim());
            const obj: Record<string, string> = {};
            headers.forEach((header, i) => {
                obj[header] = values[i] ?? '';
            });
            return obj;
        }).filter(item => item["name"]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setResults(null);

        try {
            const text = await file.text();
            const data = parseCSV(text);

            const errors: string[] = [];
            const rowsToInsert: {
                name: string;
                national_id?: string;
                class_id: string;
                grade_level?: number;
            }[] = [];

            // مطابقة الفصل من اسمه — لا تزال عملية العرض على الخادم
            for (const row of data) {
                const className = row.classroom || row.class || "4/1";
                const classroom = classes.find(
                    c => c.name.includes(className) || className.includes(c.name)
                );

                if (!classroom) {
                    errors.push(`الفصل "${className}" غير موجود للطالب ${row.name}`);
                    continue;
                }

                rowsToInsert.push({
                    name:        row.name,
                    national_id: row.national_id || undefined,
                    class_id:    classroom.id,
                    grade_level: 4, // صف رابع حسب المتطلب المحدد
                });
            }

            // الإدراج عبر Server Action مع school_id تلقائياً من الـ persona
            if (rowsToInsert.length > 0) {
                const result = await bulkInsertStudentsDirect(rowsToInsert);
                errors.push(...result.errors);
                setResults({ success: result.success, errors });
                if (result.success > 0) onSuccess();
            } else {
                setResults({ success: 0, errors });
            }
        } catch (e: unknown) {
            setResults({
                success: 0,
                errors: [e instanceof Error ? e.message : String(e)],
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-200/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white border border-stone-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-white/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[hsla(var(--accent-primary),.20)] flex items-center justify-center border border-[hsla(var(--accent-primary),.20)]">
                            <Upload className="w-5 h-5 text-[hsl(var(--accent-primary))]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-stone-800">استيراد جماعي (CSV)</h2>
                            <p className="text-xs text-stone-500 font-bold">لطلاب الصف الرابع</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                        aria-label="إغلاق النافذة"
                    >
                        <X size={20} className="text-stone-500" />
                    </button>
                </div>

                <div className="p-8">
                    {results ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                {results.success > 0 ? (
                                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                ) : (
                                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                                )}
                                <h3 className="text-xl font-bold">نتائج الاستيراد</h3>
                                <p className="text-stone-500 mt-2">تم استيراد {results.success} طالباً بنجاح</p>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="max-h-40 overflow-y-auto bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-2">
                                    <p className="text-xs font-bold text-rose-400">تنبيهات ({results.errors.length}):</p>
                                    {results.errors.map((err, i) => (
                                        <p key={i} className="text-xs text-rose-300/70 border-b border-rose-500/10 pb-1 flex items-start gap-2">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                                            {err}
                                        </p>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-2xl border border-stone-200 transition-all"
                            >
                                إغلاق
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-stone-300 rounded-2xl p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors"
                            >
                                <FileText className="w-12 h-12 text-stone-500 mx-auto mb-3" />
                                <p className="text-stone-500 font-medium">
                                    {file ? file.name : "اضغط لاختيار ملف CSV"}
                                </p>
                                <p className="text-stone-500 text-xs mt-1">
                                    الأعمدة المطلوبة: name, classroom, national_id (اختياري)
                                </p>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="w-full bg-[hsl(var(--accent-primary))] hover:opacity-90 text-black font-bold py-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> جاري الاستيراد...</>
                                ) : (
                                    <><Upload className="w-4 h-4" /> استيراد الطلاب</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
