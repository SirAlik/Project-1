'use server';

import {
  getClassesForAttendance,
  getStudentsWithAttendance,
  recordAttendanceBulk,
  type ClassOption,
  type AttendanceStudent,
  type AttendanceEntry,
} from '@/lib/services/student-attendance-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function getClassesAction(): Promise<WorkflowResult<ClassOption[]>> {
  return getClassesForAttendance();
}

export async function getStudentsAction(
  classId: string,
  date: string,
): Promise<WorkflowResult<AttendanceStudent[]>> {
  return getStudentsWithAttendance(classId, date);
}

export async function recordAttendanceAction(
  classId: string,
  date: string,
  entries: AttendanceEntry[],
): Promise<WorkflowResult<{ saved: number }>> {
  return recordAttendanceBulk(classId, date, entries);
}
