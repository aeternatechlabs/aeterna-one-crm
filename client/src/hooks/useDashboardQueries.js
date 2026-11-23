import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pipelineService } from '../services/pipeline.service';
import { authService } from '../services/auth.service';

export const DASHBOARD_KEYS = {
  all: ['dashboard'],
  summary: (params = {}) => [...DASHBOARD_KEYS.all, 'summary', params],
  health: () => ['system', 'health'],
};

/**
 * Cached Query Hook for Dashboard Summary Metrics
 * Automatically caches multi-branch summaries, avoiding redundant re-fetching on page revisit
 */
export const useDashboardSummary = (params = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: DASHBOARD_KEYS.summary(params),
    queryFn: async () => {
      const res = await pipelineService.getDashboardSummary(params);
      return res?.metrics ? res : res?.data || res;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000, // 3 minutes fresh cache
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  const summary = useMemo(() => query.data || null, [query.data]);

  return {
    ...query,
    summary,
  };
};

/**
 * Cached Query Hook for System Health Check
 */
export const useSystemHealth = (queryOptions = {}) => {
  const query = useQuery({
    queryKey: DASHBOARD_KEYS.health(),
    queryFn: () => authService.checkHealth(),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh cache
    gcTime: 15 * 60 * 1000,
    retry: 1,
    ...queryOptions,
  });

  const health = useMemo(() => query.data || null, [query.data]);

  return {
    ...query,
    health,
  };
};
