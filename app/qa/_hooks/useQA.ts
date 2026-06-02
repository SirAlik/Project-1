import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import { QAObservation, StudentRiskFlag, Intervention, DailyKPI } from "@/lib/types/qa";

type ObsRow = QAObservation & { profiles: { name: string } | null; classes: { name: string } | null };
type RiskRow = StudentRiskFlag & { students: { name: string } | null };
type IntRow = Intervention & { students: { name: string } | null };

export function useQA() {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const [observations, setObservations] = useState<QAObservation[]>([]);
    const [risks, setRisks] = useState<StudentRiskFlag[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [kpis, setKpis] = useState<DailyKPI[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [obsRes, riskRes, intRes, kpiRes] = await Promise.all([
            supabase.from("qa_observations").select("*, profiles!teacher_id(name), classes(name)").order("date", { ascending: false }),
            supabase.from("student_risk_flags").select("*, students(name)").order("detected_at", { ascending: false }),
            supabase.from("interventions").select("*, students(name)").order("start_date", { ascending: false }),
            supabase.from("qa_kpis_daily").select("*").order("date", { ascending: true }) // Ascending for charts
        ]);

        if (obsRes.data) {
            setObservations((obsRes.data as unknown as ObsRow[]).map(o => ({
                ...o,
                teacher_name: o.profiles?.name,
                class_name: o.classes?.name
            })) as QAObservation[]);
        }

        if (riskRes.data) {
            setRisks((riskRes.data as unknown as RiskRow[]).map(r => ({
                ...r,
                student_name: r.students?.name
            })) as StudentRiskFlag[]);
        }

        if (intRes.data) {
            setInterventions((intRes.data as unknown as IntRow[]).map(i => ({
                ...i,
                student_name: i.students?.name
            })) as Intervention[]);
        }

        if (kpiRes.data) setKpis(kpiRes.data as DailyKPI[]);

        setLoading(false);
    }, []);

    async function addObservation(obs: { teacher_id: string; class_id: string; overall_score: number; notes: string }) {
        const { error } = await supabase.from("qa_observations").insert([obs]);
        if (error) setMsg(error.message);
        else { setMsg("✅ Observation Added"); loadData(); }
    }

    useEffect(() => {
        startTransition(async () => { await loadData(); });
    }, [loadData]);

    return {
        state: { observations, risks, interventions, kpis, loading, msg },
        actions: { setMsg, loadData, addObservation }
    };
}
