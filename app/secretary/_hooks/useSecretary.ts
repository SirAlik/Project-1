import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import {
    CorrespondenceRow,
    LeaveRow,
    Employee,
    AttendanceLog,
    HRInquiry,
    AssignmentLetter,
    Meeting,
    ProcurementRequest,
    MeetingAttendee
} from "@/lib/types/secretary";
import {
    addLetterAction,
    updateLetterStatusAction,
    deleteLetterAction,
    logAttendanceAction,
    updateInquiryAction,
    scheduleMeetingAction,
    addLeaveAction,
    updateLeaveStatusAction,
    submitProcurementAction,
    addAssignmentAction,
} from "@/app/secretary/_actions";

type LeaveFormInput = {
    employee_name: string;
    start_date: string;
    end_date: string;
    type: string;
    reason: string;
};

type MeetingScheduleInput = {
    title: FormDataEntryValue | null;
    meeting_date: FormDataEntryValue | null;
    meeting_time: FormDataEntryValue | null;
    location: FormDataEntryValue | null;
    description: FormDataEntryValue | null;
    meeting_type: string;
    status: string;
};

type ProcurementFormInput = {
    request_number: string;
    request_date: string;
    urgency: FormDataEntryValue | null;
    justification: FormDataEntryValue | null;
    items: { name: string; qty: number; specs: string }[];
    status: string;
};

// Re-export types used in components
export type { LeaveFormInput, MeetingScheduleInput, ProcurementFormInput, MeetingAttendee };

export function useSecretary() {
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Data
    const [letters, setLetters] = useState<CorrespondenceRow[]>([]);
    const [leaves, setLeaves] = useState<LeaveRow[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
    const [inquiries, setInquiries] = useState<HRInquiry[]>([]);
    const [assignments, setAssignments] = useState<AssignmentLetter[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [procurement, setProcurement] = useState<ProcurementRequest[]>([]);

    // Loaders
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

    const loadEmployees = useCallback(async () => {
        // employees جدول موروث حُذف — سيُستبدَل بـ user_personas في الإصدار القادم
        setEmployees([]);
    }, []);

    const loadAttendance = useCallback(async (_date: string = new Date().toISOString().split('T')[0]) => {
        // attendance_logs جدول موروث حُذف — الاستبدال: staff_attendance_logs (schema مختلف)
        setAttendance([]);
    }, []);

    const loadInquiries = useCallback(async () => {
        // hr_inquiries جدول موروث حُذف — الاستبدال: hr_accountability_tickets (schema مختلف)
        setInquiries([]);
    }, []);

    const loadMeetings = useCallback(async () => {
        // meetings + meeting_attendees جداول موروثة حُذفت — الاستبدال: meeting_sessions (schema مختلف)
        setMeetings([]);
    }, []);

    const loadProcurement = useCallback(async () => {
        // procurement_requests جدول موروث حُذف — لا يوجد جدول بديل محدد بعد
        setProcurement([]);
    }, []);

    const loadAssignments = useCallback(async () => {
        // assignment_letters جدول موروث حُذف — لا يوجد جدول بديل محدد بعد
        setAssignments([]);
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            loadLetters(),
            loadLeaves(),
            loadEmployees(),
            loadAttendance(),
            loadInquiries(),
            loadMeetings(),
            loadProcurement(),
            loadAssignments()
        ]);
        setLoading(false);
    }, [loadLetters, loadLeaves, loadEmployees, loadAttendance, loadInquiries, loadMeetings, loadProcurement, loadAssignments]);

    // Actions
    const addLetter = async (letter: Omit<CorrespondenceRow, "id" | "created_at" | "attachment_url" | "status">) => {
        const result = await addLetterAction(letter);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ Letter registered"); loadLetters(); }
    };

    const updateLetterStatus = async (id: string, status: string) => {
        const result = await updateLetterStatusAction(id, status);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else loadLetters();
    };

    const logAttendance = async (log: Omit<AttendanceLog, "id" | "created_at" | "is_late" | "employee">) => {
        const result = await logAttendanceAction(log);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ Attendance logged"); loadAttendance(log.log_date); loadInquiries(); }
    };

    const updateInquiry = async (id: string, updates: Partial<HRInquiry>) => {
        const result = await updateInquiryAction(id, updates as Partial<Omit<HRInquiry, 'id' | 'employee'>>);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ Inquiry updated"); loadInquiries(); }
    };

    const scheduleMeeting = async (meeting: MeetingScheduleInput, attendeeIds: string[]) => {
        const result = await scheduleMeetingAction({
            title: String(meeting.title ?? ''),
            meeting_date: String(meeting.meeting_date ?? ''),
            meeting_time: meeting.meeting_time != null ? String(meeting.meeting_time) : null,
            location: meeting.location != null ? String(meeting.location) : null,
            description: meeting.description != null ? String(meeting.description) : null,
            meeting_type: meeting.meeting_type,
            status: meeting.status,
        }, attendeeIds);
        if (!result.ok) { setMsg(result.error ?? "خطأ"); return; }
        setMsg("✅ Meeting scheduled");
        loadMeetings();
    };

    const deleteLetter = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const result = await deleteLetterAction(id);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else loadLetters();
    };

    const addLeave = async (leave: LeaveFormInput) => {
        const result = await addLeaveAction(leave);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ Leave request submitted"); loadLeaves(); }
    };

    const updateLeaveStatus = async (id: string, status: string) => {
        const result = await updateLeaveStatusAction(id, status);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else loadLeaves();
    };

    const submitProcurement = async (request: ProcurementFormInput) => {
        const result = await submitProcurementAction({
            request_number: request.request_number,
            request_date: request.request_date,
            urgency: request.urgency != null ? String(request.urgency) : null,
            justification: request.justification != null ? String(request.justification) : null,
            items: request.items,
            status: request.status,
        });
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ Request submitted"); loadProcurement(); }
    };

    const addAssignment = async (letter: Omit<AssignmentLetter, "id" | "created_at">) => {
        const result = await addAssignmentAction(letter);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ Assignment letter created"); loadAssignments(); }
    };

    useEffect(() => {
        startTransition(async () => { await loadAll(); });
    }, [loadAll]);

    // Stats
    const stats = {
        incomingPending: letters.filter(l => l.type === "incoming" && l.status === "received").length,
        outgoingTotal: letters.filter(l => l.type === "outgoing").length,
        activeLeaves: leaves.filter(l => l.status === "pending").length,
        pendingInquiries: inquiries.filter(i => i.status === 'pending_justification').length,
        meetingsToday: meetings.filter(m => m.meeting_date === new Date().toISOString().split('T')[0]).length,
        pendingProcurement: procurement.filter(p => p.status === 'pending').length,
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
        state: {
            msg, loading, letters, leaves, employees, attendance, inquiries, meetings, procurement, assignments, stats
        },
        actions: {
            setMsg,
            loadAll,
            loadAttendance,
            addLetter,
            updateLetterStatus,
            deleteLetter,
            addLeave,
            updateLeaveStatus,
            logAttendance,
            updateInquiry,
            scheduleMeeting,
            submitProcurement,
            addAssignment
        }
    };
}
