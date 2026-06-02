'use client';

import { useState, useTransition, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, FileCheck,
  Loader2, Save, AlertCircle, ChevronDown, BookOpen,
} from 'lucide-react';
import {
  getPeriodsAction,
  getStudentsAction,
  recordAttendanceAction,
} from './_actions';
import type {
  ClassOption, PeriodSlot, PeriodStudent, PeriodAttendanceEntry,
} from '@/lib/services/period-attendance-service';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ElementType; active: string; idle: string }> = {
  present: { label: 'حاضر',   icon: CheckCircle2, active: 'bg-emerald-500 border-emerald-500 text-white', idle: 'bg-background border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-500' },
  absent:  { label: 'غائب',   icon: XCircle,      active: 'bg-rose-500    border-rose-500    text-white', idle: 'bg-background border-border text-muted-foreground hover:border-rose-400    hover:text-rose-500'    },
  late:    { label: 'متأخر',  icon: Clock,        active: 'bg-amber-500   border-amber-500   text-white', idle: 'bg-background border-border text-muted-foreground hover:border-amber-400   hover:text-amber-500'   },
  excused: { label: 'مستأذن', icon: FileCheck,    active: 'bg-blue-500    border-blue-500    text-white', idle: 'bg-background border-border text-muted-foreground hover:border-blue-400    hover:text-blue-500'    },
};

const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  classes: ClassOption[];
  today:   string;
}

export function PeriodSheet({ classes, today }: Props) {
  const [isPending, startTransition] = useTransition();

  const [selectedClassId,   setSelectedClassId]   = useState('');
  const [date,              setDate]              = useState(today);
  const [periods,           setPeriods]           = useState<PeriodSlot[]>([]);
  const [selectedPeriod,    setSelectedPeriod]    = useState<PeriodSlot | null>(null);
  const [students,          setStudents]          = useState<PeriodStudent[]>([]);
  const [statuses,          setStatuses]          = useState<Record<string, AttendanceStatus>>({});
  const [loadingPeriods,    setLoadingPeriods]    = useState(false);
  const [loadingStudents,   setLoadingStudents]   = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [savedMsg,          setSavedMsg]          = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Load periods when class / date changes
  // ──────────────────────────────────────────────────────────────────────────

  const loadPeriods = useCallback(async (classId: string, forDate: string) => {
    if (!classId) return;
    setLoadingPeriods(true);
    setError(null);
    setSavedMsg(null);
    setSelectedPeriod(null);
    setStudents([]);
    setStatuses({});

    const dayOfWeek = new Date(forDate).getDay(); // 0=Sunday
    const result = await getPeriodsAction(classId, dayOfWeek);
    if (result.ok) {
      setPeriods(result.data);
    } else {
      setError(result.error);
      setPeriods([]);
    }
    setLoadingPeriods(false);
  }, []);

  const loadStudents = useCallback(async (classId: string, forDate: string, period: PeriodSlot) => {
    setLoadingStudents(true);
    setError(null);
    setSavedMsg(null);

    const result = await getStudentsAction(classId, forDate, period.period_id);
    if (result.ok) {
      setStudents(result.data);
      const init: Record<string, AttendanceStatus> = {};
      result.data.forEach(s => {
        if (s.current_status) init[s.student_profile_id] = s.current_status;
      });
      setStatuses(init);
    } else {
      setError(result.error);
      setStudents([]);
    }
    setLoadingStudents(false);
  }, []);

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    loadPeriods(classId, date);
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    if (selectedClassId) loadPeriods(selectedClassId, newDate);
  }

  function handlePeriodSelect(period: PeriodSlot) {
    setSelectedPeriod(period);
    loadStudents(selectedClassId, date, period);
  }

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses(prev => ({ ...prev, [studentId]: status }));
    setSavedMsg(null);
  }

  function markAllPresent() {
    const all: Record<string, AttendanceStatus> = {};
    students.forEach(s => { all[s.student_profile_id] = 'present'; });
    setStatuses(all);
    setSavedMsg(null);
  }

  function handleSave() {
    if (!selectedClassId || !selectedPeriod || !students.length) return;

    const entries: PeriodAttendanceEntry[] = students.map(s => ({
      student_profile_id: s.student_profile_id,
      status:             statuses[s.student_profile_id] ?? 'present',
      is_excused:         statuses[s.student_profile_id] === 'excused',
    }));

    startTransition(async () => {
      const result = await recordAttendanceAction(
        selectedClassId, date, selectedPeriod.period_id,
        selectedPeriod.timetable_slot_id, selectedPeriod.subject_id, entries,
      );
      if (result.ok) {
        setSavedMsg(`تم حفظ حضور ${result.data.saved} طالب بنجاح`);
        setError(null);
        await loadStudents(selectedClassId, date, selectedPeriod);
      } else {
        setError(result.error);
      }
    });
  }

  const counts = {
    present:  students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'present').length,
    absent:   students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'absent').length,
    late:     students.filter(s => (statuses[s.student_profile_id] ?? s.current_status) === 'late').length,
    unmarked: students.filter(s => !(statuses[s.student_profile_id] ?? s.current_status)).length,
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const dayName = DAY_NAMES_AR[new Date(date).getDay()];

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5" dir="rtl">

      {/* الفلاتر: فصل + تاريخ */}
      <div className="border border-border rounded-2xl bg-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {c.grade_level}{c.section ? ` — ${c.section}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">التاريخ</label>
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

      {/* الإشعارات */}
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

      {/* اختيار الحصة */}
      {selectedClassId && (
        <div className="border border-border rounded-2xl bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              الحصص — {dayName}
            </h3>
            {loadingPeriods && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>

          {!loadingPeriods && periods.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {periods.map(period => {
                const isActive = selectedPeriod?.period_id === period.period_id;
                return (
                  <button
                    key={period.period_id}
                    onClick={() => handlePeriodSelect(period)}
                    className={`flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-background border-border text-muted-foreground hover:border-blue-400 hover:text-blue-500'
                    }`}
                  >
                    <span>الحصة {period.period_number}</span>
                    {period.subject_name && (
                      <span className={`text-[10px] mt-0.5 ${isActive ? 'text-stone-700' : 'text-muted-foreground/70'}`}>
                        {period.subject_name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* تحميل الطلاب */}
      {loadingStudents && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">جارٍ تحميل بيانات الطلاب…</span>
        </div>
      )}

      {/* الإحصائيات */}
      {!loadingStudents && students.length > 0 && selectedPeriod && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'الإجمالي',  value: students.length, color: 'text-foreground'       },
            { label: 'حاضر',      value: counts.present,  color: 'text-emerald-500'      },
            { label: 'غائب',      value: counts.absent,   color: 'text-rose-500'         },
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
      {!loadingStudents && students.length > 0 && selectedPeriod && (
        <>
          <div className="border border-border rounded-2xl bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
              <p className="text-xs font-bold text-muted-foreground">
                {selectedClass?.grade_level}{selectedClass?.section ? ` — ${selectedClass.section}` : ''}
                {selectedPeriod.subject_name && ` · ${selectedPeriod.subject_name}`}
                {' '}· {students.length} طالب
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
                    <span className="text-xs text-muted-foreground w-6 text-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{student.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{student.student_number}</p>
                    </div>
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

          <div className="flex items-center justify-end">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isPending ? 'جارٍ الحفظ…' : 'حفظ حضور الحصة'}
            </button>
          </div>
        </>
      )}

      {/* دعوة للاختيار */}
      {!selectedClassId && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 opacity-20" />
          <p className="text-sm font-bold">اختر الفصل الدراسي للبدء</p>
        </div>
      )}
      {selectedClassId && !selectedPeriod && !loadingPeriods && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center text-muted-foreground">
          <Clock className="w-7 h-7 opacity-20" />
          <p className="text-sm font-bold">اختر رقم الحصة</p>
        </div>
      )}

    </div>
  );
}
