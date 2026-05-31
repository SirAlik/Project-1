'use server';

import {
  recordAttendance,
  createViolationTicket,
  type RecordAttendanceInput,
  type RecordAttendanceOutput,
  type CreateTicketOutput,
} from '@/lib/services/hr-attendance-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function recordAttendanceAction(
  input: RecordAttendanceInput,
): Promise<WorkflowResult<RecordAttendanceOutput>> {
  return recordAttendance(input);
}

export async function createViolationTicketAction(
  attendanceLogId: string,
): Promise<WorkflowResult<CreateTicketOutput>> {
  return createViolationTicket({ attendance_log_id: attendanceLogId });
}
