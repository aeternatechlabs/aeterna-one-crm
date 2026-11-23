import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '../services/institution.service';

/**
 * Standardized Query Key Factory for Institutions (Rule 12)
 */
export const INSTITUTION_KEYS = {
  all: ['institutions'],
  lists: () => [...INSTITUTION_KEYS.all, 'list'],
  list: (filters = {}) => [...INSTITUTION_KEYS.lists(), filters],
  stats: () => [...INSTITUTION_KEYS.all, 'stats'],
  details: () => [...INSTITUTION_KEYS.all, 'detail'],
  detail: (id) => [...INSTITUTION_KEYS.details(), id],
};

/**
 * Query hook for Institutions Master Directory
 * Supports type filtering, branch scoping, search, pagination, and cached transitions
 */
export const useInstitutions = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: INSTITUTION_KEYS.list(filters),
    queryFn: () => institutionService.getInstitutions(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000, // 3 minutes fresh cache
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;

  const institutions = useMemo(() => {
    if (!rawData) return [];
    return (
      rawData?.institutions ||
      rawData?.data?.institutions ||
      rawData?.data ||
      []
    );
  }, [rawData]);

  const pagination = useMemo(() => {
    return (
      rawData?.pagination ||
      rawData?.data?.pagination || {
        total: institutions.length,
        page: 1,
        limit: 12,
        totalPages: 1,
      }
    );
  }, [rawData, institutions.length]);

  return {
    ...query,
    institutions,
    pagination,
  };
};

/**
 * Cached Query hook for Institution Aggregations & Statistics
 * Avoids redundant re-fetching on tab switches or page navigation
 */
export const useInstitutionStats = (queryOptions = {}) => {
  const query = useQuery({
    queryKey: INSTITUTION_KEYS.stats(),
    queryFn: () => institutionService.getInstitutionStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh cache
    gcTime: 15 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;

  const stats = useMemo(() => {
    const s = rawData?.stats || rawData?.data?.stats || rawData || {};
    return {
      total: s.total ?? 0,
      totalSchools: s.totalSchools ?? 0,
      totalColleges: s.totalColleges ?? 0,
      totalCoaching: s.totalCoaching ?? 0,
      totalPartnerships: s.totalPartnerships ?? 0,
    };
  }, [rawData]);

  return {
    ...query,
    stats,
  };
};

/**
 * Single Institution Detail Query Hook
 */
export const useInstitution = (id, queryOptions = {}) => {
  return useQuery({
    queryKey: INSTITUTION_KEYS.detail(id),
    queryFn: () => institutionService.getInstitution(id),
    enabled: Boolean(id),
    staleTime: 3 * 60 * 1000,
    ...queryOptions,
  });
};

/**
 * Institution Mutations with Automatic Cache Invalidation
 */
export const useInstitutionMutations = () => {
  const queryClient = useQueryClient();

  const invalidateInstitutionCaches = () => {
    queryClient.invalidateQueries({ queryKey: INSTITUTION_KEYS.all });
  };

  const createMutation = useMutation({
    mutationFn: (data) => institutionService.createInstitution(data),
    onSuccess: () => {
      invalidateInstitutionCaches();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => institutionService.updateInstitution(id, data),
    onSuccess: () => {
      invalidateInstitutionCaches();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => institutionService.deleteInstitution(id),
    onSuccess: () => {
      invalidateInstitutionCaches();
    },
  });

  return {
    createInstitution: createMutation.mutateAsync,
    updateInstitution: updateMutation.mutateAsync,
    deleteInstitution: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
