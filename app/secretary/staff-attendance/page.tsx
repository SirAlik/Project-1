'use client';

import { useState, useTransition, useEffect, useCallback, startTransition } from 'react';
import {
  UserCheck, Clock, UserX, Plus, AlertTriangle,
  CheckCircle2, CalendarDays, RefreshCw,
} from 'lucide-react';
import { recordAttendanceAction, createViolationTicketAction } from './_actions';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

interface AttendanceFormProps {
  personaId: string;
  logDate: string;
  onDone: () => void;
}

function AttendanceForm({ personaId, logDate, onDone }: AttendanceFormProps) {
  type AbsenceType = 'excused' | 'unexcused' | 'medical' | 'emergency' | '';

  const [arrivalTime,   setArrival]   = useState('07:30');
  const [departureTime, setDeparture] = useState('');
  const [isAbsent,      setAbsent]    = useState(false);
  const [absenceType,   setAbsType]   = useState<AbsenceType>('');
  const [notes,         setNotes]     = useState('');
  const [error,         setError]     = useState<string | null>(null);
  const [isPending,     startTrans]   = useTransition();

  const handleSubmit = () => {
    setError(null);
    startTrans(async () => {
      const result = await recordAttendanceAction({
        persona_id:      personaId,
        log_date:        logDate,
        arrival_time:    isAbsent ? undefined : (arrivalTime || undefined),
        departure_time:  departureTime || undefined,
        is_absent:       isAbsent,
        absence_type:    (isAbsent && absenceType) ? absenceType : undefined,
        notes:           notes.trim() || undefined,
      });
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border/60">
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isAbsent}
          onChange={e => setAbsent(e.target.checked)}
          className="rounded"
        />
        غياب
      </label>

      {!isAbsent && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">وقت الحضور</p>
            <input
              type="time"
              value={arrivalTime}
              onChange={e => setArrival(e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">وقت الانصراف</p>
            <input
              type="time"
              value={departureTime}
              onChange={e => setDeparture(e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      )}

      {isAbsent && (
        <select
          value={absenceType}
          onChange={e => setAbsType(e.target.value as AbsenceType)}
          className="w-full text-sm rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">نوع الغياب (اختياري)</option>
          <option value="unexcused">غير مبرر</option>
          <option value="excused">مبرر</option>
          <option value="medical">إجازة مرضية</option>
          <option value="emergency">طارئ</option>
        </select>
      )}

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="ملاحظات (اختياري)"
        rows={2}
        className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 resize-none font-saudi focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
      />

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isPending ? 'جارٍ الحفظ...' : 'حفظ'}
        </button>
        <button
          onClick={onDone}
          disabled={isPending}
          className="py-2 px-4 rounded-xl text-sm font-medium border border-border hover:bg-muted/50 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

interface LogRow {
  id: string;
  persona_id: string;
  persona_name_snapshot: string;
  persona_role_snapshot: string;
  arrival_time: string | null;
  departure_time: string | null;
  is_late: boolean;
  is_absent: boolean;
  late_minutes: number | null;
  absence_type: string | null;
  ticket_id: string | null;
}

interface LogCardProps {
  log: LogRow;
  onTicketCreated: () => void;
}

function LogCard({ log, onTicketCreated }: LogCardProps) {
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTrans]   = useTransition();

  const handleCreateTicket = () => {
    setError(null);
    startTrans(async () => {
      const result = await createViolationTicketAction(log.id);
      if (result.ok) {
        onTicketCreated();
      } else {
        setError(result.error);
      }
    });
  };

  const statusColor = log.is_absent
    ? 'bg-red-500/10 border-red-300 text-red-700'
    : log.is_late
    ? 'bg-yellow-500/10 border-yellow-300 text-yellow-700'
    : 'bg-green-500/10 border-green-300 text-green-700';

  const statusLabel = log.is_absent ? 'غائب' : log.is_late ? `متأخر ${log.late_minutes} د` : 'حاضر';
  const StatusIcon  = log.is_absent ? UserX : log.is_late ? Clock : UserCheck;

  return (
    <div className={`rounded-2xl border p-4 space-y-2 transition-colors ${statusColor}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon className="w-4 h-4 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{log.persona_name_snapshot}</p>
            <p className="text-[11px] opacity-70">{log.persona_role_snapshot}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-xs font-bold">{statusLabel}</span>
      </div>

      {log.arrival_time && (
        <p className="text-xs opacity-70">
          الحضور: {log.arrival_time.slice(0, 5)}
          {log.departure_time && ` · الانصراف: ${log.departure_time.slice(0, 5)}`}
        </p>
      )}

      {(log.is_late || log.is_absent) && !log.ticket_id && (
        <div className="pt-1">
          {error && <p className="text-xs text-destructive mb-1">{error}</p>}
          <button
            onClick={handleCreateTicket}
            disabled={isPending}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-current/40 bg-white/30 hover:bg-white/50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isPending ? 'جارٍ الإنشاء...' : '+ إنشاء تذكرة مساءلة'}
          </button>
        </div>
      )}

      {log.ticket_id && (
        <p className="text-xs opacity-60 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          تذكرة مساءلة مُنشأة
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// New entry row for staff without a log today
// ────────────────────────────────────────────────────────────

interface StaffRow {
  id: string;
  full_name: string;
  role: string;
}

interface NewEntryCardProps {
  staff: StaffRow;
  logDate: string;
  onSaved: () => void;
}

function NewEntryCard({ staff, logDate, onSaved }: NewEntryCardProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{staff.full_name}</p>
          <p className="text-[11px] text-muted-foreground">{staff.role}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            تسجيل
          </button>
        )}
      </div>
      {showForm && (
        <AttendanceForm
          personaId={staff.id}
          logDate={logDate}
          onDone={() => { setShowForm(false); onSaved(); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default function StaffAttendancePage() {
  const [logDate,  setLogDate]  = useState(todayISO);
  const [logs,     setLogs]     = useState<LogRow[]>([]);
  const [staff,    setStaff]    = useState<StaffRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const loadData = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, staffRes] = await Promise.all([
        fetch(`/api/attendance?date=${date}`),
        fetch('/api/staff-list'),
      ]);
      const logsJson  = logsRes.ok  ? await logsRes.json()  : { logs: [] };
      const staffJson = staffRes.ok ? await staffRes.json() : { staff: [] };
      setLogs(logsJson.logs   ?? []);
      setStaff(staffJson.staff ?? []);
    } catch {
      setError('تعذّر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { startTransition(async () => { await loadData(logDate); }); }, [logDate, loadData]);

  // الموظفون الذين لديهم سجل اليوم
  const loggedIds   = new Set(logs.map(l => l.persona_id));
  // الموظفون بدون سجل
  const unloggedStaff = staff.filter(s => !loggedIds.has(s.id));

  const lateCount   = logs.filter(l => l.is_late).length;
  const absentCount = logs.filter(l => l.is_absent).length;
  const presentCount = logs.filter(l => !l.is_late && !l.is_absent).length;

  return (
    <main className="min-h-screen bg-background font-saudi" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* رأس الصفحة */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            سجل الحضور
          </h1>
          <p className="text-sm text-muted-foreground">
            تسجيل وإدارة حضور الموظفين اليومي
          </p>
        </div>

        {/* اختيار التاريخ */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={logDate}
            max={todayISO()}
            onChange={e => setLogDate(e.target.value)}
            className="text-sm rounded-xl border border-border bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-sm text-muted-foreground">{formatDateAr(logDate)}</span>
          <button
            onClick={() => startTransition(async () => { await loadData(logDate); })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>

        {/* إحصائيات */}
        {!loading && logs.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'حاضر',  count: presentCount, color: 'text-green-600',  bg: 'bg-green-500/10' },
              { label: 'متأخر', count: lateCount,    color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
              { label: 'غائب',  count: absentCount,  color: 'text-red-600',   bg: 'bg-red-500/10' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl ${s.bg} p-4 text-center`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* حالة التحميل */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* السجلات الموجودة */}
        {!loading && logs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">السجلات المُدخَلة ({logs.length})</h2>
            {logs.map(log => (
              <LogCard key={log.id} log={log} onTicketCreated={() => loadData(logDate)} />
            ))}
          </section>
        )}

        {/* الموظفون بدون سجل */}
        {!loading && unloggedStaff.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              بدون سجل اليوم ({unloggedStaff.length})
            </h2>
            {unloggedStaff.map(s => (
              <NewEntryCard
                key={s.id}
                staff={s}
                logDate={logDate}
                onSaved={() => loadData(logDate)}
              />
            ))}
          </section>
        )}

        {!loading && logs.length === 0 && unloggedStaff.length === 0 && (
          <div className="py-16 text-center space-y-2">
            <UserCheck className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">لا يوجد موظفون مسجلون في هذه المدرسة</p>
          </div>
        )}

      </div>
    </main>
  );
}
