import React, { useState } from "react";
import {
    Signature,
    CheckCircle,
    FileText,
    User
} from "lucide-react";
import { BehavioralContract, StudentProfile } from "@/lib/types/student-affairs";
import { DashboardSection, EmptyState } from "@/components/dashboard";

interface Props {
    student: StudentProfile;
    contracts: BehavioralContract[];
    onSign: (contractId: string) => void;
}

export function ContractSigner({ student, contracts, onSign }: Props) {
    const [selectedContract, setSelectedContract] = useState<BehavioralContract | null>(null);

    const pendingContracts = contracts.filter(c => !c.parent_signed_at);

    return (
        <DashboardSection
            title={
                <span className="flex items-center gap-2">
                    التوقيع الإلكتروني للتعهدات
                    <span className="text-[10px] font-bold text-muted-foreground">QF71-C-6-1</span>
                </span>
            }
            icon={Signature}
        >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Pending List */}
                <div className="rounded-2xl border border-border bg-surface-soft p-5">
                    <h3 className="mb-5 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <FileText className="h-4 w-4 text-primary" /> تفاويض بانتظار التوقيع
                    </h3>

                    <div className="space-y-3">
                        {pendingContracts.length === 0 ? (
                            <EmptyState icon={CheckCircle} title="لا توجد تعهدات معلقة لهذا الطالب" tone="ok" />
                        ) : (
                            pendingContracts.map(contract => (
                                <button
                                    key={contract.id}
                                    onClick={() => setSelectedContract(contract)}
                                    className={`w-full rounded-2xl border p-4 text-right transition-colors ${selectedContract?.id === contract.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted'}`}
                                    dir="rtl"
                                >
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="text-xs font-black">تعهد سلوكي</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(contract.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="line-clamp-1 text-[10px] text-muted-foreground">بناءً على التوصية التربوية للمرشد الطلابي</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Signer Detail */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {selectedContract ? (
                        <div className="flex h-full flex-col p-6">
                            <h4 className="mb-4 text-center text-lg font-black text-foreground">محتوى التعهد</h4>
                            <div className="mb-6 flex-1 rounded-2xl border border-border bg-surface-soft p-5 text-right text-sm leading-loose text-foreground/80" dir="rtl">
                                أنا ولي أمر الطالب/ <span className="font-bold text-primary">{student.name}</span>،
                                أقر باطلاعي على المخالفة السلوكية المذكورة وأتعهد بالتعاون مع المدرسة للحد من تكرارها،
                                والالتزام بكافة اللوائح والأنظمة المنصوص عليها في لائحة السلوك والمواظبة.
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-primary">اسم ولي الأمر</p>
                                        <p className="text-sm font-bold text-foreground">{student.guardian_name || "سيتم جلب الاسم من الملف"}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (confirm("هل تؤكد التوقيع الإلكتروني على هذا التعهد؟")) {
                                            onSign(selectedContract.id);
                                            setSelectedContract(null);
                                        }
                                    }}
                                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    <Signature className="h-5 w-5" />
                                    تأكيد التوقيع الرقمي
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-[400px] flex-col items-center justify-center p-8 text-center">
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface-soft text-muted-foreground">
                                <FileText className="h-10 w-10" />
                            </div>
                            <h4 className="mb-2 font-black uppercase tracking-widest text-muted-foreground">جهة التوقيع</h4>
                            <p className="max-w-[200px] text-xs text-muted-foreground">اختر أحد التعهدات من القائمة الجانبية للمراجعة والتوقيع</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardSection>
    );
}
