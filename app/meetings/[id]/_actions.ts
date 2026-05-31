'use server';

import {
  startMeeting,
  endMeeting,
  signMinutes,
  addNote,
  type EndMeetingInput,
  type AddNoteInput,
} from '@/lib/services/meeting-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function startMeetingAction(
  meetingId: string,
): Promise<WorkflowResult<null>> {
  return startMeeting(meetingId);
}

export async function endMeetingAction(
  meetingId: string,
  input: EndMeetingInput,
): Promise<WorkflowResult<null>> {
  return endMeeting(meetingId, input);
}

export async function signMinutesAction(
  meetingId: string,
): Promise<WorkflowResult<null>> {
  return signMinutes(meetingId);
}

export async function addNoteAction(
  meetingId: string,
  input: AddNoteInput,
): Promise<WorkflowResult<{ note_id: string }>> {
  return addNote(meetingId, input);
}
