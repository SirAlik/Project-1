import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import {
    HealthVisit,
    HealthReferral,
    HealthAwareness,
    HealthSupply,
    CanteenCheck,
    HygieneLog
} from "@/lib/types/health";
import {
    addVisitAction,
    addReferralAction,
    addAwarenessAction,
    addHygieneLogAction,
    addCanteenCheckAction,
    addSupplyItemAction,
    updateSupplyAction,
    deleteSupplyItemAction,
} from "@/app/health/_actions";

export function useHealth() {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const [visits, setVisits] = useState<HealthVisit[]>([]);
    const [referrals, setReferrals] = useState<HealthReferral[]>([]);
    const [awareness, setAwareness] = useState<HealthAwareness[]>([]);
    const [supplies, setSupplies] = useState<HealthSupply[]>([]);
    const [hygieneLogs, setHygieneLogs] = useState<HygieneLog[]>([]);
    const [canteenChecks, setCanteenChecks] = useState<CanteenCheck[]>([]);

    // Students & Classes
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [students, setStudents] = useState<{ id: string; name: string; class_id: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [vDetails, rDetails, aDetails, sDetails, cDetails, supDetails, hLogDetails, canDetails] = await Promise.all([
                supabase.from("health_visits").select("*").order("date", { ascending: false }),
                supabase.from("health_referrals").select("*").order("created_at", { ascending: false }),
                supabase.from("health_awareness").select("*").order("date", { ascending: false }),
                supabase.from("student_profiles").select("id, name, class_id"),
                supabase.from("classes").select("id, name"),
                supabase.from("health_supplies").select("*").order("item_name"),
                supabase.from("hygiene_logs").select("*").order("check_date", { ascending: false }),
                supabase.from("canteen_checks").select("*").order("check_date", { ascending: false })
            ]);

            if (vDetails.data) setVisits(vDetails.data as HealthVisit[]);
            if (rDetails.data) setReferrals(rDetails.data as HealthReferral[]);
            if (aDetails.data) setAwareness(aDetails.data as HealthAwareness[]);
            if (sDetails.data) setStudents(sDetails.data);
            if (cDetails.data) setClasses(cDetails.data);
            if (supDetails.data) setSupplies(supDetails.data as HealthSupply[]);
            if (hLogDetails.data) setHygieneLogs(hLogDetails.data as HygieneLog[]);
            if (canDetails.data) setCanteenChecks(canDetails.data as CanteenCheck[]);
        } catch (error: unknown) {
            setMsg("حدث خطأ أثناء تحميل البيانات: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    }, []);

    async function addVisit(visit: {
        student_id: string;
        student_name: string;
        class_id: string | null;
        complaint: string;
        visit_reason: string;
        action_taken: string;
        date?: string;
        status: "completed" | "referred"
    }) {
        const result = await addVisitAction(visit);
        if (!result.ok) { setMsg(result.error ?? "خطأ"); return null; }
        setMsg("✅ تم تسجيل الزيارة بنجاح");
        loadData();
        return null;
    }

    async function addReferral(referral: { visit_id: string; student_name: string; destination: string; reason: string; parent_notified: boolean; notes: string }) {
        const result = await addReferralAction(referral);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم إصدار مستند التحويل"); loadData(); }
    }

    async function addAwareness(event: { title: string; target_audience: string; date: string; description: string }) {
        const result = await addAwarenessAction(event);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم تسجيل الفعالية التوعوية"); loadData(); }
    }

    async function addHygieneLog(log: Omit<HygieneLog, "id" | "created_at">) {
        const result = await addHygieneLogAction(log as Record<string, unknown>);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم حفظ نتائج فحص النظافة"); loadData(); }
    }

    async function addCanteenCheck(check: Omit<CanteenCheck, "id" | "created_at">) {
        const result = await addCanteenCheckAction(check as Record<string, unknown>);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم تسجيل فحص المقصف المدرسي"); loadData(); }
    }

    // --- Inventory Management ---

    async function addSupplyItem(item: Pick<HealthSupply, "item_name" | "quantity" | "category">) {
        const result = await addSupplyItemAction(item);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم إضافة مادة جديدة للمخزون"); loadData(); }
    }

    async function updateSupply(id: string, updates: Partial<HealthSupply>) {
        const result = await updateSupplyAction(id, updates);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم تحديث بيانات المخزون"); loadData(); }
    }

    async function deleteSupplyItem(id: string) {
        const result = await deleteSupplyItemAction(id);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("🗑️ تم حذف المادة من المخزون"); loadData(); }
    }

    useEffect(() => {
        startTransition(async () => { await loadData(); });
    }, [loadData]);

    // Stats calculations
    const stats = {
        visitsToday: visits.filter(v => v.date === new Date().toISOString().split('T')[0]).length,
        referralsCount: referrals.length,
        activitiesCount: awareness.length,
        totalVisits: visits.length,
        lowStockItems: supplies.filter(s => s.quantity < 5).length
    };

    return {
        state: {
            visits, referrals, awareness, students, classes,
            supplies, hygieneLogs, canteenChecks,
            selectedClassId,
            loading, msg,
            stats
        },
        actions: {
            setMsg,
            setSelectedClassId,
            addVisit,
            addReferral,
            addAwareness,
            addHygieneLog,
            addCanteenCheck,
            addSupplyItem,
            updateSupply,
            deleteSupplyItem,
            loadData
        }
    };
}

