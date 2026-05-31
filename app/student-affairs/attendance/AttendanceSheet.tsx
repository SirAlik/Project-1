'use client';

import { useState, useTransition, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, FileCheck,
  Loader2, Save, AlertCircle, ChevronDown,
} from 'lucide-react';
import {
  getStudentsAction,
  recordAttendanceAction,
} from './_actions';
import type { ClassOption, AttendanceStudent, AttendanceEntry } from '@/lib/services/student-attendance-service';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ElementType; active: string; idle: string }> = {
  present: { label: 'حاضر',     icon: CheckCircle2, active: 'bg-emerald-500 border-emerald-500 text-white',     idle: 'bg-background border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-500' },
  absent:  { label: 'غائب',     icon: XCircle,      active: 'bg-rose-500    border-rose-500    text-white',     idle: 'bg-background border-border text-muted-foreground hover:border-rose-400    hover:text-rose-500'    },
  late:    { label: 'متأخر',    icon: Clock,        active: 'bg-amber-500   border-amber-500   text-white',     idle: 'bg-background border-border text-muted-foreground hover:border-amber-400   hover:text-amber-500'   },
  excused: { label: 'مستأذن',   icon: FileCheck,    active: 'bg-blue-500    border-blue-500    text-white',     idle: 'bg-background border-border text-muted-foreground hover:border-blue-400    hover:text-blue-500'    },
};

const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  classes:       ClassOption[];
  today:         string; // ISO YYYY-MM-DD
}

export function AttendanceSheet({ classes, today }: Props) {
  const [isPending, startTransition] = useTransition();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date,            setDate]            = useState<string>(today);
  const [students,        setStudents]        = useState<AttendanceStudent[]>([]);
  const [statuses,        setStatuses]        = useState<Record<string, AttendanceStatus>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [savedMsg,        setSavedMsg]        = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Load students when class / date changes
  // ──────────────────────────────────────────────────────────────────────────

  const loadStudents = useCallback(async (classId: string, forDate: string) => {
    if (!classId) return;
    setLoadingStudents(true);
    setError(null);
    setSavedMsg(null);

    const result = await getStudentsAction(classId, forDate);
    if (result.ok) {
      setStudents(result.data);
      // Pre-fill existing statuses
      const initialStatuses: Record<string, AttendanceStatus> = {};
      result.data.forEach(s => {
        if (s.current_status) initialStatuses[s.student_profile_id] = s.current_status;
      });
      setStatuses(initialStatuses);
    } else {
      setError(result.error);
      setStudents([]);
    }
    setLoadingStudents(false);
  }, []);

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    loadStudents(classId, date);
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    if (selectedClassId) loadStudents(selectedClassId, newDate);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses(prev => ({ ...prev, [studentId]: status }));
    setSavedMsg(null);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Mark all present
  // ──────────────────────────────────────────────────────────────────────────

  function markAllPresent() {
    const all: Record<string, AttendanceStatus> = {};
    students.forEach(s => { all[s.student_profile_id] = 'present'; });
    setStatuses(all);
    setSavedMsg(null);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!selectedClassId || !students.length) return;

    const entries: AttendanceEntry[] = students.map(s => ({
      student_profile_id: s.student_profile_id,
      status:             statuses[s.student_profile_id] ?? 'present',
      is_excused:         statuses[s.student_profile_id] === 'excused',
    }));

    startTransition(async () => {
      const result = await recordAttendanceAction(selectedClassId, date, entries);
      if (result.ok) {
        setSavedMsg(`تم حفظ حضور ${result.data.saved} طالب بنجاح`);
        setError(null);
        // Reload to get fresh statuses
        await loadStudents(selectedClassId, date);
      } else {
        setError(result.error);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────────────────────────────────

  const counts = {
    present: students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'present').length,
    absent:  students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'absent').length,
    late:    students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'late').length,
    excused: students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'excused').length,
    unmarked: students.filter(s => !(statuses[s.student_profile_id] ?? s.current_status)).length,
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5" dir="rtl">

      {/* الفلاتر */}
      <div className="border border-border rounded-2xl bg-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* اختيار الفصل */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">الفصل الدراسي</label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={e => handleClassChange(e.target.value)}
                className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 pr-10"
              >
                <option value="">— اختر الفصل —</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.grade_level}{c.section ? ` — ${c.section}` : ''} ({c.student_count} طالب)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* التاريخ */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">تاريخ الحضور</label>
            <input
              type="date"
              value={date}
              onChange={e => handleDateChange(e.target.value)}
              max={today}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      </div>

      {/* إشعارات */}
      {error && (
        <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="flex items-center gap-3 text-sm text-emerald-600 bg-emerald-500/10 rounded-xl px-4 py-3 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {savedMsg}
        </div>
      )}

      {/* Loading */}
      {loadingStudents && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">جارٍ تحميل بيانات الطلاب…</span>
        </div>
      )}

      {/* الإحصائيات */}
      {!loadingStudents && students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'الإجمالي',  value: students.length, color: 'text-foreground'    },
            { label: 'حاضر',      value: counts.present,  color: 'text-emerald-500'   },
            { label: 'غائب',      value: counts.absent,   color: 'text-rose-500'      },
            { label: 'متأخر',     value: counts.late,     color: 'text-amber-500'     },
            { label: 'غير مسجّل', value: counts.unmarked, color: 'text-muted-foreground' },
          ].map(s => (
            <div key={s.label} className="border border-border rounded-2xl bg-card p-3 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* قائمة الطلاب */}
      {!loadingStudents && students.length > 0 && (
        <>
          <div className="border border-border rounded-2xl bg-card overflow-hidden">
            {/* رأس الجدول + تسجيل الكل حاضرين */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
              <p className="text-xs font-bold text-muted-foreground">
                {selectedClass?.grade_level}{selectedClass?.section ? ` — ${selectedClass.section}` : ''} · {students.length} طالب
              </p>
              <button
                onClick={markAllPresent}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                تسجيل الكل حاضرين
              </button>
            </div>

            <div className="divide-y divide-border">
              {students.map((student, idx) => {
                const currentStatus = statuses[student.student_profile_id] ?? student.current_status;
                return (
                  <div key={student.student_profile_id} className="flex items-center gap-4 px-5 py-3">
                    {/* الرقم */}
                    <span className="text-xs text-muted-foreground w-6 text-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    {/* الاسم والرقم */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{student.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{student.student_number}</p>
                    </div>

                    {/* أزرار الحالة */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {STATUS_ORDER.map(status => {
                        const cfg = STATUS_CONFIG[status];
                        const Icon = cfg.icon;
                        const isActive = currentStatus === status;
                        return (
                          <button
                            key={status}
                            onClick={() => setStatus(student.student_profile_id, status)}
                            title={cfg.label}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${isActive ? cfg.active : cfg.idle}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* زر الحفظ */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleSave}
              disabled={isPending || !selectedClassId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isPending ? 'جارٍ الحفظ…' : 'حفظ الحضور'}
            </button>
          </div>
        </>
      )}

      {/* حالة فارغة */}
      {!loadingStudents && !students.length && selectedClassId && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="font-bold text-foreground text-sm">لا يوجد طلاب مسجّلون في هذا الفصل</p>
          <p className="text-xs text-muted-foreground">تأكد من تسجيل الطلاب في الفصل أولاً</p>
        </div>
      )}

      {/* دعوة للاختيار */}
      {!loadingStudents && !selectedClassId && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center text-muted-foreground">
          <ChevronDown className="w-8 h-8 opacity-30" />
          <p className="text-sm font-bold">اختر الفصل الدراسي للبدء</p>
        </div>
      )}

    </div>
  );
}
