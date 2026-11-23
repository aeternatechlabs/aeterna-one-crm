import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService } from '../services/lead.service';

export const LEAD_KEYS = {
  all: ['leads'],
  lists: () => [...LEAD_KEYS.all, 'list'],
  list: (filters = {}) => [...LEAD_KEYS.lists(), filters],
};

export const useLeads = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: LEAD_KEYS.list(filters),
    queryFn: async () => {
      const res = await leadService.getLeads(filters);
      // Dual Access Pattern: res.data.leads || res.leads || res.data.data.leads
      const leads = res?.data?.leads || res?.leads || res?.data?.data?.leads || [];
      const pagination = res?.data?.pagination || res?.pagination || res?.data?.data?.pagination || {
        page: 1,
        limit: 20,
        total: leads.length,
        totalPages: 1,
      };
      const stats = res?.data?.stats || res?.stats || res?.data?.data?.stats || {
        total: 0,
        new: 0,
        interested: 0,
        follow_up: 0,
        deal_closed: 0,
      };
      return { leads, pagination, stats };
    },
    placeholderData: (previousData) => previousData,
    staleTime: 3 * 60 * 1000, // 3 minutes fresh cache
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  return {
    leads: query.data?.leads || [],
    pagination: query.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    stats: query.data?.stats || { total: 0, new: 0, interested: 0, follow_up: 0, deal_closed: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useLeadMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => leadService.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => leadService.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }) => leadService.updateLeadStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: (id) => leadService.convertToStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => leadService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return {
    createLead: createMutation.mutateAsync,
    updateLead: updateMutation.mutateAsync,
    updateLeadStatus: updateStatusMutation.mutateAsync,
    convertToStudent: convertMutation.mutateAsync,
    deleteLead: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isConverting: convertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
