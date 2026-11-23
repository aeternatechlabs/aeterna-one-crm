import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';

export const NOTIFICATION_KEYS = {
  all: ['notifications'],
  list: (params = {}) => [...NOTIFICATION_KEYS.all, 'list', params],
};

/**
 * Cached Query Hook for In-App Notifications
 */
export const useNotifications = (params = { limit: 10 }, queryOptions = {}) => {
  const query = useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: async () => {
      const res = await notificationService.getNotifications(params);
      return res?.data || res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000, // 2 minutes fresh cache
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;

  const notifications = useMemo(() => {
    return rawData?.notifications || [];
  }, [rawData]);

  const unreadCount = useMemo(() => {
    return rawData?.unreadCount ?? 0;
  }, [rawData]);

  return {
    ...query,
    notifications,
    unreadCount,
  };
};

/**
 * In-App Notification Mutations with Cache Invalidation
 */
export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  return {
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
};
