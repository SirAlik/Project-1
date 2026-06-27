import { useState, useEffect, useRef, useCallback, startTransition } from "react";

import { useAuth } from "@/app/_context/AuthContext";
import { ParentReportRow, CaseRow, SessionRow } from "@/lib/types/counselor";
import {
    openReportAsCaseAction,
    approveHealthSocialAction,
    createCaseManualAction,
    addSessionAction,
} from "@/app/counselor/_actions";

export function useCounselor() {
    const { user, role, supabase } = useAuth();
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
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("full_name, name")
                    .eq("id", userId)
                    .single();
                if (!error && data) {
                    setProfileCache({ userId, name: data.full_name ?? data.name ?? null });
                }
            } catch (err) {
                console.error("Profile fetch error", err);
            }
        });
    }, [userId, supabase]);

    // State
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Lookups
    const [studentsList, setStudentsList] = useState<{ id: string; name: string }[]>([]);
    const [classesList, setClassesList] = useState<{ id: string; name: string }[]>([]);

    // Data
    const [reports, setReports] = useState<ParentReportRow[]>([]);
    const [cases, setCases] = useState<CaseRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);

    // Helpers
    function studentNameById(id: string | null) {
        if (!id) return "—";
        return studentsList.find((s) => s.id === id)?.name ?? "—";
    }
    function classNameById(id: string | null) {
        if (!id) return "—";
        return classesList.find((c) => c.id === id)?.name ?? "—";
    }

    // --- Loaders ---
    const loadLookups = useCallback(async () => {
        try {
            const { data: sData, error: sErr } = await supabase.from("student_profiles").select("id, name, is_approved").order("name");
            if (sErr) throw sErr;
            setStudentsList(sData || []);

            const { data: cData, error: cErr } = await supabase.from("classes").select("id, name").order("name");
            if (cErr) throw cErr;
            setClassesList(cData || []);
        } catch (e: unknown) {
            console.error("Lookup error:", e);
            throw e;
        }
    }, [supabase]);

    const loadReports = useCallback(async () => {
        const { data, error } = await supabase
            .from("parent_reports")
            .select("id, created_at, title, details, status, student_id, class_id, case_id")
            .order("created_at", { ascending: false })
            .limit(100);
        if (error) throw error;
        setReports((data ?? []) as ParentReportRow[]);
    }, [supabase]);

    const loadCases = useCallback(async () => {
        const { data, error } = await supabase
            .from("cases")
            .select(
                "id, created_at, title, details, category, status, student_id, class_id, opened_by_name, opened_by_role, assigned_to_role, closed_at"
            )
            .order("created_at", { ascending: false })
            .limit(100);
        if (error) throw error;
        setCases((data ?? []) as CaseRow[]);
    }, [supabase]);

    const loadSessions = useCallback(async () => {
        const { data, error } = await supabase
            .from("counseling_sessions")
            .select(
                "id, created_at, case_id, student_id, class_id, session_date, session_type, topic, notes, actions_taken, follow_up_required, follow_up_date, counselor_nar, counselor_rol"
            )
            .order("created_at", { ascending: false })
            .limit(100);
        if (error) throw error;
        setSessions((data ?? []) as SessionRow[]);
    }, [supabase]);

    const reloadAll = useCallback(async () => {
        setLoading(true);
        setMsg("");
        try {
            await Promise.all([loadLookups(), loadReports(), loadCases(), loadSessions()]);
        } catch (e: unknown) {
            setMsg(`⚠️ فشل تحديث البيانات: ${e instanceof Error ? e.message : String(e)}`);
            console.error("Counselor reload failed:", e);
        } finally {
            setLoading(false);
        }
    }, [loadLookups, loadReports, loadCases, loadSessions]);

    // --- Actions ---

    async function openReportAsCase(report: ParentReportRow) {
        setMsg("");
        if (report.case_id) {
            setMsg("✅ البلاغ مرتبط بمعاملة مسبقًا.");
            return;
        }
        const res = await openReportAsCaseAction({
            reportId: report.id,
            studentId: report.student_id,
            classId: report.class_id,
            title: report.title,
        });
        if (!res.ok) { setMsg(res.error ?? "تعذّر فتح البلاغ"); return false; }
        setMsg("✅ تم فتح البلاغ وتحويله إلى معاملة.");
        await reloadAll();
        return true; // signal success to switch tab
    }

    async function approveParentSubmission(report: ParentReportRow) {
        setMsg("");
        let parsed: { type?: string; health?: boolean } = {};
        try {
            parsed = JSON.parse(report.details || "{}");
        } catch {
            parsed = {};
        }
        if (parsed.type !== "health_social_intake") {
            return await openReportAsCase(report);
        }
        const res = await approveHealthSocialAction({
            reportId: report.id,
            studentId: report.student_id,
            classId: report.class_id,
            title: report.title || "تحديث حالة صحية/اجتماعية",
            category: parsed.health ? "صحي" : "اجتماعي",
            details: report.details,
        });
        if (!res.ok) { setMsg(res.error ?? "تعذّر اعتماد الطلب"); return false; }
        setMsg("✅ تم اعتماد الطلب وتحديث سجل الطالب.");
        await reloadAll();
        return true;
    }

    async function createCaseManual(
        title: string,
        category: string,
        studentId: string,
        classId: string
    ) {
        setMsg("");
        if (!title.trim()) { setMsg("⚠️ اكتب عنوان المعاملة."); return false; }

        const res = await createCaseManualAction({
            title: title.trim(),
            category,
            studentId: studentId || null,
            classId: classId || null,
        });
        if (!res.ok) { setMsg(res.error ?? "تعذّر إنشاء المعاملة"); return false; }
        setMsg("✅ تم إنشاء معاملة جديدة.");
        await reloadAll();
        return true;
    }

    async function addSession(payload: {
        studentId: string;
        classId: string;
        type: string;
        topic: string;
        notes: string;
        actions: string;
        followUpRequired: boolean;
        followUpDate: string;
    }) {
        setMsg("");
        if (!payload.studentId) { setMsg("⚠️ اختر الطالب للجلسة."); return false; }
        if (!payload.topic.trim()) { setMsg("⚠️ اكتب موضوع/عنوان مختصر للجلسة."); return false; }

        const res = await addSessionAction({
            studentId: payload.studentId,
            classId: payload.classId || null,
            type: payload.type,
            topic: payload.topic.trim(),
            notes: payload.notes,
            actions: payload.actions,
            followUpRequired: payload.followUpRequired,
            followUpDate: payload.followUpDate || null,
        });
        if (!res.ok) { setMsg(res.error ?? "تعذّر تسجيل الجلسة"); return false; }
        setMsg("✅ تم تسجيل الجلسة الإرشادية.");
        await reloadAll();
        return true;
    }

    useEffect(() => { startTransition(async () => { await reloadAll(); }); }, [reloadAll]);

    // Stats
    const stats = {
        activeCases: cases.filter((c) => c.status !== "مغلقة").length,
        sessionsThisMonth: sessions.filter((s) => {
            if (!s.session_date) return false;
            const d = new Date(s.session_date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
        pendingReports: reports.filter((r) => r.status === "new" || r.status === "pending").length,
        totalCases: cases.length,
        healthStats: {
            diabetes: cases.filter(c => c.category === "صحي" && c.details?.includes('"diabetes":true')).length,
            adhd: cases.filter(c => c.category === "صحي" && c.details?.includes('"adhd":true')).length,
            vision: cases.filter(c => c.category === "صحي" && c.details?.includes('"vision":true')).length,
        }
    };

    async function getAbsenceCount(studentId: string) {
        const { count, error } = await supabase
            .from("events")
            .select("*", { count: "exact", head: true })
            .eq("student_id", studentId)
            .eq("type", "غياب");
        if (error) {
            console.error("Error fetching absence count", error);
            return 0;
        }
        return count ?? 0;
    }

    return {
        state: {
            msg, user, role, loading,
            studentsList, classesList,
            reports, cases, sessions,
            stats,
            currentUserName
        },
        helpers: { studentNameById, classNameById, getAbsenceCount },
        actions: { reloadAll, openReportAsCase, approveParentSubmission, createCaseManual, addSession }
    };
}
