import { useState, useEffect, useMemo, useCallback, startTransition } from "react";

import { useAuth } from "@/app/_context/AuthContext";
import { Subject, EventRow, StudentOption, EventType, GradebookItem, ParentNote } from "@/lib/types/classroom";
import {
    saveAttendanceAction,
    addEventAction,
    undoEventsAction,
    submitCleaningReportAction,
    saveStarsAction,
    saveParentNoteAction,
    saveSeatingMapAction,
    saveStudentRolesAction,
    syncOfflineQueueAction,
} from "@/app/classroom/_actions";

export function useClassroom() {
    const { user, role, supabase } = useAuth();

    // State
    const [subject, setSubject] = useState<Subject>("عام");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Data
    const [students, setStudents] = useState<StudentOption[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [events, setEvents] = useState<EventRow[]>([]);
    type HealthAlert = { diabetes?: boolean; adhd?: boolean; vision?: boolean; restroom?: boolean };
    const [healthAlerts, setHealthAlerts] = useState<Record<string, HealthAlert>>({});

    // Undo System
    const [lastAction, setLastAction] = useState<{ type: 'batch_event'; ids: string[] } | null>(null);

    // Stars
    const [stars, setStars] = useState<string[]>([]);
    const [savingStars, setSavingStars] = useState(false);
    const [autoPick] = useState<string[]>([]);

    // Smart Classroom
    const [classStarted, setClassStarted] = useState(false);
    const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
    const [savingAttendance, setSavingAttendance] = useState(false);

    // --- Phase 2 State ---
    const [activeExits, setActiveExits] = useState<Record<string, { startTime: string; type: "دورة مياه" | "عيادة" | "أخرى" }>>({});
    const [gradebookItems, setGradebookItems] = useState<GradebookItem[]>([]);
    const [studentRoles, setStudentRoles] = useState<Record<string, string>>({});
    const [seatingMap, setSeatingMap] = useState<Record<string, { x: number; y: number }>>({});
    const [parentNotes] = useState<ParentNote[]>([]);
    const [badges, setBadges] = useState<Record<string, string[]>>({}); // studentId -> badge types
    const [offlineQueue, setOfflineQueue] = useState<Record<string, unknown>[]>([]);

    // Picker State
    const [picking, setPicking] = useState(false);
    const [pickedStudent, setPickedStudent] = useState<StudentOption | null>(null);
    const [alreadyPicked, setAlreadyPicked] = useState<string[]>([]);
    const [pickerType, setPickerType] = useState<"standard" | "train">("standard");

    // Today's Exit Frequency
    const todayExitCount = useMemo(() => {
        const counts: Record<string, number> = {};
        const today = new Date().toISOString().split('T')[0];

        events
            .filter(e => e.action_category === 'exit' && e.created_at?.startsWith(today))
            .forEach(e => {
                if (e.student_id) {
                    counts[e.student_id] = (counts[e.student_id] || 0) + 1;
                }
            });
        return counts;
    }, [events]);

    // Daily Scores
    const dailyScores = useMemo(() => {
        const scores: Record<string, number> = {};
        const today = new Date().toISOString().split('T')[0];

        events.filter(e => e.created_at?.startsWith(today)).forEach(e => {
            if (!e.student_id) return;
            const type = e.type as string;

            // Positive actions
            const positive = ["شارك اليوم", "تفكير إبداعي", "مبادرة/قيادة", "التزام وانضباط", "تميز ملحوظ", "نجم الحصة 1", "نجم الحصة 2", "نجم الحصة 3"];
            // Negative actions
            const negative = ["تأخر عن دخول الحصة", "مقاطعة", "حديث جانبي", "عدم إحضار واجب", "عدم إحضار الأدوات", "نوم في الحصة", "عرقلة سير الحصة", "لم يسمّع القرآن"];

            if (positive.includes(type)) {
                scores[e.student_id] = (scores[e.student_id] || 0) + (e.points_delta || 1);
            } else if (negative.includes(type)) {
                scores[e.student_id] = (scores[e.student_id] || 0) - (Math.abs(e.points_delta || 1));
            }
        });
        return scores;
    }, [events]);

    // Modals
    const [modals, setModals] = useState({
        referral: false,
        excuse: false,
        cleaning: false,
        parentNote: false,
        gradebook: false,
        groups: false,
        picker: false,
        seating: false,
        badges: false
    });

    // Helpers
    const selectedStudentName = useMemo(() => {
        if (selectedStudentIds.length === 1) {
            return students.find(s => s.id === selectedStudentIds[0])?.name || "";
        }
        if (selectedStudentIds.length > 1) {
            return `${selectedStudentIds.length} طلاب مختارين`;
        }
        return "";
    }, [students, selectedStudentIds]);

    // --- Loaders ---

    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("student_profiles")
                .select("id, name")
                .order("name");

            if (error) throw error;

            const list = (data || []) as StudentOption[];
            setStudents(list);

            const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
            list.forEach(s => { initialAttendance[s.id] = 'present'; });
            setAttendance(initialAttendance);

        } catch (e: unknown) {
            setMsg(`⚠️ فشل تحميل الطلاب: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            // Load events for today or recent (simplified)
            const { data, error } = await supabase
                .from("events")
                .select("id, created_at, student_id, student_name_cached, type, note")
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;
            setEvents((data || []) as EventRow[]);
        } catch (e: unknown) {
            setMsg(`⚠️ فشل تحميل السجل: ${e instanceof Error ? e.message : String(e)}`);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    const loadHealthAlerts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("cases")
                .select("student_id, details")
                .eq("category", "صحي")
                .eq("status", "مفتوحة");

            if (error) throw error;

            const map: Record<string, HealthAlert> = {};
            data?.forEach(c => {
                if (c.student_id && c.details) {
                    try {
                        const parsed = JSON.parse(c.details) as { health?: HealthAlert };
                        if (parsed.health) map[c.student_id] = parsed.health;
                    } catch { }
                }
            });
            setHealthAlerts(map);
        } catch (e: unknown) {
            console.error("Health alerts fetch failed", e);
        }
    }, [supabase]);

    // --- Logic ---

    function startClass() {
        setClassStarted(true);
        setMsg("✅ بدأت الحصة! تم تسجيل جميع الطلاب حضور افتراضياً.");
    }

    function toggleAttendance(studentId: string) {
        setAttendance(prev => {
            const current = prev[studentId] || 'present';
            let next: 'present' | 'absent' | 'late';
            if (current === 'present') next = 'absent';
            else if (current === 'absent') next = 'late';
            else next = 'present';
            return { ...prev, [studentId]: next };
        });
    }

    function toggleSelection(studentId: string) {
        setSelectedStudentIds(prev => {
            if (prev.includes(studentId)) return prev.filter(id => id !== studentId);
            return [...prev, studentId];
        });
    }

    async function saveAttendance() {
        setSavingAttendance(true);
        const now = new Date();

        const absentOrLate = Object.entries(attendance).filter(([, status]) => status !== 'present');

        if (absentOrLate.length === 0) {
            setMsg("✅ تم الحفظ (الكل حاضر)");
            setClassStarted(false);
            setSavingAttendance(false);
            return;
        }

        const rows = absentOrLate.map(([id, status]) => {
            const student = students.find(s => s.id === id);
            return {
                studentId: id,
                studentName: student?.name,
                status: status as 'absent' | 'late',
                note: status === 'late' ? `دخل في ${now.toLocaleTimeString('ar-SA')}` : undefined,
            };
        });

        const result = await saveAttendanceAction(rows);
        if (!result.ok) {
            setMsg(`خطأ حفظ الحضور: ${result.error ?? "خطأ"}`);
        } else {
            setMsg("✅ تم اعتماد كشف الحضور وإرساله لوكيل الطلاب.");
            setClassStarted(false);
            loadEvents();
        }
        setSavingAttendance(false);
    }

    async function updateStudentStatus(studentId: string, status: 'present' | 'absent' | 'late') {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const result = await addEventAction([{
            student_id: studentId,
            student_name_cached: student.name,
            type: status === 'absent' ? 'غائب' : (status === 'late' ? 'متأخر' : 'تحويل لحاضر'),
            note: `تحديث يدوي للحالة إلى ${status} في ${new Date().toLocaleTimeString('ar-SA')}`,
            event_date: new Date().toISOString().split('T')[0],
        }]);

        if (!result.ok) setMsg(`خطأ في التحديث: ${result.error ?? "خطأ"}`);
        else {
            setAttendance(prev => ({ ...prev, [studentId]: status }));
            setMsg(`✅ تم تحديث حالة ${student.name} إلى ${status === 'late' ? 'متأخر' : status}`);
            loadEvents();
        }
    }

    async function submitCleaningReport(rating: number, comment: string) {
        const result = await submitCleaningReportAction(user?.id ?? '', rating, comment);
        if (!result.ok) {
            await addEvent("بلاغ نظافة" as EventType, `التقييم: ${rating}/5 - ${comment}`);
        } else {
            setMsg("🚨 تم إرسال بلاغ النظافة لمدير المدرسة.");
        }
        setModals(p => ({ ...p, cleaning: false }));
    }

    async function addEvent(type: EventType, note?: string, pointsDelta?: number, category: EventRow['action_category'] = 'discipline') {
        if (selectedStudentIds.length === 0) {
            setMsg("⚠️ اختر طالبًا أولاً.");
            return;
        }
        setMsg("");

        if (type === "لم يسمّع القرآن" && subject !== "إسلامية") {
            setMsg("⚠️ خيار (لم يسمّع القرآن) مخصص لمعلمي الإسلامية فقط.");
            return;
        }

        const payload = selectedStudentIds.map(id => {
            const st = students.find(s => s.id === id);
            return {
                student_id: id,
                student_name_cached: st?.name,
                type,
                note: note?.trim() || null,
                actor_role_cached: role ?? undefined,
                action_category: category,
                points_delta: pointsDelta || 0,
                event_date: new Date().toISOString().split('T')[0],
            };
        });

        // Offline Resilience: Try Server Action, if fail, queue locally
        try {
            const result = await addEventAction(payload);
            if (!result.ok) throw new Error(result.error ?? 'خطأ');

            setLastAction({ type: 'batch_event', ids: result.data?.ids ?? [] });
            await loadEvents();
        } catch {
            setOfflineQueue(prev => [...prev, ...payload]);
            setMsg("📴 تعذر الاتصال بالسيرفر. تم حفظ الإجراء محلياً وسيتم المزامنة لاحقاً.");
        }

        setSelectedStudentIds([]);
        setTimeout(() => setMsg(""), 5000);
    }

    async function awardBadge(studentId: string, badgeType: string) {
        setBadges(prev => {
            const current = prev[studentId] || [];
            if (current.includes(badgeType)) return prev;
            return { ...prev, [studentId]: [...current, badgeType] };
        });

        const student = students.find(s => s.id === studentId);
        await addEvent(`وسام: ${badgeType}` as EventType, `تم منح الوسام لـ ${student?.name}`, 5, 'academic');
        setMsg(`🏅 تم منح وسام (${badgeType}) للطالب ${student?.name}`);
    }

    async function undoLastAction() {
        if (!lastAction) return;

        if (lastAction.type === 'batch_event') {
            const result = await undoEventsAction(lastAction.ids);
            if (!result.ok) {
                setMsg(`⚠️ فشل التراجع: ${result.error ?? "خطأ"}`);
            } else {
                setMsg("🔄 تم التراجع عن الإجراء الأخير.");
                setLastAction(null);
                loadEvents();
            }
        }
    }

    // --- Phase 2 Actions ---

    async function startExit(studentId: string, type: "دورة مياه" | "عيادة" | "أخرى") {
        setActiveExits(prev => ({
            ...prev,
            [studentId]: { startTime: new Date().toISOString(), type }
        }));

        const st = students.find(s => s.id === studentId);
        const result = await addEventAction([{
            student_id: studentId,
            student_name_cached: st?.name,
            type,
            action_category: 'exit',
            event_date: new Date().toISOString().split('T')[0],
        }]);

        if (!result.ok) {
            console.error("Exit log failed", result.error);
        } else {
            loadEvents();
        }

        setMsg(`🏃 خرج ${st?.name} (${type})`);
    }

    async function endExit(studentId: string) {
        const exit = activeExits[studentId];
        if (!exit) return;

        const startTime = new Date(exit.startTime);
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        const result = await addEventAction([{
            student_id: studentId,
            student_name_cached: students.find(s => s.id === studentId)?.name,
            type: exit.type === "دورة مياه" ? "دورة مياه - عاد" : "عودة من العيادة",
            note: `المدة: ${duration} دقيقة`,
            action_category: 'utility',
            event_date: endTime.toISOString().split('T')[0],
        }]);

        if (!result.ok) setMsg(`خطأ في تسجيل العودة: ${result.error ?? "خطأ"}`);
        else {
            setActiveExits(prev => {
                const updated = { ...prev };
                delete updated[studentId];
                return updated;
            });
            setMsg(`↩️ عاد الطالب بعد ${duration} دقيقة.`);
            loadEvents();
        }
    }

    function pickRandomStudent(noRepeat = true) {
        setPicking(true);
        setPickedStudent(null);

        let pool = students;
        if (noRepeat && alreadyPicked.length < pool.length) {
            pool = students.filter(s => !alreadyPicked.includes(s.id));
        }

        if (pool.length === 0) {
            setMsg("⚠️ تم اختيار جميع الطلاب في هذه الجلسة!");
            setPicking(false);
            return;
        }

        const picked = pool[Math.floor(Math.random() * pool.length)];

        // Visual countdown simulation
        setTimeout(() => {
            setPickedStudent(picked);
            setAlreadyPicked(prev => [...prev, picked.id]);
            setPicking(false);
        }, pickerType === "train" ? 2000 : 1500);
    }

    function redistributeGroups(count: number, bySize = false, pinnedIds: string[] = []) {
        // Filter out pinned students from the random pool
        const pool = students
            .filter(s => !pinnedIds.includes(s.id))
            .sort(() => Math.random() - 0.5);

        const groups: string[][] = [];

        if (bySize) {
            // Group by size (count = size of each group)
            const numGroups = Math.ceil(pool.length / count);
            for (let i = 0; i < numGroups; i++) groups.push([]);

            // Re-integrate pinned students (simple logic: spread them or keep at start)
            // For simplicity, we just distribute the remaining pool
            pool.forEach((s, i) => groups[i % numGroups].push(s.id));
        } else {
            // Group by count (count = total number of groups)
            for (let i = 0; i < count; i++) groups.push([]);
            pool.forEach((s, i) => groups[i % count].push(s.id));
        }

        setMsg(`📦 تم توزيع ${groups.length} مجموعات عشوائية (مع استبعاد المثبتين).`);
        return groups;
    }

    async function saveParentNote(studentId: string, content: string, urgency: "low" | "medium" | "high") {
        const result = await saveParentNoteAction(studentId, content, urgency);
        if (!result.ok) setMsg(`⚠️ فشل إرسال الملاحظة: ${result.error ?? "خطأ"}`);
        else setMsg("📧 تم إرسال الملاحظة لولي الأمر بنجاح.");
    }

    async function sendReferral(reason: string) {
        if (reason.length < 5) {
            setMsg("⚠️ اكتب سبباً واضحاً.");
            return false;
        }
        await addEvent("تحويل إلى وكيل شؤون الطلاب", reason);
        setModals(p => ({ ...p, referral: false }));
        return true;
    }

    async function sendExcuse(note: string) {
        if (note.length < 2) {
            setMsg("⚠️ اكتب ملاحظة.");
            return false;
        }
        await addEvent("استئذان", note);
        setModals(p => ({ ...p, excuse: false }));
        return true;
    }

    // Stars Logic
    function toggleStar(studentName: string) {
        setStars(prev => {
            if (prev.includes(studentName)) return prev.filter(s => s !== studentName);
            if (prev.length >= 3) {
                setMsg("⚠️ اختر 3 نجوم فقط.");
                return prev;
            }
            return [...prev, studentName];
        });
    }

    async function saveStars() {
        if (stars.length !== 3) {
            setMsg("⚠️ اختر 3 نجوم.");
            return;
        }
        setSavingStars(true);

        const starsPayload = stars.map(name => {
            const sObj = students.find(s => s.name === name);
            return { studentId: sObj?.id ?? '', studentName: name };
        });

        const result = await saveStarsAction(starsPayload);
        setSavingStars(false);

        if (!result.ok) setMsg(`خطأ حفظ النجوم: ${result.error ?? "خطأ"}`);
        else {
            setMsg("✅ تم حفظ النجوم.");
            setStars([]);
            loadEvents();
        }
    }

    // Sync Offline Queue
    useEffect(() => {
        if (navigator.onLine && offlineQueue.length > 0) {
            const sync = async () => {
                const result = await syncOfflineQueueAction(
                    offlineQueue as Parameters<typeof syncOfflineQueueAction>[0]
                );
                if (result.ok) {
                    setOfflineQueue([]);
                    setMsg("📡 تم مزامنة البيانات المخزنة محلياً.");
                    loadEvents();
                }
            };
            sync();
        }
    }, [offlineQueue, loadEvents]);

    const loadPhase2Data = useCallback(async () => {
        try {
            // Load gradebook items
            const { data: gbData } = await supabase.from("gradebook_items").select("*");
            if (gbData) setGradebookItems(gbData);

            // Load seating and roles from a metadata table (will provide SQL)
            const { data: metaData } = await supabase
                .from("classroom_metadata")
                .select("seating_map, student_roles")
                .single();

            if (metaData) {
                if (metaData.seating_map) setSeatingMap(metaData.seating_map);
                if (metaData.student_roles) setStudentRoles(metaData.student_roles);
            }
        } catch (e) {
            console.error("Phase 2 data load failed (tables might not exist yet)", e);
        }
    }, [supabase]);

    async function saveSeatingMap(newMap: Record<string, { x: number; y: number }>) {
        setSeatingMap(newMap);
        const result = await saveSeatingMapAction(undefined, newMap);
        if (!result.ok) setMsg(`⚠️ فشل حفظ الخريطة: ${result.error ?? "خطأ"}`);
        else setMsg("✅ تم حفظ مخطط الجلوس.");
    }

    async function saveStudentRoles(newRoles: Record<string, string>) {
        setStudentRoles(newRoles);
        const result = await saveStudentRolesAction(undefined, newRoles);
        if (!result.ok) setMsg(`⚠️ فشل حفظ الأدوار: ${result.error ?? "خطأ"}`);
        else setMsg("✅ تم تحديث أدوار الطلاب.");
    }

    // --- Effects ---
    useEffect(() => {
        startTransition(async () => {
            await loadStudents();
            await loadHealthAlerts();
            await loadEvents();
            await loadPhase2Data();
        });
    }, [loadStudents, loadHealthAlerts, loadEvents, loadPhase2Data]);


    return {
        state: {
            user, role, msg, loading,
            subject, students, selectedStudentIds, selectedStudentName,
            events, stars, savingStars, autoPick, modals,
            classStarted, attendance, savingAttendance, healthAlerts,
            dailyScores, lastAction, todayExitCount,
            activeExits, gradebookItems, studentRoles, seatingMap, parentNotes, badges,
            picking, pickedStudent, alreadyPicked, pickerType
        },
        actions: {
            setSubject, setMessage: setMsg,
            toggleSelection,
            addEvent,
            undoLastAction,
            toggleModal: (key: keyof typeof modals, val: boolean) => setModals(p => ({ ...p, [key]: val })),
            sendReferral, sendExcuse,
            toggleStar, saveStars,
            startClass, toggleAttendance, saveAttendance, updateStudentStatus, submitCleaningReport,
            // Phase 2
            startExit, endExit,
            pickRandomStudent, setPickerType,
            redistributeGroups, saveParentNote,
            saveSeatingMap, saveStudentRoles,
            awardBadge, setSeatingMap, setStudentRoles
        }
    };
}
