import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/report.service';

export const REPORT_KEYS = {
  all: ['reports'],
  overview: (params = {}) => [...REPORT_KEYS.all, 'overview', params],
  scorecards: (params = {}) => [...REPORT_KEYS.all, 'scorecards', params],
  funnel: (params = {}) => [...REPORT_KEYS.all, 'funnel', params],
  counsellors: (params = {}) => [...REPORT_KEYS.all, 'counsellors', params],
  intakeTrends: (params = {}) => [...REPORT_KEYS.all, 'intakeTrends', params],
};

export const useReportOverview = (params = {}, options = {}) => {
  const query = useQuery({
    queryKey: REPORT_KEYS.overview(params),
    queryFn: () => reportService.getOverview(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });

  const raw = query.data;
  const overview = useMemo(() => {
    if (!raw) return null;
    return raw?.data || raw;
  }, [raw]);

  return {
    ...query,
    overview,
  };
};

export const useBranchScorecards = (params = {}, options = {}) => {
  const query = useQuery({
    queryKey: REPORT_KEYS.scorecards(params),
    queryFn: () => reportService.getBranchScorecards(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });

  const raw = query.data;
  const scorecards = useMemo(() => {
    if (!raw) return null;
    return raw?.data || raw;
  }, [raw]);

  return {
    ...query,
    scorecards,
  };
};

export const useConversionFunnel = (params = {}, options = {}) => {
  const query = useQuery({
    queryKey: REPORT_KEYS.funnel(params),
    queryFn: () => reportService.getFunnel(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });

  const raw = query.data;
  const funnel = useMemo(() => {
    if (!raw) return null;
    return raw?.data || raw;
  }, [raw]);

  return {
    ...query,
    funnel,
  };
};

export const useCounsellorPerformance = (params = {}, options = {}) => {
  const query = useQuery({
    queryKey: REPORT_KEYS.counsellors(params),
    queryFn: () => reportService.getCounsellorPerformance(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });

  const raw = query.data;
  const performance = useMemo(() => {
    if (!raw) return null;
    return raw?.data || raw;
  }, [raw]);

  return {
    ...query,
    performance,
  };
};

export const useIntakeTrends = (params = {}, options = {}) => {
  const query = useQuery({
    queryKey: REPORT_KEYS.intakeTrends(params),
    queryFn: () => reportService.getIntakeTrends(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });

  const raw = query.data;
  const intakeTrends = useMemo(() => {
    if (!raw) return null;
    return raw?.data || raw;
  }, [raw]);

  return {
    ...query,
    intakeTrends,
  };
};
