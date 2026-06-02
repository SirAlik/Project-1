import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import { BookRow, LoanRow, VisitRow, BookingRow } from "@/lib/types/lrc";
import {
    addBookAction,
    borrowBookAction,
    returnBookAction,
    startClassVisitAction,
    requestLrcBookingAction,
    updateLrcBookingStatusAction,
} from "@/app/lrc/_actions";

export function useLRC() {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const [books, setBooks] = useState<BookRow[]>([]);
    const [loans, setLoans] = useState<LoanRow[]>([]);
    const [visits, setVisits] = useState<VisitRow[]>([]);
    const [bookings, setBookings] = useState<BookingRow[]>([]);

    // Data for forms
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [students, setStudents] = useState<{ id: string; name: string; class_id?: string }[]>([]);
    const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);

    // Loaders
    const loadData = useCallback(async () => {
        setLoading(true);
        setMsg("");
        try {
            const [bRes, lRes, vRes, bkRes, cRes, sRes, tRes] = await Promise.all([
                supabase.from("lrc_books").select("*").order("title"),
                supabase.from("lrc_loans").select("*").order("loan_date", { ascending: false }),
                supabase.from("lrc_visits").select("*").order("visit_date", { ascending: false }),
                supabase.from("lrc_bookings").select("*").order("booking_date", { ascending: false }),
                supabase.from("classes").select("id, name"),
                supabase.from("student_profiles").select("id, name, class_id"),
                supabase.from("profiles").select("id, full_name, role").in("role", ["teacher", "school_admin"])
            ]);

            // Check for critical errors
            if (bRes.error) throw bRes.error;
            if (cRes.error) throw cRes.error;
            if (sRes.error) throw sRes.error;

            setBooks(bRes.data as BookRow[] || []);
            setLoans(lRes.data as LoanRow[] || []);
            setVisits(vRes.data as VisitRow[] || []);
            setBookings(bkRes.data as BookingRow[] || []);
            setClasses(cRes.data || []);
            setStudents((sRes.data ?? []) as { id: string; name: string; class_id?: string }[]);

            // Map full_name to name for teachers if needed by UI
            setTeachers((tRes.data || []).map((p: { id: string; full_name?: string | null }) => ({ id: p.id, name: p.full_name || "معلم" })));

        } catch (e: unknown) {
            setMsg(`⚠️ فشل تحميل بيانات المصادر: ${e instanceof Error ? e.message : String(e)}`);
            console.error("LRC Load Error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Book Actions
    async function addBook(book: Omit<BookRow, "id" | "school_id">) {
        const result = await addBookAction(book);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم إضافة الكتاب للفهرس"); loadData(); }
    }

    // Loan Actions
    async function borrowBook(bookTitleOrId: string, borrowerId: string, type: "student" | "teacher") {
        let book = books.find(b => b.id === bookTitleOrId || b.title === bookTitleOrId);

        // Smart Indexing: If book doesn't exist, create it via server action
        if (!book) {
            const newBookResult = await addBookAction({
                title: bookTitleOrId,
                total_copies: 1,
                available_copies: 0,
                category: "عام",
                author: null,
                isbn: null,
                location: null,
            });

            if (!newBookResult.ok || !newBookResult.data) {
                setMsg("❌ فشل تسجيل الكتاب الجديد");
                return;
            }
            book = { id: newBookResult.data.id, available_copies: 0 } as BookRow;
        } else if (book.available_copies < 1) {
            setMsg("❌ الكتاب غير متوفر حالياً");
            return;
        }

        const loanDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(loanDate.getDate() + 7);

        const result = await borrowBookAction({
            bookId: book.id,
            borrowerId,
            borrowerType: type,
            loanDate: loanDate.toISOString(),
            dueDate: dueDate.toISOString(),
        });

        if (!result.ok) { setMsg(result.error ?? "خطأ"); return; }
        setMsg("✅ تم تسجيل الإعارة بنجاح");
        loadData();
    }

    async function returnBook(loanId: string) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        const result = await returnBookAction(loanId, loan.book_id);
        if (!result.ok) { setMsg(result.error ?? "خطأ"); return; }
        setMsg("✅ تم استلام الكتاب");
        loadData();
    }

    // Visit Actions
    async function startClassVisit(classId: string, teacherPersonaId: string, period: number, topic: string) {
        // جلب الطلاب للفصل من النسخة المحلية من state
        const classStudents = students
            .filter(s => s.class_id === classId)
            .map(s => ({ id: s.id, name: s.name }));

        const result = await startClassVisitAction({
            classId,
            teacherPersonaId,
            period,
            topic,
            visitDate: new Date().toISOString().split('T')[0],
            studentIds: classStudents,
        });

        if (!result.ok) setMsg(result.error ?? "خطأ");
        else setMsg(classStudents.length > 0 ? "✅ بدأت زيارة الفصل وتم إنشاء كشف الحضور" : "✅ بدأت الزيارة (لا يوجد طلاب في هذا الفصل)");
        loadData();
    }

    // Booking Actions
    async function requestBooking(data: { teacherId: string; classId: string; period: number; subject: string; date: string }) {
        const result = await requestLrcBookingAction({
            teacherPersonaId: data.teacherId,
            classId: data.classId,
            bookingDate: data.date,
            period: data.period,
            subject: data.subject,
        });

        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg("✅ تم إرسال طلب الحجز"); loadData(); }
    }

    async function updateBookingStatus(bookingId: string, status: "approved" | "rejected" | "rescheduled") {
        const result = await updateLrcBookingStatusAction(bookingId, status);
        if (!result.ok) setMsg(result.error ?? "خطأ");
        else { setMsg(`✅ تم ${status === "approved" ? "قبول" : "تغيير حالة"} الحجز`); loadData(); }
    }

    useEffect(() => {
        startTransition(async () => { await loadData(); });
    }, [loadData]);

    // Advanced Stats Calculation
    const now = new Date();

    // Status Breakdowns
    const activeLoans = loans.filter(l => l.status === "active" || (l.status as string) === "overdue");
    const returnedLoans = loans.filter(l => l.status === "returned");
    const overdueLoans = activeLoans.filter(l => new Date(l.due_date) < now);

    const totalLoansCount = loans.length || 1;
    const returnRate = Math.round((returnedLoans.length / totalLoansCount) * 100);
    const activeRate = Math.round((activeLoans.length / totalLoansCount) * 100);
    const overdueRate = Math.round((overdueLoans.length / totalLoansCount) * 100);

    // Top 10 Students
    const studentBorrowCount: Record<string, { name: string; count: number }> = {};
    loans.forEach(l => {
        if (l.borrower_type === "student") {
            if (!studentBorrowCount[l.borrower_id]) studentBorrowCount[l.borrower_id] = { name: l.borrower_name ?? '', count: 0 };
            studentBorrowCount[l.borrower_id].count++;
        }
    });
    const topStudents = Object.values(studentBorrowCount).sort((a, b) => b.count - a.count).slice(0, 10);

    // Top 10 Books
    const bookBorrowCount: Record<string, { title: string; count: number }> = {};
    loans.forEach(l => {
        if (!bookBorrowCount[l.book_id]) bookBorrowCount[l.book_id] = { title: l.book?.title ?? books.find(b => b.id === l.book_id)?.title ?? '', count: 0 };
        bookBorrowCount[l.book_id].count++;
    });
    const topBooks = Object.values(bookBorrowCount).sort((a, b) => b.count - a.count).slice(0, 10);

    // Top 10 Authors
    const authorBorrowCount: Record<string, { name: string; count: number }> = {};
    loans.forEach(l => {
        const book = books.find(b => b.id === l.book_id);
        const author = book?.author || "غير معروف";
        if (!authorBorrowCount[author]) authorBorrowCount[author] = { name: author, count: 0 };
        authorBorrowCount[author].count++;
    });
    const topAuthors = Object.values(authorBorrowCount).sort((a, b) => b.count - a.count).slice(0, 10);

    // Class Ranking
    const classStats: Record<string, { name: string; count: number }> = {};
    loans.forEach(l => {
        if (l.borrower_type === "student") {
            const student = students.find(s => s.id === l.borrower_id);
            const className = student?.class_id ? (classes.find(c => c.id === student.class_id)?.name || "فئة أخرى") : "فئة أخرى";
            if (!classStats[className]) classStats[className] = { name: className, count: 0 };
            classStats[className].count++;
        }
    });
    const rankedClasses = Object.values(classStats).sort((a, b) => b.count - a.count);
    const bottomClasses = [...rankedClasses].reverse().slice(0, 5);

    const stats = {
        totalBooks: books.length,
        activeLoansCount: activeLoans.length,
        returnedCount: returnedLoans.length,
        overdueCount: overdueLoans.length,
        returnRate,
        activeRate,
        overdueRate,
        topStudents,
        topBooks,
        topAuthors,
        rankedClasses,
        bottomClasses,
        visitsToday: visits.filter(v => v.visit_date === now.toISOString().split('T')[0]).length
    };

    return {
        state: {
            books, loans, visits, bookings, classes, students, teachers, loading, msg, stats
        },
        actions: {
            setMsg,
            loadData,
            addBook,
            borrowBook,
            returnBook,
            startClassVisit,
            requestBooking,
            updateBookingStatus
        }
    };
}
