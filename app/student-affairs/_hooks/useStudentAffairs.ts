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
        const { data, error } = await supabase
            .from('student_profiles')
            .select('*')
            .order('name', { ascending: true });

        if (error) setMsg({ text: error.message, type: 'error' });
        else setStudents(data || []);
        setLoading(false);
    }, [supabase]);

    const loadAttendance = useCallback(async (date: string = new Date().toISOString().split('T')[0]) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('student_attendance')
            .select('*, student:student_profiles(name, student_id)')
            .eq('attendance_date', date);

        if (error) setMsg({ text: error.message, type: 'error' });
        else setAttendance(data || []);
        setLoading(false);
    }, [supabase]);

    const loadReferrals = useCallback(async (status?: ReferralStatus) => {
        setLoading(true);
        let query = supabase
            .from('behavioral_referrals')
            .select('*, student:student_profiles(name, student_id)')
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
        const { error } = await supabase.from('student_attendance').upsert({
            student_id: studentId,
            attendance_date: new Date().toISOString().split('T')[0],
            status,
            ...metadata,
            recorded_by: user?.id
        });

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✅ Attendance updated successfully", type: 'success' });
            loadAttendance();
            // Re-load referrals as they might be auto-created by trigger
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
        const { error } = await supabase
            .from('behavioral_referrals')
            .update({
                vp_notes: vpNotes,
                vp_sent_at: new Date().toISOString(),
                status: 'pending_counselor'
            })
            .eq('id', referralId);

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✅ Referral sent to Counselor", type: 'success' });
            loadReferrals();
        }
    };

    const resolveReferral = async (referralId: string, counselorAction: string, counselorNotes?: string) => {
        const { error } = await supabase
            .from('behavioral_referrals')
            .update({
                counselor_action: counselorAction,
                counselor_notes: counselorNotes,
                counselor_resolved_at: new Date().toISOString(),
                status: 'resolved'
            })
            .eq('id', referralId);

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✅ Referral resolved", type: 'success' });
            loadReferrals();
        }
    };

    const escalateReferral = async (referralId: string, reason: string) => {
        const { error } = await supabase
            .from('behavioral_referrals')
            .update({
                status: 'escalated',
                vp_notes: `Escalated: ${reason}`
            })
            .eq('id', referralId);

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "⚠️ Referral escalated to Principal", type: 'success' });
            loadReferrals();
        }
    };

    // 4. Asset Actions
    const issueAsset = async (studentId: string, assetName: string, assetType: string = 'book') => {
        const { error } = await supabase.from('student_assets').insert({
            student_id: studentId,
            asset_name: assetName,
            asset_type: assetType,
            handover_by: user?.id
        });

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✅ Asset issued", type: 'success' });
            loadAssets(studentId);
        }
    };

    const returnAsset = async (assetId: string, condition: string) => {
        const { error } = await supabase
            .from('student_assets')
            .update({
                return_date: new Date().toISOString().split('T')[0],
                return_condition: condition,
                status: 'returned',
                return_by: user?.id
            })
            .eq('id', assetId);

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✅ Asset returned", type: 'success' });
            loadAssets();
        }
    };

    const updateProfile = async (studentId: string, updates: Partial<StudentProfile>) => {
        const { error } = await supabase
            .from('student_profiles')
            .update(updates)
            .eq('id', studentId);

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✅ Profile updated successfully", type: 'success' });
            loadStudents();
        }
    };

    const signContract = async (contractId: string) => {
        const { error } = await supabase
            .from('behavioral_contracts')
            .update({
                parent_signature_date: new Date().toISOString()
            })
            .eq('id', contractId);

        if (error) setMsg({ text: error.message, type: 'error' });
        else {
            setMsg({ text: "✍️ Contract signed successfully", type: 'success' });
            // Re-load contracts if we had a loader for it, 
            // but for now we often load them per student.
            // Let's add loadContracts for completeness.
            loadAll();
        }
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
