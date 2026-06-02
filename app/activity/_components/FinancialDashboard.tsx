import React, { useState } from "react";
import {
    Plus,
    Trash2,
    Receipt,
    Wallet,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Calendar
} from "lucide-react";
import { ActivityFinancial } from "@/lib/types/activity";
import type { FinancialInput } from "@/app/activity/_hooks/useActivities";

type FinancialTab = "summary" | "budget" | "expenses";

interface FinancialDashboardProps {
    financials: ActivityFinancial[];
    stats: {
        totalBudget: number;
        totalExpenses: number;
        expenseRatio: number;
    };
    onAddBudget: (item: FinancialInput) => void;
    onAddExpense: (expense: FinancialInput) => void;
    onDelete: (id: string) => void;
}

export function FinancialDashboard({
    financials,
    stats,
    onAddBudget,
    onAddExpense,
    onDelete
}: FinancialDashboardProps) {
    const [activeTab, setActiveTab] = useState<FinancialTab>("summary");
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    const budgetItems = financials.filter(f => f.type === 'budget');
    const expenses = financials.filter(f => f.type === 'expense');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/80 border border-stone-200 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Wallet className="w-5 h-5 text-blue-400" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-stone-500" />
                    </div>
                    <p className="text-sm font-bold text-stone-500">إجمالي الميزانية المعتمدة</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-black text-foreground">{stats.totalBudget.toLocaleString()}</h3>
                        <span className="text-xs text-stone-500 font-bold">ريال</span>
                    </div>
                </div>

                <div className="bg-white/80 border border-stone-200 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-rose-500/10 rounded-xl">
                            <Receipt className="w-5 h-5 text-rose-400" />
                        </div>
                        <ArrowDownRight className="w-4 h-4 text-stone-500" />
                    </div>
                    <p className="text-sm font-bold text-stone-500">إجمالي المصروفات</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-black text-foreground">{stats.totalExpenses.toLocaleString()}</h3>
                        <span className="text-xs text-stone-500 font-bold">ريال</span>
                    </div>
                </div>

                <div className="bg-white/80 border border-stone-200 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <PieChart className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                            {stats.expenseRatio.toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-sm font-bold text-stone-500">نسبة الاستهلاك</p>
                    <div className="w-full bg-stone-200 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-emerald-500 h-full transition-all duration-1000"
                            style={{ width: `${Math.min(stats.expenseRatio, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white/80 border border-stone-200 rounded-3xl p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 p-1 bg-white rounded-2xl border border-stone-200">
                        {[
                            { id: "summary", label: "نظرة عامة" },
                            { id: "budget", label: "بنود الميزانية" },
                            { id: "expenses", label: "سجل المصروفات" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as FinancialTab)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id
                                    ? "bg-[hsla(var(--gold),.20)] text-[hsl(var(--gold))] shadow-inner"
                                    : "text-stone-500 hover:text-stone-600"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowBudgetModal(true)}
                            className="flex items-center gap-2 bg-stone-200 hover:bg-stone-300 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة بند ميزانية
                        </button>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="flex items-center gap-2 bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-[hsla(var(--gold),.20)]"
                        >
                            <Receipt className="w-4 h-4" />
                            تسجيل مصروف
                        </button>
                    </div>
                </div>

                {activeTab === "summary" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-stone-500 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> أحدث بنود الميزانية
                                </h4>
                                <div className="space-y-2">
                                    {budgetItems.slice(0, 3).map(item => (
                                        <div key={item.id} className="p-4 bg-white/80 border border-stone-200 rounded-2xl flex justify-between items-center">
                                            <div>
                                                <p className="text-xs font-bold text-foreground">{item.item_name}</p>
                                                <p className="text-[10px] text-stone-500">{item.category}</p>
                                            </div>
                                            <div className="text-left font-black text-blue-400">{item.amount.toLocaleString()} <span className="text-[10px] text-stone-500">ر.س</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-stone-500 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> أحدث المصروفات
                                </h4>
                                <div className="space-y-2">
                                    {expenses.slice(0, 3).map(item => (
                                        <div key={item.id} className="p-4 bg-white/80 border border-stone-200 rounded-2xl flex justify-between items-center">
                                            <div>
                                                <p className="text-xs font-bold text-foreground">{item.item_name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-500">{item.date}</span>
                                                    <span className="text-[8px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded uppercase">{item.invoice_number || 'بدون فاتورة'}</span>
                                                </div>
                                            </div>
                                            <div className="text-left font-black text-rose-400">{item.amount.toLocaleString()} <span className="text-[10px] text-stone-500">ر.س</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "budget" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-stone-500 text-[10px] font-black uppercase tracking-widest px-4">
                                    <th className="pb-4 pr-6">البند</th>
                                    <th className="pb-4">الفئة</th>
                                    <th className="pb-4">المبلغ المعتمد</th>
                                    <th className="pb-4">التاريخ</th>
                                    <th className="pb-4 text-left pl-6">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgetItems.map(item => (
                                    <tr key={item.id} className="bg-white/80 hover:bg-white/80 transition-colors group">
                                        <td className="py-4 pr-6 rounded-r-2xl border-y border-r border-stone-200">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <Wallet className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                                <span className="text-xs font-bold text-stone-700">{item.item_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-xs text-stone-500 font-medium border-y border-stone-200">{item.category}</td>
                                        <td className="py-4 text-xs font-black text-foreground border-y border-stone-200 tracking-wide">{item.amount.toLocaleString()}</td>
                                        <td className="py-4 text-xs text-stone-500 border-y border-stone-200">{item.date}</td>
                                        <td className="py-4 text-left pl-6 rounded-l-2xl border-y border-l border-stone-200">
                                            <button
                                                onClick={() => onDelete(item.id)}
                                                className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                                aria-label="حذف البند"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "expenses" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-stone-500 text-[10px] font-black uppercase tracking-widest px-4">
                                    <th className="pb-4 pr-6">المصروف</th>
                                    <th className="pb-4">رقم الفاتورة</th>
                                    <th className="pb-4">المبلغ</th>
                                    <th className="pb-4">التاريخ</th>
                                    <th className="pb-4 text-left pl-6">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map(item => (
                                    <tr key={item.id} className="bg-white/80 hover:bg-white/80 transition-colors group">
                                        <td className="py-4 pr-6 rounded-r-2xl border-y border-r border-stone-200">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-rose-500/10 rounded-lg">
                                                    <Receipt className="w-3.5 h-3.5 text-rose-400" />
                                                </div>
                                                <span className="text-xs font-bold text-stone-700">{item.item_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-[10px] font-mono text-stone-500 border-y border-stone-200">{item.invoice_number || '---'}</td>
                                        <td className="py-4 text-xs font-black text-foreground border-y border-stone-200 tracking-wide">{item.amount.toLocaleString()}</td>
                                        <td className="py-4 text-xs text-stone-500 border-y border-stone-200">{item.date}</td>
                                        <td className="py-4 text-left pl-6 rounded-l-2xl border-y border-l border-stone-200">
                                            <button
                                                onClick={() => onDelete(item.id)}
                                                className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                                aria-label="حذف المصروف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals placeholders - in real implementation these would be components */}
            {showBudgetModal && (
                <BudgetModal
                    onClose={() => setShowBudgetModal(false)}
                    onSubmit={(data) => {
                        onAddBudget(data);
                        setShowBudgetModal(false);
                    }}
                />
            )}

            {showExpenseModal && (
                <ExpenseModal
                    onClose={() => setShowExpenseModal(false)}
                    onSubmit={(data) => {
                        onAddExpense(data);
                        setShowExpenseModal(false);
                    }}
                />
            )}
        </div>
    );
}

// Internal Helper Components
function BudgetModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: FinancialInput) => void }) {
    const [formData, setFormData] = useState({
        item_name: "",
        category: "أدوات ومواد",
        amount: 0,
        school_year: "2025-2026",
        date: new Date().toISOString().split('T')[0],
        notes: ""
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm animate-in fade-in transition-all">
            <div className="bg-stone-100 border border-stone-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-stone-200 bg-white/80">
                    <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-blue-400" /> إضافة بند ميزانية مقترح
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">اسم البند</label>
                        <input
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                            placeholder="مثال: أدوات رياضية للدوري"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                            aria-label="اسم البند"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">الفئة</label>
                            <select
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none appearance-none"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                aria-label="فئة البند"
                            >
                                <option>أدوات ومواد</option>
                                <option>جوائز وتكريم</option>
                                <option>نقل ومواصلات</option>
                                <option>تغذية</option>
                                <option>أخرى</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">المبلغ التقديري</label>
                            <input
                                type="number"
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                aria-label="المبلغ التقديري"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">ملاحظات إضافية</label>
                        <textarea
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            aria-label="ملاحظات إضافية"
                        />
                    </div>
                </div>
                <div className="p-6 bg-white/80 flex gap-2">
                    <button
                        onClick={() => onSubmit(formData)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        اعتماد البند
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-500 rounded-xl text-sm font-bold transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExpenseModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: FinancialInput) => void }) {
    const [formData, setFormData] = useState({
        item_name: "",
        invoice_number: "",
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: "مشتريات",
        school_year: "2025-2026",
        notes: ""
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm animate-in fade-in transition-all">
            <div className="bg-stone-100 border border-stone-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-stone-200 bg-white/80 text-right">
                    <h3 className="text-lg font-black text-foreground flex items-center gap-2 justify-end">
                        تسجيل مصروف فعلي <Receipt className="w-5 h-5 text-[hsl(var(--gold))]" />
                    </h3>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">الوصف</label>
                        <input
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all text-right"
                            placeholder="مثال: فاتورة شراء كؤوس الدوري"
                            value={formData.item_name}
                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">رقم الفاتورة</label>
                            <input
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all text-right"
                                placeholder="INV-001"
                                value={formData.invoice_number}
                                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                aria-label="رقم الفاتورة"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">المبلغ المدفوع</label>
                            <input
                                type="number"
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all text-right"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                aria-label="المبلغ المدفوع"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-stone-500 mr-1 uppercase">تاريخ الصرف</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:border-[hsl(var(--gold))] outline-none transition-all text-right"
                                value={formData.date}
                                aria-label="تاريخ الصرف"
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white/80 flex gap-2">
                    <button
                        onClick={() => onSubmit(formData)}
                        className="flex-1 bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-[hsla(var(--gold),.20)]"
                    >
                        حفظ المصروف
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-500 rounded-xl text-sm font-bold transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}
