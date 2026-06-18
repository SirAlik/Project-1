import { getActivePersona } from "@/lib/auth/context-service";
import { type UserRole } from "@/lib/auth/roles";
import { LrcWorkspace } from "./_components/LrcWorkspace";

export const metadata = { title: "مركز مصادر التعلم" };

export default async function LRCPage() {
    // الحارس app/lrc/layout.tsx يضمن مسبقاً school_librarian + schoolId.
    // اسم المدرسة + الدور يظهران في شريط RoleDashboardShell عبر useAuth (لا يلزم تمريرهما هنا).
    const persona = await getActivePersona();
    const role: UserRole = persona?.role ?? "school_librarian";

    return <LrcWorkspace role={role} />;
}
