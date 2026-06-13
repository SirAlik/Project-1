"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Bus, MapPin, Calendar, CheckCircle, ShieldCheck } from "lucide-react";
import { getTripConsent, submitTripConsent, type PublicTripConsent } from "./_actions";

export default function TripConsentPage() {
    const params = useParams();
    const uniqueLink = params.uniqueLink as string;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PublicTripConsent | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        let active = true;
        async function loadConsentData() {
            if (!uniqueLink) {
                if (active) setLoading(false);
                return;
            }
            // البيانات تُجلب server-side عبر إجراء مُقيَّد بالتوكن (لا عميل anon، حقول دنيا)
            const result = await getTripConsent(uniqueLink);
            if (active) {
                setData(result);
                setLoading(false);
            }
        }
        loadConsentData();
        return () => {
            active = false;
        };
    }, [uniqueLink]);

    const handleConsent = async () => {
        const res = await submitTripConsent(uniqueLink);
        if (res.ok) setSubmitted(true);
    };

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-stone-500">جاري التحميل...</div>;
    if (!data?.trip) return <div className="min-h-screen bg-white flex items-center justify-center text-rose-500">رابط غير صالح أو منتهي الصلاحية</div>;

    const trip = data.trip;
    const consented = submitted || data.alreadyConsented;

    return (
        <main className="min-h-screen bg-white text-stone-800 font-sans p-6" dir="rtl">
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-1000">
                <header className="text-center space-y-4">
                    <div className="inline-block p-4 bg-[hsla(var(--accent-primary),.10)] rounded-3xl border border-[hsla(var(--accent-primary),.20)]">
                        <Bus className="w-10 h-10 text-[hsl(var(--accent-primary))]" />
                    </div>
                    <h1 className="text-3xl font-black text-foreground">نموذج موافقة ولي الأمر</h1>
                    <p className="text-stone-500 font-bold">بشأن المشاركة في الرحلات والزيارات الخارجية</p>
                </header>

                <div className="bg-stone-100 border border-stone-200 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-stone-200 bg-white/80">
                        <h2 className="text-xl font-black text-foreground">{trip.title}</h2>
                        <div className="flex items-center gap-4 mt-4 text-xs font-bold text-stone-500">
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {trip.destination}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {trip.trip_date}</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="p-6 bg-white border border-stone-200 rounded-3xl">
                            <p className="text-sm text-stone-500 leading-relaxed">
                                أنا ولي أمر الطالب <span className="text-[hsl(var(--accent-primary))] font-black">({data.studentName ?? "—"})</span>، أقر بموافقتي على مشاركة ابني في الرحلة المذكورة أعلاه، مع الالتزام بكافة التعليمات المنظمة للنشاط.
                            </p>
                        </div>

                        {consented ? (
                            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-4 animate-in zoom-in">
                                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                                <h3 className="text-lg font-black text-foreground">تم استلام الموافقة بنجاح</h3>
                                <p className="text-xs text-emerald-400/70 font-bold">شكراً لتعاونكم معنا</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleConsent}
                                className="w-full py-5 bg-[hsl(var(--accent-primary))] hover:bg-[hsl(var(--accent-primary))] text-white rounded-3xl text-sm font-black transition-all shadow-xl shadow-[hsla(var(--accent-primary),.20)] flex items-center justify-center gap-3 group"
                            >
                                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" /> أوافق على المشاركة
                            </button>
                        )}
                    </div>

                    <footer className="p-6 bg-white/80 text-center">
                        <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em]">نموذج موافقة إلكتروني • منصة سِدرة</p>
                    </footer>
                </div>
            </div>
        </main>
    );
}
