'use server';

import { supabaseAdmin } from '@/lib/db/supabase-admin';

/**
 * Public Trip-Consent Actions
 * ===========================
 * تدفّق موافقة ولي الأمر **عام** (بلا جلسة): المصادقة عبر `unique_link` — توكن غير قابل
 * للتخمين خاص بكل سجل. لا عميل متصفّح anon، ولا وصول واسع لقاعدة البيانات؛ القراءة/الكتابة
 * تمرّان عبر هذه الإجراءات الخادمية، بالحدّ الأدنى من الحقول، ومُقيَّدتان بالتوكن فقط.
 *
 * عزل المستأجر: الاستعلام مُقيَّد بـ `unique_link` (سجل واحد)، فلا تسرّب عبر المدارس.
 */

export interface PublicTripConsent {
    trip: { title: string; destination: string; trip_date: string } | null;
    studentName: string | null;
    alreadyConsented: boolean;
}

interface ConsentJoinRow {
    parent_consent: boolean | null;
    student_profiles: { name: string } | { name: string }[] | null;
    activity_trips:
        | { title: string; destination: string; trip_date: string }
        | { title: string; destination: string; trip_date: string }[]
        | null;
}

/** توكن صالح شكلياً: طول كافٍ لمنع التخمين + أحرف آمنة فقط. */
function isValidLink(link: string): boolean {
    return typeof link === 'string' && link.length >= 16 && /^[A-Za-z0-9_-]+$/.test(link);
}

function first<T>(v: T | T[] | null): T | null {
    if (v === null || v === undefined) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** يقرأ الحد الأدنى لعرض صفحة الموافقة (عنوان الرحلة + اسم الطالب + حالة الموافقة). */
export async function getTripConsent(uniqueLink: string): Promise<PublicTripConsent | null> {
    if (!isValidLink(uniqueLink)) return null;

    const { data } = await supabaseAdmin
        .from('trip_consents')
        .select('parent_consent, student_profiles(name), activity_trips(title, destination, trip_date)')
        .eq('unique_link', uniqueLink)
        .maybeSingle();

    if (!data) return null;
    const row = data as unknown as ConsentJoinRow;
    const student = first(row.student_profiles);
    const trip = first(row.activity_trips);

    return {
        trip: trip
            ? { title: trip.title, destination: trip.destination, trip_date: trip.trip_date }
            : null,
        studentName: student?.name ?? null,
        alreadyConsented: !!row.parent_consent,
    };
}

/** يثبّت موافقة ولي الأمر (idempotent: يُحدِّث فقط إن لم تكن مُثبَّتة)، مُقيَّداً بالتوكن. */
export async function submitTripConsent(uniqueLink: string): Promise<{ ok: boolean }> {
    if (!isValidLink(uniqueLink)) return { ok: false };

    const { error } = await supabaseAdmin
        .from('trip_consents')
        .update({ parent_consent: true, consent_date: new Date().toISOString() })
        .eq('unique_link', uniqueLink)
        .eq('parent_consent', false);

    return { ok: !error };
}
