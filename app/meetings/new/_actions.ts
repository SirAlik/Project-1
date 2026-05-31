'use server';

import {
  createMeeting,
  getMeetingInviteeOptions,
  type CreateMeetingInput,
  type MeetingInviteeOption,
} from '@/lib/services/meeting-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function getInviteeOptionsAction(): Promise<WorkflowResult<MeetingInviteeOption[]>> {
  return getMeetingInviteeOptions();
}

export async function createMeetingAction(
  input: CreateMeetingInput,
): Promise<WorkflowResult<{ meeting_id: string; session_number: string }>> {
  return createMeeting(input);
}
