import { useState, useCallback, useEffect, useRef, startTransition } from "react";
import { useAuth } from "@/app/_context/AuthContext";

import {
    StudentProfile,
    StudentAttendance,
    BehavioralReferral,
    StudentAsset,
    BehavioralContract,
    AttendanceStatus,
    ReferralStatus
} from "@/lib/types/student-affairs";
import {
    markAttendanceAction,
    sendToCounselorAction,
    resolveReferralAction,
    escalateReferralAction,
    issueAssetAction,
    returnAssetAction,
    updateStudentProfileAction,
    signContractAction,
} from "@/app/student-affairs/_actions";

export function useStudentAffairs() {
    const { user, supabase } = useAuth();
    const [profileCache, setProfileCache] = useState<{ userId: string; name: string | null } | null>(null);
    const profileFetchRef = useRef<string | null>(null);
    const userId = user?.id ?? null;
    const metaName: string | null = user
        ? (user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null)
        : null;
    const currentUserName: string | null = user
        ? ((profileCache?.userId === user.id ? profileCache.name : null) ?? metaName)
        : null;

    useEffect(() => {
        if (!userId) return;
        if (profileFetchRef.current === userId) return;
        profileFetchRef.current = userId;
        startTransition(async () => {
            const { data } = await supabase.from("profiles").select("full_name, name").eq("id", userId).single();
            if (data) setProfileCache({ userId, name: data.full_name ?? data.name ?? null });
        });
    }, [userId, supabase]);

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // State Data
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
    const [referrals, setReferrals] = useState<BehavioralReferral[]>([]);
    const [assets, setAssets] = useState<StudentAsset[]>([]);
    const [contracts] = useState<BehavioralContract[]>([]);

    // 1. Data Loaders
    const loadStudents = useCallback(async () => {
        setLoading(true);
        // ملاحظة: جدول student_profiles لا يحوي عمود student_id؛ المعرّف هو national_id.
        // نُسمّيه student_id عبر alias في PostgREST لتطابق نوع StudentProfile دون لمس قاعدة البيانات.
        const { data, error } = await supabase
            .from('student_profiles')
            .select('*, student_id:national_id')
            .order('name', { ascending: true });

        if (error) setMsg({ text: error.message, type: 'error' });
        else setStudents((data ?? []) as unknown as StudentProfile[]);
        setLoading(false);
    }, [supabase]);

    const loadAttendance = useCallback(async (date: string = new Date().toISOString().split('T')[0]) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('student_daily_attendance')
            .select('*, student:student_profiles(name, student_id:national_id)')
            .eq('attendance_date', date);

        if (error) setMsg({ text: error.message, type: 'error' });
        else setAttendance(data || []);
        setLoading(false);
    }, [supabase]);

    const loadReferrals = useCallback(async (status?: ReferralStatus) => {
        setLoading(true);
        let query = supabase
            .from('behavioral_referrals')
            .select('*, student:student_profiles(name, student_id:national_id)')
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) setMsg({ text: error.message, type: 'error' });
        else setReferrals(data || []);
        setLoading(false);
    }, [supabase]);

    const loadAssets = useCallback(async (studentId?: string) => {
        setLoading(true);
        let query = supabase
            .from('student_assets')
            .select('*, student:student_profiles(name)')
            .order('created_at', { ascending: false });

        if (studentId) query = query.eq('student_id', studentId);

        const { data, error } = await query;
        if (error) setMsg({ text: error.message, type: 'error' });
        else setAssets(data || []);
        setLoading(false);
    }, [supabase]);

    const loadAll = useCallback(async () => {
        await Promise.all([
            loadStudents(),
            loadAttendance(),
            loadReferrals(),
            loadAssets()
        ]);
    }, [loadStudents, loadAttendance, loadReferrals, loadAssets]);

    // 2. Attendance Actions
    const markAttendance = async (studentId: string, status: AttendanceStatus, metadata: Partial<StudentAttendance> = {}) => {
        const result = await markAttendanceAction(studentId, status, metadata as Record<string, unknown>);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else {
            setMsg({ text: "✅ Attendance updated successfully", type: 'success' });
            loadAttendance();
            loadReferrals();
        }
    };

    const recordExit = async (studentId: string, guardianName: string, relation: string, reason: string) => {
        await markAttendance(studentId, 'excused_exit', {
            exit_guardian_name: guardianName,
            exit_guardian_relation: relation,
            exit_reason: reason,
            time_out: new Date().toLocaleTimeString('en-GB')
        });
    };

    // 3. Referral Actions
    const sendToCounselor = async (referralId: string, vpNotes: string) => {
        const result = await sendToCounselorAction(referralId, vpNotes);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else { setMsg({ text: "✅ Referral sent to Counselor", type: 'success' }); loadReferrals(); }
    };

    const resolveReferral = async (referralId: string, counselorAction: string, counselorNotes?: string) => {
        const result = await resolveReferralAction(referralId, counselorAction, counselorNotes);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else { setMsg({ text: "✅ Referral resolved", type: 'success' }); loadReferrals(); }
    };

    const escalateReferral = async (referralId: string, reason: string) => {
        const result = await escalateReferralAction(referralId, reason);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else { setMsg({ text: "⚠️ Referral escalated to Principal", type: 'success' }); loadReferrals(); }
    };

    // 4. Asset Actions
    const issueAsset = async (studentId: string, assetName: string, assetType: string = 'book') => {
        const result = await issueAssetAction(studentId, assetName, assetType);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else {
            setMsg({ text: "✅ Asset issued", type: 'success' });
            loadAssets(studentId);
        }
    };

    const returnAsset = async (assetId: string, condition: string) => {
        const result = await returnAssetAction(assetId, condition);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else { setMsg({ text: "✅ Asset returned", type: 'success' }); loadAssets(); }
    };

    const updateProfile = async (studentId: string, updates: Partial<StudentProfile>) => {
        const result = await updateStudentProfileAction(studentId, updates);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else { setMsg({ text: "✅ Profile updated successfully", type: 'success' }); loadStudents(); }
    };

    const signContract = async (contractId: string) => {
        const result = await signContractAction(contractId);
        if (!result.ok) setMsg({ text: result.error ?? "خطأ", type: 'error' });
        else { setMsg({ text: "✍️ Contract signed successfully", type: 'success' }); loadAll(); }
    };

    // Initial Load
    useEffect(() => {
        startTransition(async () => { await loadAll(); });
    }, [loadAll]);

    // Stats
    const stats = {
        totalAbsent: attendance.filter(a => a.status === 'absent').length,
        totalLate: attendance.filter(a => a.status === 'late').length,
        pendingReferrals: referrals.filter(r => r.status === 'draft' || r.status === 'pending_counselor').length,
        issuedAssets: assets.filter(a => a.status === 'assigned').length
    };

    return {
        state: {
            loading,
            msg,
            students,
            attendance,
            referrals,
            assets,
            contracts,
            stats,
            user,
            currentUserName
        },
        actions: {
            setMsg,
            loadAll,
            loadAttendance,
            loadReferrals,
            loadAssets,
            markAttendance,
            recordExit,
            sendToCounselor,
            resolveReferral,
            escalateReferral,
            issueAsset,
            returnAsset,
            updateProfile,
            signContract
        }
    };
}
