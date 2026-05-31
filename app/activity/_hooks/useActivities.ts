import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import {
    ActivityFinancial,
    ActivityClub,
    ClubAssignment,
    ClubEvaluation,
    StudentWish,
    StudentHonor,
    ActivityTrip,
    TripConsent,
    ActivityEvent
} from "@/lib/types/activity";

// أنواع دقيقة تعكس ما ترسله النماذج فعلياً
export type FinancialInput = {
    item_name: string;
    category: string;
    amount: number;
    school_year: string;
    date: string;
    notes: string;
    invoice_number?: string;
};

export type AddClubInput = {
    name: string;
    category: ActivityClub['category'];
    description: string;
    location: string;
    capacity: number;
};

export type AssignTeacherInput = {
    club_id: string;
    teacher_id: string;
    role: 'supervisor' | 'assistant';
};

export type EvalInput = {
    assignment_id: string;
    performance_score: number;
    engagement_score: number;
    notes: string;
};

export type SubmitWishInput = {
    student_id: string;
    first_choice: string;
    second_choice: string;
    third_choice: string;
    school_year: string;
};

export type AwardInput = {
    student_id: string;
    reason: string;
    prize: string;
    awarded_date: string;
};

export type CreateTripInput = {
    title: string;
    destination: string;
    trip_date: string;
    target_classes: string[];
    cost: number;
};

export function useActivities() {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    // Data State
    const [financials, setFinancials] = useState<ActivityFinancial[]>([]);
    const [clubs, setClubs] = useState<ActivityClub[]>([]);
    const [assignments, setAssignments] = useState<ClubAssignment[]>([]);
    const [evaluations, setEvaluations] = useState<ClubEvaluation[]>([]);
    const [wishes, setWishes] = useState<StudentWish[]>([]);
    const [honors, setHonors] = useState<StudentHonor[]>([]);
    const [trips, setTrips] = useState<ActivityTrip[]>([]);
    const [consents, setConsents] = useState<TripConsent[]>([]);
    const [events, setEvents] = useState<ActivityEvent[]>([]);

    // Shared State
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [students, setStudents] = useState<{ id: string; name: string; class_id: string }[]>([]);
    const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [
                financialDetails,
                clubDetails,
                assignmentDetails,
                evaluationDetails,
                wishDetails,
                honorDetails,
                tripDetails,
                consentDetails,
                eventDetails,
                classDetails,
                studentDetails,
                teacherDetails
            ] = await Promise.all([
                supabase.from("activity_financials").select("*").order("date", { ascending: false }),
                supabase.from("activity_clubs").select("*").order("name"),
                supabase.from("club_assignments").select("*, activity_clubs(name), profiles(name)"),
                supabase.from("club_evaluations").select("*").order("evaluation_date", { ascending: false }),
                supabase.from("student_wishes").select("*, student_profiles(name)").order("submitted_at", { ascending: false }),
                supabase.from("student_honors").select("*, student_profiles(name)").order("awarded_date", { ascending: false }),
                supabase.from("activity_trips").select("*").order("trip_date", { ascending: false }),
                supabase.from("trip_consents").select("*, student_profiles(name), activity_trips(title)"),
                supabase.from("activity_events").select("*").order("date", { ascending: false }),
                supabase.from("classes").select("id, name"),
                supabase.from("student_profiles").select("id, name, class_id"),
                supabase.from("profiles").select("id, name").eq("role", "teacher")
            ]);

            if (financialDetails.data) setFinancials(financialDetails.data as ActivityFinancial[]);
            if (clubDetails.data) setClubs(clubDetails.data as ActivityClub[]);

            // أنواع محلية لنتائج JOIN — تشمل حقول ClubAssignment الأساسية
            type AssignmentRow = ClubAssignment & { activity_clubs: { name: string } | null; profiles: { name: string } | null };
            type WithStudentProfile = (StudentWish | StudentHonor) & { student_profiles: { name: string } | null };
            type ConsentRow = TripConsent & { student_profiles: { name: string } | null; activity_trips: { title: string } | null };

            // Map joined data for assignments
            if (assignmentDetails.data) {
                setAssignments(assignmentDetails.data.map((a: AssignmentRow) => ({
                    ...a,
                    club_name: a.activity_clubs?.name,
                    teacher_name: a.profiles?.name
                })) as ClubAssignment[]);
            }

            if (evaluationDetails.data) setEvaluations(evaluationDetails.data as ClubEvaluation[]);

            if (wishDetails.data) {
                setWishes(wishDetails.data.map((w: WithStudentProfile) => ({
                    ...w,
                    student_name: w.student_profiles?.name
                })) as StudentWish[]);
            }

            if (honorDetails.data) {
                setHonors(honorDetails.data.map((h: WithStudentProfile) => ({
                    ...h,
                    student_name: h.student_profiles?.name
                })) as StudentHonor[]);
            }

            if (tripDetails.data) setTrips(tripDetails.data as ActivityTrip[]);

            if (consentDetails.data) {
                setConsents(consentDetails.data.map((c: ConsentRow) => ({
                    ...c,
                    student_name: c.student_profiles?.name,
                    trip_title: c.activity_trips?.title
                })) as TripConsent[]);
            }

            if (eventDetails.data) setEvents(eventDetails.data as ActivityEvent[]);
            if (classDetails.data) setClasses(classDetails.data);
            if (studentDetails.data) setStudents(studentDetails.data);
            if (teacherDetails.data) setTeachers(teacherDetails.data);

        } catch (error: unknown) {
            setMsg("حدث خطأ أثناء تحميل البيانات: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Financial Actions ---
    async function addBudgetItem(item: FinancialInput) {
        const { error } = await supabase.from("activity_financials").insert([{ ...item, type: 'budget' }]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم إضافة بند الميزانية بنجاح");
            loadData();
        }
    }

    async function addExpense(expense: FinancialInput) {
        const { error } = await supabase.from("activity_financials").insert([{ ...expense, type: 'expense' }]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم تسجيل المصروف بنجاح");
            loadData();
        }
    }

    async function deleteFinancial(id: string) {
        const { error } = await supabase.from("activity_financials").delete().eq("id", id);
        if (error) setMsg(error.message);
        else {
            setMsg("🗑️ تم حذف السجل المالي");
            loadData();
        }
    }

    // --- Club & Staff Actions ---
    async function addClub(club: AddClubInput) {
        const { error } = await supabase.from("activity_clubs").insert([club]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم إنشاء النادي بنجاح");
            loadData();
        }
    }

    async function assignTeacher(assignment: AssignTeacherInput) {
        const { error } = await supabase.from("club_assignments").insert([assignment]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم تعيين المعلم للنادي");
            loadData();
        }
    }

    async function evaluatePerformance(evaluation: EvalInput) {
        const { error } = await supabase.from("club_evaluations").insert([evaluation]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم تسجيل التقييم بنجاح");
            loadData();
        }
    }

    // --- Student Participation Actions ---
    async function submitWish(wish: SubmitWishInput) {
        const { error } = await supabase.from("student_wishes").upsert([wish]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم تسجيل رغبة الطالب");
            loadData();
        }
    }

    async function awardStudent(honor: AwardInput) {
        const { error } = await supabase.from("student_honors").insert([honor]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم تكريم الطالب بنجاح");
            loadData();
        }
    }

    async function createTrip(trip: CreateTripInput) {
        const { data, error } = await supabase.from("activity_trips").insert([trip]).select().single();
        if (error) {
            setMsg(error.message);
            return null;
        } else {
            // Generate consents for all students in target classes
            const { data: studentsInClasses } = await supabase
                .from("student_profiles")
                .select("id")
                .in("class_id", trip.target_classes);

            if (studentsInClasses && studentsInClasses.length > 0) {
                const newConsents = studentsInClasses.map((s: { id: string }) => ({
                    trip_id: data.id,
                    student_id: s.id,
                    unique_link: crypto.randomUUID(),
                    parent_consent: false
                }));
                await supabase.from("trip_consents").insert(newConsents);
            }

            setMsg("✅ تم إنشاء الرحلة وتوليد روابط الموافقات بنجاح");
            loadData();
            return data;
        }
    }

    // --- Event Actions ---
    async function scheduleEvent(event: Omit<ActivityEvent, "id" | "created_at" | "participants_count">) {
        const { error } = await supabase.from("activity_events").insert([event]);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم جدولة الفعالية بنجاح");
            loadData();
        }
    }

    async function updateEvent(id: string, updates: Partial<ActivityEvent>) {
        const { error } = await supabase.from("activity_events").update(updates).eq("id", id);
        if (error) setMsg(error.message);
        else {
            setMsg("✅ تم تحديث الفعالية");
            loadData();
        }
    }

    async function deleteEvent(id: string) {
        const { error } = await supabase.from("activity_events").delete().eq("id", id);
        if (error) setMsg(error.message);
        else {
            setMsg("🗑️ تم حذف الفعالية");
            loadData();
        }
    }

    // --- Lifecycle ---
    useEffect(() => {
        startTransition(async () => { await loadData(); });
    }, [loadData]);

    // --- Stats & KPIs ---
    const totalBudget = financials.filter(f => f.type === 'budget').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalExpenses = financials.filter(f => f.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);

    const stats = {
        totalBudget,
        totalExpenses,
        expenseRatio: totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
        activeClubs: clubs.filter(c => c.active).length,
        honoredStudents: honors.length,
        upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length,
        totalWishes: wishes.length
    };

    return {
        state: {
            financials, clubs, assignments, evaluations,
            wishes, honors, trips, consents, events,
            classes, students, teachers,
            loading, msg,
            stats
        },
        actions: {
            setMsg,
            loadData,
            addBudgetItem,
            addExpense,
            deleteFinancial,
            addClub,
            assignTeacher,
            evaluatePerformance,
            submitWish,
            awardStudent,
            createTrip,
            scheduleEvent,
            updateEvent,
            deleteEvent
        }
    };
}
