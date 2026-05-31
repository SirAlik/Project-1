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
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/20">
                        <Book className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">متتبع العهد والكتب</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Asset Tracking (QF71-C-3-1)</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search assets or students..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                            aria-label="تحديث القائمة"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsIssuing(true)}
                        className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                        aria-label="Issue new asset" // Added aria-label
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Assets Table */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-[3rem] overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto text-right" dir="rtl">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-zinc-950/50 border-b border-zinc-800">
                                <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">الطالب</th>
                                <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">العهدة / الكتاب</th>
                                <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">تاريخ الاستلام</th>
                                <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest">الحالة</th>
                                <th className="p-6 text-xs font-black text-zinc-500 uppercase tracking-widest text-left">العمليات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredAssets.map(asset => (
                                <tr key={asset.id} className="group hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-600">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-white">{asset.student?.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-sm font-medium text-zinc-300">{asset.asset_name}</span>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-xs text-zinc-500 font-mono">{asset.handover_date}</span>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${asset.status === 'assigned' ? 'bg-indigo-500/10 text-indigo-400' :
                                            asset.status === 'returned' ? 'bg-emerald-500/10 text-emerald-400' :
                                                'bg-rose-500/10 text-rose-400'
                                            }`}>
                                            {asset.status === 'assigned' ? 'بانتظار العودة' :
                                                asset.status === 'returned' ? 'تمت العودة' : 'مفقود'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-left">
                                        {asset.status === 'assigned' && (
                                            <button
                                                onClick={() => {
                                                    const condition = prompt("Condition on return (e.g. Good, Damaged):");
                                                    if (condition) onReturn(asset.id, condition);
                                                }}
                                                className="p-3 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-emerald-500 transition-all rounded-2xl border border-zinc-800"
                                                title="Return Asset"
                                                aria-label={`Return asset ${asset.asset_name} from ${asset.student?.name}`}
                                            >
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Issue Asset Modal */}
            {isIssuing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-6">تسليم عهدة جديدة</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase px-2">اختر الطالب</label>
                                <select
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                    aria-label="Select student"
                                >
                                    <option value="">Select Student...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase px-2">اسم العهدة / الكتاب</label>
                                <input
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Book Name / Asset Name"
                                    value={assetName}
                                    onChange={(e) => setAssetName(e.target.value)}
                                    aria-label="Asset name or book name"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsIssuing(false)}
                                    className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl font-bold text-sm hover:bg-zinc-700"
                                    aria-label="Cancel asset issuance"
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
                                    className="flex-1 bg-indigo-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
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
