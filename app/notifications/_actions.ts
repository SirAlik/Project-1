'use server';

import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type NotificationItem,
} from '@/lib/services/notification-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export async function getNotificationsAction(): Promise<WorkflowResult<NotificationItem[]>> {
  return getMyNotifications(50);
}

export async function getUnreadCountAction(): Promise<WorkflowResult<number>> {
  return getUnreadCount();
}

export async function markAsReadAction(id: string): Promise<WorkflowResult<null>> {
  return markAsRead(id);
}

export async function markAllAsReadAction(): Promise<WorkflowResult<null>> {
  return markAllAsRead();
}
