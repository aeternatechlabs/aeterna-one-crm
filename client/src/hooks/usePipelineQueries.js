import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pipelineService } from '../services/pipeline.service';
import { PIPELINE_STAGES } from '../config/constants';

/**
 * Standardized Query Key Factory for Admissions Pipeline (Rule 12)
 */
export const PIPELINE_KEYS = {
  all: ['pipeline'],
  lists: () => [...PIPELINE_KEYS.all, 'list'],
  list: (filters = {}) => [...PIPELINE_KEYS.lists(), filters],
  detail: (id) => [...PIPELINE_KEYS.all, 'detail', id],
};

/**
 * Query hook for Admissions Pipeline
 * Supports branch, stage, search, and minimal fields projection
 *
 * @param {Object} filters - { branch, stage, search, fields }
 * @param {Object} [queryOptions] - Custom TanStack Query options
 */
export const usePipeline = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: PIPELINE_KEYS.list(filters),
    queryFn: () => pipelineService.getPipeline(filters),
    placeholderData: (previousData) => previousData, // Smooth transitions (Rule 12)
    staleTime: 3 * 60 * 1000, // 3 minutes fresh cache
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  // Dual access pattern (Rule 11): data?.data?.students || data?.students
  const rawData = query.data;
  const students = useMemo(() => {
    if (!rawData) return [];
    return (
      rawData?.data?.students ||
      rawData?.students ||
      rawData?.data ||
      []
    );
  }, [rawData]);

  // Group students by stage for instantaneous Kanban board rendering
  const studentsByStage = useMemo(() => {
    const grouped = {
      [PIPELINE_STAGES.NEW_ENQUIRY]: [],
      [PIPELINE_STAGES.COUNSELLING]: [],
      [PIPELINE_STAGES.SHORTLISTED]: [],
      [PIPELINE_STAGES.APPLICATION_SUBMITTED]: [],
      [PIPELINE_STAGES.OFFER_VISA_WON]: [],
      [PIPELINE_STAGES.LOST]: [],
    };

    students.forEach((student) => {
      const stage = student.stage || PIPELINE_STAGES.NEW_ENQUIRY;
      if (grouped[stage]) {
        grouped[stage].push(student);
      } else {
        grouped[PIPELINE_STAGES.NEW_ENQUIRY].push(student);
      }
    });

    return grouped;
  }, [students]);

  // Pipeline summary statistics
  const stats = useMemo(() => {
    return {
      total: students.length,
      verifiedDocs: students.filter((s) => s.documentsVerified).length,
      pendingDocs: students.filter((s) => !s.documentsVerified).length,
      activeApplications: students.filter(
        (s) =>
          s.stage === PIPELINE_STAGES.APPLICATION_SUBMITTED ||
          s.stage === PIPELINE_STAGES.OFFER_VISA_WON
      ).length,
    };
  }, [students]);

  return {
    ...query,
    students,
    studentsByStage,
    stats,
  };
};
