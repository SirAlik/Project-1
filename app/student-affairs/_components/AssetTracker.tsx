import React, { useState } from "react";
import {
    Book,
    Plus,
    ArrowRightLeft,
    Search,
    User,
    RefreshCw
} from "lucide-react";
import { StudentProfile, StudentAsset } from "@/lib/types/student-affairs";
import { DashboardSection } from "@/components/dashboard";

interface Props {
    students: StudentProfile[];
    assets: StudentAsset[];
    onIssue: (studentId: string, assetName: string) => void;
    onReturn: (assetId: string, condition: string) => void;
}

export function AssetTracker({ students, assets, onIssue, onReturn }: Props) {
    const [search, setSearch] = useState("");
    const [isIssuing, setIsIssuing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState("");
    const [assetName, setAssetName] = useState("");

    const filteredAssets = assets.filter(a =>
        a.student?.name.toLowerCase().includes(search.toLowerCase()) ||
        a.asset_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <DashboardSection
                title={
                    <span className="flex items-center gap-2">
                        متتبع العهد والكتب
                        <span className="text-[10px] font-bold text-muted-foreground">QF71-C-3-1</span>
                    </span>
                }
                icon={Book}
                action={
                    <div className="flex w-full items-center gap-3 md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="بحث عن عهدة أو طالب..."
                                className="w-full rounded-2xl border border-border bg-surface-soft py-3 pr-12 pl-10 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <button
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
                                aria-label="تحديث القائمة"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsIssuing(true)}
                            className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            aria-label="تسليم عهدة جديدة"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                }
            >
                {/* Assets Table */}
                <div className="overflow-x-auto rounded-xl border border-border text-right" dir="rtl">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-soft">
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">الطالب</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">العهدة / الكتاب</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">تاريخ الاستلام</th>
                                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">الحالة</th>
                                <th className="p-4 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">العمليات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAssets.map(asset => (
                                <tr key={asset.id} className="transition-colors hover:bg-muted/60">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-soft text-muted-foreground">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-bold text-foreground">{asset.student?.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-medium text-foreground">{asset.asset_name}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs text-muted-foreground">{asset.handover_date}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${asset.status === 'assigned' ? 'bg-primary/10 text-primary' :
                                            asset.status === 'returned' ? 'bg-success/10 text-success' :
                                                'bg-destructive/10 text-destructive'
                                            }`}>
                                            {asset.status === 'assigned' ? 'بانتظار العودة' :
                                                asset.status === 'returned' ? 'تمت العودة' : 'مفقود'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-left">
                                        {asset.status === 'assigned' && (
                                            <button
                                                onClick={() => {
                                                    const condition = prompt("حالة العهدة عند الإرجاع (مثال: سليمة، تالفة):");
                                                    if (condition) onReturn(asset.id, condition);
                                                }}
                                                className="rounded-2xl border border-border bg-surface-soft p-3 text-muted-foreground transition-colors hover:border-success/50 hover:text-success"
                                                title="إرجاع العهدة"
                                                aria-label={`إرجاع العهدة ${asset.asset_name} من ${asset.student?.name}`}
                                            >
                                                <ArrowRightLeft className="h-4 w-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DashboardSection>

            {/* Issue Asset Modal */}
            {isIssuing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" dir="rtl">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                        <h3 className="mb-6 text-lg font-black text-foreground">تسليم عهدة جديدة</h3>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="px-1 text-[11px] font-bold text-muted-foreground">اختر الطالب</label>
                                <select
                                    className="w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                    aria-label="اختر الطالب"
                                >
                                    <option value="">اختر الطالب...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="px-1 text-[11px] font-bold text-muted-foreground">اسم العهدة / الكتاب</label>
                                <input
                                    className="w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    placeholder="اسم الكتاب / العهدة"
                                    value={assetName}
                                    onChange={(e) => setAssetName(e.target.value)}
                                    aria-label="اسم العهدة أو الكتاب"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsIssuing(false)}
                                    className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                                    aria-label="إلغاء التسليم"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedStudent && assetName) {
                                            onIssue(selectedStudent, assetName);
                                            setIsIssuing(false);
                                            setAssetName("");
                                        }
                                    }}
                                    className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                                    disabled={!selectedStudent || !assetName}
                                >
                                    تأكيد التسليم
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
