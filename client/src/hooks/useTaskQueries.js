import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/task.service';
import toast from 'react-hot-toast';

export const TASK_KEYS = {
  all: ['tasks'],
  lists: () => [...TASK_KEYS.all, 'list'],
  list: (filters = {}) => [...TASK_KEYS.lists(), filters],
  queues: () => [...TASK_KEYS.all, 'queue'],
  queue: (filters = {}) => [...TASK_KEYS.queues(), filters],
  details: () => [...TASK_KEYS.all, 'detail'],
  detail: (id) => [...TASK_KEYS.details(), id],
};

export const useTasks = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: TASK_KEYS.list(filters),
    queryFn: () => taskService.getTasks(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;
  const tasks = useMemo(() => {
    if (!rawData) return [];
    return rawData?.data?.tasks || rawData?.tasks || rawData?.data || [];
  }, [rawData]);

  const pagination = useMemo(() => {
    return (
      rawData?.data?.pagination ||
      rawData?.pagination || {
        total: tasks.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      }
    );
  }, [rawData, tasks.length]);

  return {
    ...query,
    tasks,
    pagination,
  };
};

export const useDailyQueue = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: TASK_KEYS.queue(filters),
    queryFn: () => taskService.getDailyQueue(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;
  const queue = useMemo(() => {
    return (
      rawData?.data?.queue ||
      rawData?.queue || {
        overdue: [],
        dueToday: [],
        upcoming: [],
      }
    );
  }, [rawData]);

  const stats = useMemo(() => {
    return (
      rawData?.data?.stats ||
      rawData?.stats || {
        totalActive: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        upcomingCount: 0,
        completedTodayCount: 0,
        dailyTarget: 25,
      }
    );
  }, [rawData]);

  return {
    ...query,
    queue,
    stats,
  };
};

export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const invalidateTaskCaches = () => {
    queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
  };

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => taskService.createTask(taskData),
    onSuccess: (res) => {
      invalidateTaskCaches();
      toast.success('Task scheduled successfully!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create task.');
    },
  });

  const logReachoutMutation = useMutation({
    mutationFn: ({ id, reachoutData }) => taskService.logReachout(id, reachoutData),
    onSuccess: (res) => {
      invalidateTaskCaches();
      toast.success('Reach-out logged and disposition recorded!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to log reach-out.');
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, completionData }) => taskService.completeTask(id, completionData),
    onSuccess: (res) => {
      invalidateTaskCaches();
      toast.success('Task marked completed with operational verification!');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to complete task.');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updateData }) => taskService.updateTask(id, updateData),
    onSuccess: (res) => {
      invalidateTaskCaches();
      toast.success('Task updated successfully.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to update task.');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => taskService.deleteTask(id),
    onSuccess: () => {
      invalidateTaskCaches();
      toast.success('Task removed.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to delete task.');
    },
  });

  return {
    createTaskMutation,
    logReachoutMutation,
    completeTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
  };
};
