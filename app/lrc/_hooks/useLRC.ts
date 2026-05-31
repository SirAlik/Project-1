import { useState, useEffect, useCallback, startTransition } from "react";
import { supabase } from "@/lib/db/supabase";
import { BookRow, LoanRow, VisitRow, BookingRow } from "@/lib/types/lrc";

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
            setTeachers((tRes.data || []).map(p => ({ id: p.id, name: p.full_name || "معلم" })));

        } catch (e: unknown) {
            setMsg(`⚠️ فشل تحميل بيانات المصادر: ${e instanceof Error ? e.message : String(e)}`);
            console.error("LRC Load Error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Book Actions
    async function addBook(book: Omit<BookRow, "id" | "school_id">) {
        const { error } = await supabase.from("lrc_books").insert([book]);
        if (error) setMsg(error.message);
        else { setMsg("✅ تم إضافة الكتاب للفهرس"); loadData(); }
    }

    // Loan Actions
    async function borrowBook(bookTitleOrId: string, borrowerId: string, type: "student" | "teacher") {
        let book = books.find(b => b.id === bookTitleOrId || b.title === bookTitleOrId);

        // Smart Indexing: If book doesn't exist, create it
        if (!book) {
            const { data: newBook, error: bErr } = await supabase.from("lrc_books").insert([{
                title: bookTitleOrId,
                total_copies: 1,
                available_copies: 0, // Will be 0 after this borrow
                category: "عام"
            }]).select().single();

            if (bErr || !newBook) {
                setMsg("❌ فشل تسجيل الكتاب الجديد");
                return;
            }
            book = newBook as BookRow;
        } else if (book.available_copies < 1) {
            setMsg("❌ الكتاب غير متوفر حالياً");
            return;
        }

        const loanDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(loanDate.getDate() + 7);

        // 1. Create Loan
        const { error: loanErr } = await supabase.from("lrc_loans").insert([{
            book_id: book.id,
            borrower_id: borrowerId,
            borrower_type: type,
            loan_date: loanDate.toISOString(),
            due_date: dueDate.toISOString(),
            status: "active"
        }]);

        if (loanErr) { setMsg(loanErr.message); return; }

        // 2. Decrement Copy
        if (book.id) {
            await supabase.from("lrc_books").update({ available_copies: Math.max(0, book.available_copies - 1) }).eq("id", book.id);
        }

        setMsg("✅ تم تسجيل الإعارة بنجاح");
        loadData();
    }

    async function returnBook(loanId: string) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        // 1. Update Loan
        const { error } = await supabase.from("lrc_loans").update({
            status: "returned",
            return_date: new Date().toISOString()
        }).eq("id", loanId);

        if (error) { setMsg(error.message); return; }

        // 2. Increment Copy
        const { data: book } = await supabase.from("lrc_books").select("available_copies").eq("id", loan.book_id).single();
        if (book) {
            await supabase.from("lrc_books").update({ available_copies: book.available_copies + 1 }).eq("id", loan.book_id);
        }

        setMsg("✅ تم استلام الكتاب");
        loadData();
    }

    // Visit Actions
    async function startClassVisit(classId: string, teacherId: string, period: number, topic: string) {
        const cls = classes.find(c => c.id === classId);
        const teacher = teachers.find(t => t.id === teacherId);

        const { data: visit, error: vErr } = await supabase.from("lrc_visits").insert([{
            class_id: classId,
            class_name: cls?.name,
            teacher_id: teacherId,
            teacher_name: teacher?.name,
            period,
            topic
        }]).select().single();

        if (vErr || !visit) { setMsg(vErr?.message || "Error creating visit"); return; }

        const { data: classStudents } = await supabase.from("student_profiles").select("id, name").eq("class_id", classId);

        if (classStudents && classStudents.length > 0) {
            const attendanceRows = classStudents.map(s => ({
                visit_id: visit.id,
                student_id: s.id,
                student_name: s.name,
                is_present: true
            }));

            const { error: aErr } = await supabase.from("lrc_visit_attendance").insert(attendanceRows);
            if (aErr) setMsg("تنبيه: تم إنشاء الزيارة ولكن فشل تسجيل الحضور");
            else setMsg("✅ بدأت زيارة الفصل وتم إنشاء كشف الحضور");
        } else {
            setMsg("✅ بدأت الزيارة (لا يوجد طلاب في هذا الفصل)");
        }

        loadData();
    }

    // Booking Actions
    async function requestBooking(data: { teacherId: string; classId: string; period: number; subject: string; date: string }) {
        const cls = classes.find(c => c.id === data.classId);
        const teacher = teachers.find(t => t.id === data.teacherId);

        const { error } = await supabase.from("lrc_bookings").insert([{
            teacher_id: data.teacherId,
            teacher_name: teacher?.name || "معلم",
            class_id: data.classId,
            class_name: cls?.name,
            booking_date: data.date,
            period: data.period,
            subject: data.subject,
            status: "pending"
        }]);

        if (error) setMsg(error.message);
        else { setMsg("✅ تم إرسال طلب الحجز"); loadData(); }
    }

    async function updateBookingStatus(bookingId: string, status: "approved" | "rejected" | "rescheduled") {
        const { error } = await supabase.from("lrc_bookings").update({ status }).eq("id", bookingId);
        if (error) setMsg(error.message);
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
