import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import {
    CorrespondenceRow,
    LeaveRow,
} from "@/lib/types/secretary";
import {
    addLetterAction,
    updateLetterStatusAction,
    deleteLetterAction,
    addLeaveAction,
    updateLeaveStatusAction,
} from "@/app/secretary/_actions";

type LeaveFormInput = {
    employee_name: string;
    start_date: string;
    end_date: string;
    type: string;
    reason: string;
};

export type { LeaveFormInput };

export function useSecretary() {
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const [letters, setLetters] = useState<CorrespondenceRow[]>([]);
    const [leaves, setLeaves] = useState<LeaveRow[]>([]);

    const loadLetters = useCallback(async () => {
        const { data, error } = await supabase
            .from("secretary_correspondence")
            .select("*")
            .order("date", { ascending: false });
        if (error) setMsg(error.message);
        else setLetters((data || []) as CorrespondenceRow[]);
    }, []);

    const loadLeaves = useCallback(async () => {
        const { data, error } = await supabase
            .from("employee_leaves")
            .select("*")
            .order("created_at", { ascending: false });
        if (error) setMsg(error.message);
        else setLeaves((data || []) as LeaveRow[]);
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([loadLetters(), loadLeaves()]);
        setLoading(false);
    }, [loadLetters, loadLeaves]);

    const addLetter = async (letter: Omit<CorrespondenceRow, "id" | "created_at" | "attachment_url" | "status">) => {
        const result = await addLetterAction(letter);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم تسجيل المراسلة"); loadLetters(); }
    };

    const updateLetterStatus = async (id: string, status: string) => {
        const result = await updateLetterStatusAction(id, status);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else loadLetters();
    };

    const deleteLetter = async (id: string) => {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        const result = await deleteLetterAction(id);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else loadLetters();
    };

    const addLeave = async (leave: LeaveFormInput) => {
        const result = await addLeaveAction(leave);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم تقديم طلب الإجازة"); loadLeaves(); }
    };

    const updateLeaveStatus = async (id: string, status: string) => {
        const result = await updateLeaveStatusAction(id, status);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else loadLeaves();
    };

    useEffect(() => {
        startTransition(async () => { await loadAll(); });
    }, [loadAll]);

    const stats = {
        incomingPending: letters.filter(l => l.type === "incoming" && l.status === "received").length,
        outgoingTotal: letters.filter(l => l.type === "outgoing").length,
        activeLeaves: leaves.filter(l => l.status === "pending").length,
        onLeaveToday: leaves.filter(l => {
            const today = new Date().toISOString().split('T')[0];
            return l.status === 'approved' && l.start_date <= today && l.end_date >= today;
        }).length,
        completionRate: (() => {
            const incoming = letters.filter(l => l.type === "incoming");
            if (incoming.length === 0) return 100;
            const processed = incoming.filter(l => l.status === "processed" || l.status === "archived").length;
            return Math.round((processed / incoming.length) * 100);
        })()
    };

    return {
        state: { msg, loading, letters, leaves, stats },
        actions: {
            setMsg, loadAll,
            addLetter, updateLetterStatus, deleteLetter,
            addLeave, updateLeaveStatus,
        }
    };
}
