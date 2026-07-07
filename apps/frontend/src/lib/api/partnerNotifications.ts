import { partnerApiClient } from './partnerClient';

export interface PartnerNotificationRow {
  notificationId: string;
  userId: string;
  partnerId: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export const partnerNotificationsApi = {
  list: async () => {
    const res = await partnerApiClient.get<{
      notifications: PartnerNotificationRow[];
      unreadCount: number;
    }>('/partner-notifications');
    return res.data;
  },

  markRead: async (id: string) => {
    const res = await partnerApiClient.patch<{ notification: PartnerNotificationRow }>(
      `/partner-notifications/${id}/read`
    );
    return res.data;
  },
};
