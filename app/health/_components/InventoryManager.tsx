"use client";

import React, { useState } from "react";
import { Plus, Minus, Package, AlertCircle, Trash2 } from "lucide-react";
import type { HealthSupply, SupplyCategory } from "@/lib/types/health";

interface InventoryManagerProps {
    supplies: HealthSupply[];
    onUpdate: (id: string, updates: Partial<HealthSupply>) => void;
    onAdd: (item: Pick<HealthSupply, "item_name" | "quantity" | "category">) => void;
    onDelete: (id: string) => void;
}

export function InventoryManager({ supplies, onUpdate, onAdd, onDelete }: InventoryManagerProps) {
    const [newItem, setNewItem] = useState<{ item_name: string; quantity: number; category: SupplyCategory }>({ item_name: "", quantity: 0, category: "first_aid" });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.item_name) return;
        onAdd(newItem);
        setNewItem({ item_name: "", quantity: 0, category: "first_aid" });
    };

    return (
        <div className="space-y-6">
            {/* Add New Item Form */}
            <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h4 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-500" /> إضافة مادة جديدة
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                        type="text"
                        placeholder="اسم المادة"
                        className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                        value={newItem.item_name}
                        onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="الكمية"
                        className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    />
                    <select
                        className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value as SupplyCategory })}
                        aria-label="تصنيف المادة"
                    >
                        <option value="first_aid">مستهلكات (ضمادات، تعقيم)</option>
                        <option value="equipment">أدوات (ميزان، جهاز ضغط)</option>
                        <option value="other">معدات طوارئ</option>
                    </select>
                </div>
                <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
                    aria-label="إضافة للمخزون"
                >
                    إضافة للمخزون
                </button>
            </form>

            {/* Supplies List */}
            <div className="grid grid-cols-1 gap-3">
                {supplies.map((item) => (
                    <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${item.quantity < 5
                            ? "bg-rose-500/5 border-rose-500/20"
                            : "bg-zinc-900/40 border-zinc-800"
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${item.quantity < 5 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                                <Package className="w-5 h-5" />
                            </div>
                            <div>
                                <h5 className="font-bold text-zinc-100">{item.item_name}</h5>
                                <p className="text-xs text-zinc-500 uppercase">{item.category}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            {item.quantity < 5 && (
                                <div className="flex items-center gap-1 text-rose-400 animate-pulse hidden md:flex">
                                    <AlertCircle className="w-3 h-3" />
                                    <span className="text-[10px] font-bold">مخزون منخفض</span>
                                </div>
                            )}

                            <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 p-1">
                                <button
                                    onClick={() => onUpdate(item.id, { quantity: Math.max(0, item.quantity - 1) })}
                                    className="p-1 hover:bg-zinc-800 rounded-lg text-rose-500 transition-colors"
                                    aria-label="إنقاص الكمية"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-12 text-center font-black text-zinc-100">{item.quantity}</span>
                                <button
                                    onClick={() => onUpdate(item.id, { quantity: item.quantity + 1 })}
                                    className="p-1 hover:bg-zinc-800 rounded-lg text-emerald-500 transition-colors"
                                    aria-label="زيادة الكمية"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => onDelete(item.id)}
                                className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"
                                aria-label="حذف المادة"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
