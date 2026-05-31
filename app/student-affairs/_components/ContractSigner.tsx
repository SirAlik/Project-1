import React, { useState } from "react";
import {
    Signature,
    CheckCircle,
    FileText,
    User
} from "lucide-react";
import { BehavioralContract, StudentProfile } from "@/lib/types/student-affairs";

interface Props {
    student: StudentProfile;
    contracts: BehavioralContract[];
    onSign: (contractId: string) => void;
}

export function ContractSigner({ student, contracts, onSign }: Props) {
    const [selectedContract, setSelectedContract] = useState<BehavioralContract | null>(null);

    const pendingContracts = contracts.filter(c => !c.parent_signed_at);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4 bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800">
                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-3xl border border-emerald-500/20">
                    <Signature className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white">التوقيع الإلكتروني للتعهدات</h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Digital Behavioral Contracts (QF71-C-6-1)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending List */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6 backdrop-blur-md">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> تفاويض بانتظار التوقيع
                    </h3>

                    <div className="space-y-3">
                        {pendingContracts.length === 0 ? (
                            <div className="text-center py-12 border border-zinc-800 border-dashed rounded-[2rem]">
                                <CheckCircle className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                                <p className="text-xs text-zinc-600 font-bold">لا توجد تعهدات معلقة لهذا الطالب</p>
                            </div>
                        ) : (
                            pendingContracts.map(contract => (
                                <button
                                    key={contract.id}
                                    onClick={() => setSelectedContract(contract)}
                                    className={`w-full text-right p-4 rounded-2xl border transition-all ${selectedContract?.id === contract.id ? 'bg-indigo-500/10 border-indigo-500/50 text-white' : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                                    dir="rtl"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black">تعهد سلوكي</span>
                                        <span className="text-[10px] opacity-60">{new Date(contract.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[10px] line-clamp-1 opacity-50">بناءً على التوصية التربوية للمرشد الطلابي</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Signer Detail */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                    {selectedContract ? (
                        <div className="p-8 flex flex-col h-full">
                            <h4 className="text-lg font-black text-white mb-4 text-center">محتوى التعهد</h4>
                            <div className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 text-right leading-loose text-zinc-300 text-sm mb-6" dir="rtl">
                                أنا ولي أمر الطالب/ <span className="text-indigo-400 font-bold">{student.name}</span>،
                                أقر باطلاعي على المخالفة السلوكية المذكورة وأتعهد بالتعاون مع المدرسة للحد من تكرارها،
                                والالتزام بكافة اللوائح والأنظمة المنصوص عليها في لائحة السلوك والمواظبة.
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase">اسم ولي الأمر</p>
                                        <p className="text-sm font-bold text-white">{student.guardian_name || "سيتم جلب الاسم من الملف"}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (confirm("هل تؤكد التوقيع الإلكتروني على هذا التعهد؟")) {
                                            onSign(selectedContract.id);
                                            setSelectedContract(null);
                                        }
                                    }}
                                    className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
                                >
                                    <Signature className="w-5 h-5" />
                                    تأكيد التوقيع الرقمي (Sign Contract)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 bg-zinc-950 rounded-[2rem] border border-zinc-800 flex items-center justify-center text-zinc-800 mb-6">
                                <FileText className="w-10 h-10" />
                            </div>
                            <h4 className="text-zinc-500 font-black uppercase tracking-widest mb-2">جهة التوقيع</h4>
                            <p className="text-xs text-zinc-700 max-w-[200px]">اختر أحد التعهدات من القائمة الجانبية للمراجعة والتوقيع</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
