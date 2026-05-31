"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/db/supabase";
import { Bus, MapPin, Calendar, CheckCircle, ShieldCheck } from "lucide-react";
import type { ActivityTrip } from "@/lib/types/activity";

interface ConsentRow {
    id: string;
    parent_consent: boolean;
    consent_date: string | null;
    student_profiles: { name: string } | null;
    activity_trips: ActivityTrip | null;
}

export default function TripConsentPage() {
    const params = useParams();
    const uniqueLink = params.uniqueLink as string;

    const [loading, setLoading] = useState(true);
    const [trip, setTrip] = useState<ActivityTrip | null>(null);
    const [student, setStudent] = useState<{ name: string } | null>(null);
    const [consent, setConsent] = useState<ConsentRow | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        async function loadConsentData() {
            if (!uniqueLink) return;

            const { data } = await supabase
                .from("trip_consents")
                .select("*, student_profiles(name), activity_trips(*)")
                .eq("unique_link", uniqueLink)
                .single();

            if (data) {
                setConsent(data);
                setStudent(data.student_profiles);
                setTrip(data.activity_trips);
            }
            setLoading(false);
        }
        loadConsentData();
    }, [uniqueLink]);

    const handleConsent = async () => {
        const { error } = await supabase
            .from("trip_consents")
            .update({ parent_consent: true, consent_date: new Date().toISOString() })
            .eq("unique_link", uniqueLink);

        if (!error) setSubmitted(true);
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">جاري التحميل...</div>;
    if (!trip) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-rose-500">رابط غير صالح أو منتهي الصلاحية</div>;

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6" dir="rtl">
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-1000">
                <header className="text-center space-y-4">
                    <div className="inline-block p-4 bg-[hsla(var(--gold),.10)] rounded-3xl border border-[hsla(var(--gold),.20)]">
                        <Bus className="w-10 h-10 text-[hsl(var(--gold))]" />
                    </div>
                    <h1 className="text-3xl font-black text-white">نموذج موافقة ولي الأمر</h1>
                    <p className="text-zinc-500 font-bold">بشأن المشاركة في الرحلات والزيارات الخارجية</p>
                </header>

                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-zinc-800 bg-zinc-900/50">
                        <h2 className="text-xl font-black text-white">{trip.title}</h2>
                        <div className="flex items-center gap-4 mt-4 text-xs font-bold text-zinc-500">
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {trip.destination}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {trip.trip_date}</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl">
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                أنا ولي أمر الطالب <span className="text-[hsl(var(--gold))] font-black">({student?.name})</span>، أقر بموافقتي على مشاركة ابني في الرحلة المذكورة أعلاه، مع الالتزام بكافة التعليمات المنظمة للنشاط.
                            </p>
                        </div>

                        {submitted || consent?.parent_consent ? (
                            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-4 animate-in zoom-in">
                                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                                <h3 className="text-lg font-black text-white">تم استلام الموافقة بنجاح</h3>
                                <p className="text-xs text-emerald-400/70 font-bold">شكراً لتعاونكم معنا</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleConsent}
                                className="w-full py-5 bg-[hsl(var(--gold-strong))] hover:bg-[hsl(var(--gold))] text-white rounded-3xl text-sm font-black transition-all shadow-xl shadow-[hsla(var(--gold),.20)] flex items-center justify-center gap-3 group"
                            >
                                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" /> أوافق على المشاركة
                            </button>
                        )}
                    </div>

                    <footer className="p-6 bg-zinc-900/50 text-center">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">نظام إدارة الأنشطة - مدارس الفلاح</p>
                    </footer>
                </div>
            </div>
        </main>
    );
}
