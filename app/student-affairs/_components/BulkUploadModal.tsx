"use client";

import React, { useState, useRef } from "react";
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/db/supabase";

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

    const parseCSV = (text: string) => {
        const lines = text.split("\n");
        const headers = lines[0].split(",").map(h => h.trim());

        return lines.slice(1).map(line => {
            const values = line.split(",").map(v => v.trim());
            const obj: Record<string, string> = {};
            headers.forEach((header, i) => {
                obj[header] = values[i];
            });
            return obj;
        }).filter(item => item["name"]); // Filter empty rows
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setResults(null);

        try {
            const text = await file.text();
            const data = parseCSV(text);

            let successCount = 0;
            const errors: string[] = [];

            // Identify table name
            const tryFetch = async (names: string[]): Promise<string> => {
                for (const n of names) {
                    const { error } = await supabase.from(n).select("id").limit(1);
                    if (!error) return n;
                }
                return "students";
            };
            const tableName = await tryFetch(["student_profiles", "students"]);

            for (const row of data) {
                try {
                    // 1. Find classroom ID
                    const className = row.classroom || row.class || "4/1"; // Fallback
                    const classroom = classes.find(c => c.name.includes(className) || className.includes(c.name));

                    if (!classroom) {
                        errors.push(`الفصل "${className}" غير موجود للطالب ${row.name}`);
                        continue;
                    }

                    // 2. Insert Student
                    const { error } = await supabase.from(tableName).insert([{
                        name: row.name,
                        national_id: row.national_id || null,
                        class_id: classroom.id,
                        grade_level: 4 // Specifically for 4th Grade as requested
                    }]);

                    if (error) throw error;
                    successCount++;
                } catch (e: unknown) {
                    errors.push(`خطأ في الطالب ${row["name"]}: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            setResults({ success: successCount, errors });
            if (successCount > 0) onSuccess();
        } catch (e: unknown) {
            setResults({ success: 0, errors: [e instanceof Error ? e.message : String(e)] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[hsla(var(--gold),.20)] flex items-center justify-center border border-[hsla(var(--gold),.20)]">
                            <Upload className="w-5 h-5 text-[hsl(var(--gold))]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-100">استيراد جماعي (CSV)</h2>
                            <p className="text-xs text-zinc-500 font-bold">لطلاب الصف الرابع</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="إغلاق النافذة">
                        <X size={20} className="text-zinc-500" />
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
                                <p className="text-zinc-400 mt-2">تم استيراد {results.success} طالباً بنجاح</p>
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
                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-2xl border border-zinc-800 transition-all font-bold"
                            >
                                إغلاق
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="border-2 border-dashed border-zinc-800 rounded-3xl p-10 text-center hover:border-[hsla(var(--gold),.50)] transition-all group relative cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    accept=".csv,.xlsx"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    id="file-upload"
                                    aria-label="رفع ملف المخالفات"
                                />
                                <Upload className={`w-12 h-12 mx-auto mb-4 transition-all ${file ? 'text-[hsl(var(--gold))]' : 'text-zinc-700'}`} />
                                <h3 className="text-lg font-bold text-zinc-300">{file ? file.name : 'اسحب ملف CSV هنا'}</h3>
                                <p className="text-xs text-zinc-500 mt-2">يجب أن يحتوي الملف على أعمدة (name, classroom)</p>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="w-full bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-4 rounded-2xl shadow-lg shadow-[hsla(var(--gold),.10)] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        جاري المعالجة والرفع...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-5 h-5" />
                                        بدء عملية الاستيراد
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
