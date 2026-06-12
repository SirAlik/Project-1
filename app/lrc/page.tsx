import React from "react";
import { getActivePersona } from "@/lib/auth/context-service";
import { getCachedSchoolStats } from "@/lib/dashboard-data";
import { type UserRole } from "@/lib/auth/roles";
import { LrcWorkspace } from "./_components/LrcWorkspace";

export const metadata = { title: "مركز مصادر التعلم" };

export default async function LRCPage() {
    // الحارس app/lrc/layout.tsx يضمن مسبقاً school_librarian + schoolId.
    const persona = await getActivePersona();
    const role: UserRole = persona?.role ?? "school_librarian";
    const schoolId = persona?.schoolId ?? "";

    const stats = schoolId ? await getCachedSchoolStats(schoolId) : null;
    const schoolName = stats?.schoolName ?? "";

    return <LrcWorkspace schoolName={schoolName} role={role} />;
}
