import React from "react";
import { BookRow } from "@/lib/types/lrc";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export function BookList({ books, onAdd }: { books: BookRow[], onAdd: (b: Omit<BookRow, "id" | "school_id">) => void }) {
    const [showForm, setShowForm] = React.useState(false);
    const [newBook, setNewBook] = React.useState({ title: "", author: "", isbn: "", category: "General", total_copies: 1, location: "" });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onAdd({ ...newBook, available_copies: newBook.total_copies });
        setShowForm(false);
        setNewBook({ title: "", author: "", isbn: "", category: "General", total_copies: 1, location: "" });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="text-zinc-400 text-sm">إجمالي الكتب: {books.length}</div>
                <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition">
                    + إضافة كتاب
                </button>
            </div>

            {showForm && (
                <Card className="animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required placeholder="عنوان الكتاب" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" />
                        <input placeholder="المؤلف" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" />
                        <input placeholder="ISBN" value={newBook.isbn} onChange={e => setNewBook({ ...newBook, isbn: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" />
                        <select value={newBook.category} onChange={e => setNewBook({ ...newBook, category: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" aria-label="تصنيف الكتب">
                            <option value="General">عام</option>
                            <option value="Science">علوم</option>
                            <option value="Literature">أدب</option>
                            <option value="Religious">ديني</option>
                        </select>
                        <div className="flex gap-2 items-center">
                            <label className="text-zinc-400 text-xs w-20">عدد النسخ:</label>
                            <input type="number" min="1" value={newBook.total_copies} onChange={e => setNewBook({ ...newBook, total_copies: Number(e.target.value) })} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm w-full" aria-label="عدد النسخ الكلي" />
                        </div>
                        <input placeholder="الموقع (رف/دولاب)" value={newBook.location} onChange={e => setNewBook({ ...newBook, location: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-xl p-2 text-sm" aria-label="موقع الكتاب" />

                        <div className="md:col-span-2 text-left">
                            <button className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold" aria-label="حفظ الكتاب الجديد">حفظ</button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map(b => (
                    <Card key={b.id} className="relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-bold text-zinc-200">{b.title}</div>
                                <div className="text-xs text-zinc-400">{b.author}</div>
                            </div>
                            <Pill>{b.available_copies} / {b.total_copies}</Pill>
                        </div>
                        <div className="mt-4 flex justify-between items-end text-xs text-zinc-500">
                            <span>{b.category}</span>
                            <span className="bg-zinc-800 px-2 py-1 rounded">{b.location || "غير محدد"}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
