import { useState, useEffect, useMemo, useCallback, startTransition } from "react";

import { useAuth } from "@/app/_context/AuthContext";
import { Subject, EventRow, StudentOption, EventType, GradebookItem, ParentNote } from "@/lib/types/classroom";
import {
    saveAttendanceAction,
    addEventAction,
    undoEventsAction,
    saveStarsAction,
    saveParentNoteAction,
    saveSeatingMapAction,
    saveStudentRolesAction,
    syncOfflineQueueAction,
    startClassExitAction,
    endClassExitAction,
} from "@/app/classroom/_actions";

const CLASS_NOT_LINKED_MSG = 'لا يمكن حفظ هذا الإجراء لأن الفصل غير مرتبط بسجل قاعدة البيانات.';

export function useClassroom(classId?: string) {
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
    const [activeExits, setActiveExits] = useState<Record<string, { startTime: string; type: "دورة مياه" | "عيادة" | "أخرى"; exitId?: string }>>({});
    const [todayExits, setTodayExits] = useState<{ student_id: string }[]>([]);
    const [gradebookItems, setGradebookItems] = useState<GradebookItem[]>([]);
    const [studentRoles, setStudentRoles] = useState<Record<string, string>>({});
    const [seatingMap, setSeatingMap] = useState<Record<string, { x: number; y: number }>>({});
    const [parentNotes] = useState<ParentNote[]>([]);
    const [badges] = useState<Record<string, string[]>>({}); // studentId -> badge types (غير مفعّل بعد)
    const [offlineQueue, setOfflineQueue] = useState<Record<string, unknown>[]>([]);

    // Picker State
    const [picking, setPicking] = useState(false);
    const [pickedStudent, setPickedStudent] = useState<StudentOption | null>(null);
    const [alreadyPicked, setAlreadyPicked] = useState<string[]>([]);
    const [pickerType, setPickerType] = useState<"standard" | "train">("standard");

    // Today's Exit Frequency — يُحسب من classroom_exits (المصدر الصحيح للخروج الصفّي)
    const todayExitCount = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const ex of todayExits) {
            if (ex.student_id) counts[ex.student_id] = (counts[ex.student_id] || 0) + 1;
        }
        return counts;
    }, [todayExits]);

    // Daily Scores
    const dailyScores = useMemo(() => {
        const scores: Record<string, number> = {};
        const today = new Date().toISOString().split('T')[0];

        events.filter(e => e.created_at?.startsWith(today)).forEach(e => {
            if (!e.student_id) return;
            // المصدر: metadata.app_type (المفهوم الأصلي المحفوظ) لأن type يُخزَّن مُجمَّعاً في enum (مثل "مخالفة").
            const meta = e.metadata as { app_type?: string } | null | undefined;
            const type = (meta?.app_type as string) ?? (e.type as string);

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
            // قائمة طلاب الفصل المحدَّد فقط (RLS يحصر المدرسة؛ class_id يحصر الفصل)
            let q = supabase.from("student_profiles").select("id, name");
            if (classId) q = q.eq("class_id", classId);
            const { data, error } = await q.order("name");

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
    }, [supabase, classId]);

    const loadEvents = useCallback(async () => {
        setLoading(true);
        try {
            // سجلّ أحداث الفصل المحدَّد (metadata يحمل النوع الأصلي للنقاط اليومية)
            let q = supabase
                .from("events")
                .select("id, created_at, student_id, student_name_cached, type, note, metadata, action_category, points_delta")
                .order("created_at", { ascending: false })
                .limit(200);
            if (classId) q = q.eq("class_id", classId);
            const { data, error } = await q;

            if (error) throw error;
            setEvents((data || []) as EventRow[]);
        } catch (e: unknown) {
            setMsg(`⚠️ فشل تحميل السجل: ${e instanceof Error ? e.message : String(e)}`);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [supabase, classId]);

    // تحميل خروجات اليوم من classroom_exits: العدّاد + استعادة الخروجات النشطة (بلا عودة)
    const loadExits = useCallback(async () => {
        if (!classId) { setTodayExits([]); setActiveExits({}); return; }
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from("classroom_exits")
                .select("id, student_id, exit_type, exit_time, return_time")
                .eq("class_id", classId)
                .eq("exit_date", today);

            const rows = (data ?? []) as { id: string; student_id: string; exit_type: string; exit_time: string; return_time: string | null }[];
            setTodayExits(rows.map(r => ({ student_id: r.student_id })));

            const active: Record<string, { startTime: string; type: "دورة مياه" | "عيادة" | "أخرى"; exitId?: string }> = {};
            for (const r of rows) {
                if (!r.return_time) {
                    const t = (r.exit_type === 'دورة مياه' || r.exit_type === 'عيادة' || r.exit_type === 'أخرى') ? r.exit_type : 'أخرى';
                    active[r.student_id] = { startTime: r.exit_time, type: t as "دورة مياه" | "عيادة" | "أخرى", exitId: r.id };
                }
            }
            setActiveExits(active);
        } catch (e) {
            console.error("Exits load failed", e);
        }
    }, [supabase, classId]);

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

        const result = await saveAttendanceAction(rows, classId);
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

        // "حاضر" ليست قيمة في enum event_type — تحديث محلي فقط بلا إدراج حدث.
        if (status === 'present') {
            setAttendance(prev => ({ ...prev, [studentId]: 'present' }));
            return;
        }

        const label = status === 'absent' ? 'غياب' : 'تأخر';
        const result = await addEventAction([{
            student_id: studentId,
            student_name_cached: student.name,
            type: label, // قيمة enum صحيحة (كانت "غائب"/"متأخر" مرفوضة)
            note: `تحديث يدوي للحالة إلى ${label} في ${new Date().toLocaleTimeString('ar-SA')}`,
            event_date: new Date().toISOString().split('T')[0],
            class_id: classId,
        }]);

        if (!result.ok) setMsg(`⚠️ ${result.error ?? "تعذّر تحديث الحالة"}`);
        else {
            setAttendance(prev => ({ ...prev, [studentId]: status }));
            setMsg(`✅ تم تحديث حالة ${student.name} إلى ${label}`);
            loadEvents();
        }
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
                class_id: classId,
            };
        });

        // مرونة الاتصال: فشل الشبكة (throw) → طابور محلي. رفض الخادم (ok:false) → خطأ صادق،
        // لا يُخفى أبداً كحفظ محلي (كان هذا يُوهم المعلّم بنجاح كتابة فاشلة فعلاً).
        let result: Awaited<ReturnType<typeof addEventAction>>;
        try {
            result = await addEventAction(payload);
        } catch {
            setOfflineQueue(prev => [...prev, ...payload]);
            setMsg("📴 تعذّر الاتصال بالخادم. حُفظ الإجراء محلياً وستتم المزامنة عند عودة الاتصال.");
            setSelectedStudentIds([]);
            setTimeout(() => setMsg(""), 5000);
            return;
        }

        if (!result.ok) {
            setMsg(`⚠️ ${result.error ?? 'تعذّر تسجيل الإجراء'}`);
            setSelectedStudentIds([]);
            setTimeout(() => setMsg(""), 5000);
            return;
        }

        setLastAction({ type: 'batch_event', ids: result.data?.ids ?? [] });
        await loadEvents();
        setSelectedStudentIds([]);
        setTimeout(() => setMsg(""), 5000);
    }

    async function awardBadge(_studentId: string, _badgeType: string) {
        // الأوسمة مكافأة لا تُمثَّل في enum event_type ولا يوجد جدول مكافآت صفّي — لا ادّعاء نجاح
        // ولا تخزين محلي وهمي. تفعيلها لاحقاً عبر طبقة gamification (انظر تقرير الإغلاق).
        setMsg("⚠️ منح الأوسمة غير مفعّل بعد في السجل الرسمي.");
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
        const st = students.find(s => s.id === studentId);
        // الخروج الصفّي يُخزَّن في classroom_exits ويتطلب فصلاً حقيقياً
        if (!classId) { setMsg(`⚠️ ${CLASS_NOT_LINKED_MSG}`); return; }

        const result = await startClassExitAction({ classId, studentId, exitType: type });
        if (!result.ok || !result.data) {
            // لا ادّعاء خروج إذا لم يُسجَّل فعلاً
            setMsg(`⚠️ ${result.error ?? 'تعذّر تسجيل الخروج'}`);
            return;
        }

        setActiveExits(prev => ({
            ...prev,
            [studentId]: { startTime: new Date().toISOString(), type, exitId: result.data!.id }
        }));
        await loadExits();
        setMsg(`🏃 خرج ${st?.name} (${type})`);
    }

    async function endExit(studentId: string) {
        const exit = activeExits[studentId];
        if (!exit) return;

        // تسجيل العودة فعلياً في classroom_exits (return_time + duration) — لا قيمة وهمية
        if (exit.exitId) {
            const result = await endClassExitAction(exit.exitId);
            if (!result.ok) {
                setMsg(`⚠️ ${result.error ?? 'تعذّر تسجيل العودة'}`);
                return;
            }
        }

        const duration = Math.round((Date.now() - new Date(exit.startTime).getTime()) / 60000);
        setActiveExits(prev => {
            const updated = { ...prev };
            delete updated[studentId];
            return updated;
        });
        await loadExits();
        setMsg(`↩️ عاد الطالب بعد ${duration} دقيقة.`);
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

            // Load seating and roles for THIS class only (class_id فريد في classroom_metadata)
            if (classId) {
                const { data: metaData } = await supabase
                    .from("classroom_metadata")
                    .select("seating_map, student_roles")
                    .eq("class_id", classId)
                    .maybeSingle();

                if (metaData) {
                    if (metaData.seating_map) setSeatingMap(metaData.seating_map);
                    if (metaData.student_roles) setStudentRoles(metaData.student_roles);
                }
            }
        } catch (e) {
            console.error("Phase 2 data load failed (tables might not exist yet)", e);
        }
    }, [supabase, classId]);

    async function saveSeatingMap(newMap: Record<string, { x: number; y: number }>) {
        setSeatingMap(newMap);
        if (!classId) { setMsg(`⚠️ ${CLASS_NOT_LINKED_MSG}`); return; }
        const result = await saveSeatingMapAction(classId, newMap);
        if (!result.ok) setMsg(`⚠️ فشل حفظ الخريطة: ${result.error ?? "خطأ"}`);
        else setMsg("✅ تم حفظ مخطط الجلوس.");
    }

    async function saveStudentRoles(newRoles: Record<string, string>) {
        setStudentRoles(newRoles);
        if (!classId) { setMsg(`⚠️ ${CLASS_NOT_LINKED_MSG}`); return; }
        const result = await saveStudentRolesAction(classId, newRoles);
        if (!result.ok) setMsg(`⚠️ فشل حفظ الأدوار: ${result.error ?? "خطأ"}`);
        else setMsg("✅ تم تحديث أدوار الطلاب.");
    }

    // --- Effects ---
    useEffect(() => {
        startTransition(async () => {
            await loadStudents();
            await loadHealthAlerts();
            await loadEvents();
            await loadExits();
            await loadPhase2Data();
        });
    }, [loadStudents, loadHealthAlerts, loadEvents, loadExits, loadPhase2Data]);


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
            startClass, toggleAttendance, saveAttendance, updateStudentStatus,
            // Phase 2
            startExit, endExit,
            pickRandomStudent, setPickerType,
            redistributeGroups, saveParentNote,
            saveSeatingMap, saveStudentRoles,
            awardBadge, setSeatingMap, setStudentRoles
        }
    };
}
