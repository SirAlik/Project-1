'use server';

import {
  getClassesForTeacher,
  getPeriodsForClassAndDay,
  getStudentsWithPeriodAttendance,
  recordPeriodAttendanceBulk,
  type ClassOption,
  type PeriodSlot,
  type PeriodStudent,
  type PeriodAttendanceEntry,
} from '@/lib/services/period-attendance-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function getClassesAction(): Promise<WorkflowResult<ClassOption[]>> {
  return getClassesForTeacher();
}

export async function getPeriodsAction(
  classId: string,
  dayOfWeek: number,
): Promise<WorkflowResult<PeriodSlot[]>> {
  return getPeriodsForClassAndDay(classId, dayOfWeek);
}

export async function getStudentsAction(
  classId: string,
  date: string,
  periodId: string,
): Promise<WorkflowResult<PeriodStudent[]>> {
  return getStudentsWithPeriodAttendance(classId, date, periodId);
}

export async function recordAttendanceAction(
  classId: string,
  date: string,
  periodId: string,
  timetableSlotId: string | null,
  subjectId: string | null,
  entries: PeriodAttendanceEntry[],
): Promise<WorkflowResult<{ saved: number }>> {
  return recordPeriodAttendanceBulk(classId, date, periodId, timetableSlotId, subjectId, entries);
}
