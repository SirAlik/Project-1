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
        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .order("name", { ascending: true });
        if (error) setMsg(error.message);
        else setEmployees((data || []) as Employee[]);
    }, []);

    const loadAttendance = useCallback(async (date: string = new Date().toISOString().split('T')[0]) => {
        const { data, error } = await supabase
            .from("attendance_logs")
            .select("*, employee:employees(name)")
            .eq("log_date", date);
        if (error) setMsg(error.message);
        else {
            const formatted = (data || []).map((row: Record<string, unknown> & { employee?: { name?: string } | null }) => ({
                ...row,
                employee_name: row.employee?.name
            }));
            setAttendance(formatted as unknown as AttendanceLog[]);
        }
    }, []);

    const loadInquiries = useCallback(async () => {
        const { data, error } = await supabase
            .from("hr_inquiries")
            .select("*, employee:employees(name)")
            .order("created_at", { ascending: false });
        if (error) setMsg(error.message);
        else setInquiries((data || []) as HRInquiry[]);
    }, []);

    const loadMeetings = useCallback(async () => {
        const { data, error } = await supabase
            .from("meetings")
            .select("*, attendees:meeting_attendees(*)")
            .order("meeting_date", { ascending: false });
        if (error) setMsg(error.message);
        else setMeetings((data || []) as Meeting[]);
    }, []);

    const loadProcurement = useCallback(async () => {
        const { data, error } = await supabase
            .from("procurement_requests")
            .select("*")
            .order("request_date", { ascending: false });
        if (error) setMsg(error.message);
        else setProcurement((data || []) as ProcurementRequest[]);
    }, []);

    const loadAssignments = useCallback(async () => {
        const { data, error } = await supabase
            .from("assignment_letters")
            .select("*")
            .order("issue_date", { ascending: false });
        if (error) setMsg(error.message);
        else setAssignments((data || []) as AssignmentLetter[]);
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
        const { error } = await supabase.from("secretary_correspondence").insert([{
            ...letter,
            status: letter.type === "incoming" ? "received" : "sent"
        }]);
        if (error) setMsg(error.message);
        else { setMsg("✅ Letter registered"); loadLetters(); }
    };

    const updateLetterStatus = async (id: string, status: string) => {
        const { error } = await supabase.from("secretary_correspondence").update({ status }).eq("id", id);
        if (error) setMsg(error.message);
        else loadLetters();
    };

    const logAttendance = async (log: Omit<AttendanceLog, "id" | "created_at" | "is_late">) => {
        const { error } = await supabase.from("attendance_logs").insert([log]);
        if (error) setMsg(error.message);
        else { setMsg("✅ Attendance logged"); loadAttendance(log.log_date); loadInquiries(); }
    };

    const updateInquiry = async (id: string, updates: Partial<HRInquiry>) => {
        const { error } = await supabase.from("hr_inquiries").update(updates).eq("id", id);
        if (error) setMsg(error.message);
        else { setMsg("✅ Inquiry updated"); loadInquiries(); }
    };

    const scheduleMeeting = async (meeting: MeetingScheduleInput, attendeeIds: string[]) => {
        const { data: meetingData, error: mError } = await supabase
            .from("meetings")
            .insert([meeting])
            .select()
            .single();

        if (mError) { setMsg(mError.message); return; }

        if (attendeeIds.length > 0) {
            const attendees = attendeeIds.map(eid => ({
                meeting_id: meetingData.id,
                employee_id: eid
            }));
            const { error: aError } = await supabase.from("meeting_attendees").insert(attendees);
            if (aError) setMsg(aError.message);
        }

        setMsg("✅ Meeting scheduled");
        loadMeetings();
    };

    const deleteLetter = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from("secretary_correspondence").delete().eq("id", id);
        if (error) setMsg(error.message);
        else loadLetters();
    };

    const addLeave = async (leave: LeaveFormInput) => {
        const { error } = await supabase.from("employee_leaves").insert([leave]);
        if (error) setMsg(error.message);
        else { setMsg("✅ Leave request submitted"); loadLeaves(); }
    };

    const updateLeaveStatus = async (id: string, status: string) => {
        const { error } = await supabase.from("employee_leaves").update({ status }).eq("id", id);
        if (error) setMsg(error.message);
        else loadLeaves();
    };

    const submitProcurement = async (request: ProcurementFormInput) => {
        const { error } = await supabase.from("procurement_requests").insert([request]);
        if (error) setMsg(error.message);
        else { setMsg("✅ Request submitted"); loadProcurement(); }
    };

    const addAssignment = async (letter: Omit<AssignmentLetter, "id" | "created_at">) => {
        const { error } = await supabase.from("assignment_letters").insert([letter]);
        if (error) setMsg(error.message);
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
