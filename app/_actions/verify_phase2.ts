"use server";

import { supabaseAdmin } from "@/lib/db/supabase-admin";

type CheckStatus = "PASS" | "FAIL" | "WARN" | "INFO";

interface ReportCheck {
    name: string;
    expected?: unknown;
    actual?: unknown;
    status: CheckStatus;
    details?: unknown;
}

interface VerificationReport {
    checks: ReportCheck[];
    summary: string;
    errors: number;
    error?: string;
}

export async function verifyPhase2Data(): Promise<VerificationReport> {
    const report: VerificationReport = {
        checks: [],
        summary: "Pending",
        errors: 0,
    };

    try {
        // ============================================================
        // A) System Owners Count
        // ============================================================
        const { count: ownerCountRaw } = await supabaseAdmin
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("system_role", "system_owner");

        const ownerCount = ownerCountRaw ?? 0;

        report.checks.push({
            name: "A) System Owners Count",
            expected: 1,
            actual: ownerCount,
            status: ownerCount === 1 ? "PASS" : "FAIL",
        });

        // ============================================================
        // B) Profiles Missing Personas
        // ============================================================
        const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name");

        const { data: personas } = await supabaseAdmin
            .from("user_personas")
            .select("user_id");

        const personaUserIds = new Set(personas?.map(p => p.user_id));
        const missing = profiles?.filter(p => !personaUserIds.has(p.id)) ?? [];

        report.checks.push({
            name: "B) Profiles without Personas",
            expected: 0,
            actual: missing.length,
            details: missing.map(m => m.full_name).slice(0, 5),
            status: missing.length === 0 ? "PASS" : "FAIL",
        });

        // ============================================================
        // C) Duplicate Personas (user_id + school_id + role)
        // ============================================================
        const dupMap = new Map<string, number>();
        let dupCount = 0;

        // Full fetch required to detect duplicates reliably
        const { data: allPersonas } = await supabaseAdmin
            .from("user_personas")
            .select("user_id, school_id, role");

        allPersonas?.forEach(p => {
            const key = `${p.user_id}-${p.school_id}-${p.role}`;
            dupMap.set(key, (dupMap.get(key) ?? 0) + 1);
        });

        Array.from(dupMap.values()).forEach(count => {
            if (count > 1) dupCount++;
        });

        report.checks.push({
            name: "C) Duplicate Personas",
            expected: 0,
            actual: dupCount,
            status: dupCount === 0 ? "PASS" : "FAIL",
        });

        // ============================================================
        // D) Invite Hashing Status
        // ============================================================
        const { count: unhashedRaw } = await supabaseAdmin
            .from("invites")
            .select("*", { count: "exact", head: true })
            .is("token_hash", null);

        const { count: hashedRaw } = await supabaseAdmin
            .from("invites")
            .select("*", { count: "exact", head: true })
            .not("token_hash", "is", null);

        report.checks.push({
            name: "D) Hashed Invites Count",
            expected: "> 0 (if new invites created)",
            actual: hashedRaw ?? 0,
            status: "INFO",
        });

        report.checks.push({
            name: "D) Unhashed Invites (Legacy)",
            expected: "Any",
            actual: unhashedRaw ?? 0,
            status: "INFO",
        });

        // ============================================================
        // E) Audit Log Activity
        // ============================================================
        const { data: logs } = await supabaseAdmin
            .from("role_audit_logs")
            .select("action")
            .limit(100);

        const logCounts = (logs ?? []).reduce<Record<string, number>>((acc, log) => {
            acc[log.action] = (acc[log.action] ?? 0) + 1;
            return acc;
        }, {});

        report.checks.push({
            name: "E) Audit Log Activity",
            actual: logCounts,
            status: (logCounts["INVITE_CREATED"] || logCounts["PERSONA_ADD"]) ? "PASS" : "WARN",
        });

        // ============================================================
        // Overall Summary
        // ============================================================
        report.errors = report.checks.filter(c => c.status === "FAIL").length;
        report.summary =
            report.errors === 0
                ? "READY FOR PHASE 2.3"
                : "BLOCKERS DETECTED";

    } catch (e: unknown) {
        report.error = e instanceof Error ? e.message : String(e);
        report.summary = "CRITICAL ERROR";
    }

    return report;
}