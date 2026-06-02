import React, { useState } from "react";
import { ShoppingCart, Plus, Trash2, Package, Clock } from "lucide-react";
import { ProcurementRequest, ProcurementItem } from "@/lib/types/secretary";
import { ProcurementFormInput } from "@/app/secretary/_hooks/useSecretary";

interface Props {
    requests: ProcurementRequest[];
    onSubmit: (request: ProcurementFormInput) => void;
}

export function ProcurementForm({ requests, onSubmit }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [items, setItems] = useState<ProcurementItem[]>([]);

    const addItem = () => setItems([...items, { name: "", qty: 1, specs: "" }]);
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: keyof Pick<ProcurementItem, "name" | "qty" | "specs">, val: string | number) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: val };
        setItems(newItems);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/80 p-6 rounded-[2rem] border border-stone-200">
                <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-400" />
                        طلبات الاحتياج والمشتريات
                    </h3>
                    <p className="text-stone-500 text-sm mt-1">تقديم طلبات تأمين مستلزمات المدرسة ومتابعة حالتها.</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setItems([{ name: "", qty: 1, specs: "" }]); }}
                    className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-zinc-200 transition-all shadow-lg"
                >
                    <Plus className="w-4 h-4" /> طلب احتياج جديد
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {requests.map(request => (
                    <div key={request.id} className="bg-white/80 border border-stone-200 p-6 rounded-[2.5rem] hover:border-stone-300 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                            <div className="flex items-start gap-4">
                                <div className={`p-4 rounded-3xl border ${request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    request.status === 'pending' ? 'bg-[hsla(var(--gold),.15)] text-[hsl(var(--gold))] border-[hsla(var(--gold),.25)]' :
                                        'bg-stone-200 text-stone-500 border-stone-300'
                                    }`}>
                                    <Package className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-white font-bold text-lg">طلب برقم: {request.request_number}</h4>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${request.status === 'approved' ? 'border-emerald-500/20 text-emerald-400' : 'border-[hsla(var(--gold),.25)] text-[hsl(var(--gold))]'
                                            }`}>
                                            {request.status === 'approved' ? 'تم الاعتماد' : 'قيد المراجعة'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-stone-500 uppercase">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3" /> {request.request_date}</span>
                                        <span className="flex items-center gap-1.5"><Package className="w-3" /> {request.items?.length || 0} أصناف</span>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full md:w-auto text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase border border-indigo-500/20 px-6 py-3 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-95 transition-all">
                                عرض التفاصيل كاملة
                            </button>
                        </div>
                    </div>
                ))}

                {requests.length === 0 && (
                    <div className="bg-white/80 border border-stone-200 p-12 rounded-[2.5rem] text-center">
                        <Package className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <h4 className="text-stone-500 font-bold">لا توجد طلبات احتياج حالية</h4>
                    </div>
                )}
            </div>

            {/* Procurement Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-200/70 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-stone-100 border border-stone-200 w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="text-white text-2xl font-black">نموذج طلب احتياج</h4>
                                    <p className="text-stone-500 text-sm mt-1">املأ البيانات لتوليد نموذج QF71-A-4-1 رسمياً.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-stone-500 hover:text-foreground transition-colors p-2">إغلاق</button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                onSubmit({
                                    request_number: `PRQ-${Date.now().toString().slice(-6)}`,
                                    request_date: new Date().toISOString().split('T')[0],
                                    urgency: formData.get("urgency"),
                                    justification: formData.get("justification"),
                                    items,
                                    status: "pending"
                                });
                                setShowModal(false);
                            }} className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">الأصناف المطلوبة</label>
                                        <button type="button" onClick={addItem} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors">
                                            <Plus className="w-3 h-3" /> إضافة صنف
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-white border border-stone-200 rounded-2xl relative">
                                                <div className="col-span-12 md:col-span-6 space-y-1">
                                                    <input
                                                        placeholder="اسم الصنف"
                                                        className="w-full bg-transparent border-none p-0 text-sm text-foreground font-bold focus:ring-0 placeholder:text-stone-400"
                                                        value={item.name}
                                                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                                                        required
                                                        aria-label="اسم الصنف"
                                                    />
                                                </div>
                                                <div className="col-span-12 md:col-span-3 space-y-1">
                                                    <input
                                                        type="number"
                                                        placeholder="الكمية"
                                                        className="w-full bg-transparent border-none p-0 text-sm text-foreground font-bold focus:ring-0 placeholder:text-stone-400"
                                                        value={item.qty}
                                                        onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value))}
                                                        required
                                                        aria-label="كمية الصنف"
                                                    />
                                                </div>
                                                <div className="col-span-12 md:col-span-2 space-y-1">
                                                    <button type="button" onClick={() => removeItem(idx)} className="text-rose-500/50 hover:text-rose-500 px-2 py-1 transition-colors"
                                                        aria-label="إزالة البند">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="col-span-12 mt-2 pt-2 border-t border-stone-200">
                                                    <input
                                                        placeholder="المواصفات (اختياري)"
                                                        className="w-full bg-transparent border-none p-0 text-[10px] text-stone-500 font-bold focus:ring-0 placeholder:text-stone-400"
                                                        value={item.specs}
                                                        onChange={(e) => updateItem(idx, "specs", e.target.value)}
                                                        aria-label="مواصفات الصنف"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">درجة الأهمية</label>
                                        <select name="urgency" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-xs text-foreground font-bold appearance-none"
                                            aria-label="درجة الأهمية">
                                            <option value="normal">عادي</option>
                                            <option value="urgent">عاجل جداً</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-1">المسوغات (السبب)</label>
                                        <textarea name="justification" className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-xs text-foreground font-bold h-24" placeholder="مثال: انتهاء المخزون، بدء الفصل الثاني..." required />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-5 rounded-3xl text-xs font-black uppercase transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98]">
                                    إرسال الطلب للاعتماد
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
