import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employee.service';
import toast from 'react-hot-toast';

export const EMPLOYEE_KEYS = {
  all: ['employees'],
  lists: () => [...EMPLOYEE_KEYS.all, 'list'],
  list: (filters = {}) => [...EMPLOYEE_KEYS.lists(), filters],
  details: () => [...EMPLOYEE_KEYS.all, 'detail'],
  detail: (id) => [...EMPLOYEE_KEYS.details(), id],
};

export const useEmployees = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: EMPLOYEE_KEYS.list(filters),
    queryFn: () => employeeService.getEmployees(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;

  const employees = useMemo(() => {
    if (!rawData) return [];
    return (
      rawData?.data?.employees ||
      rawData?.employees ||
      rawData?.data ||
      []
    );
  }, [rawData]);

  const pagination = useMemo(() => {
    return (
      rawData?.data?.pagination ||
      rawData?.pagination || {
        total: employees.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
    );
  }, [rawData, employees.length]);

  const stats = useMemo(() => {
    return (
      rawData?.data?.stats ||
      rawData?.stats || {
        totalActive: employees.filter((e) => e.deletionStage === 'ACTIVE').length,
        totalTrash: employees.filter((e) => e.deletionStage === 'TRASH').length,
        totalCount: employees.length,
      }
    );
  }, [rawData, employees]);

  return {
    ...query,
    employees,
    pagination,
    stats,
  };
};

export const useEmployeeMutations = () => {
  const queryClient = useQueryClient();

  const invalidateEmployeeCaches = () => {
    queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all });
  };

  const createMutation = useMutation({
    mutationFn: (data) => employeeService.createEmployee(data),
    onSuccess: () => {
      invalidateEmployeeCaches();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeeService.updateEmployee(id, data),
    onSuccess: () => {
      invalidateEmployeeCaches();
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => employeeService.toggleStatus(id, status),
    onSuccess: () => {
      invalidateEmployeeCaches();
    },
  });

  const moveToTrashMutation = useMutation({
    mutationFn: ({ id, reason }) => employeeService.moveToTrash(id, reason),
    onSuccess: () => {
      invalidateEmployeeCaches();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => employeeService.restoreEmployee(id),
    onSuccess: () => {
      invalidateEmployeeCaches();
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => employeeService.permanentDelete(id),
    onSuccess: () => {
      invalidateEmployeeCaches();
    },
  });

  return {
    createEmployee: createMutation.mutateAsync,
    updateEmployee: updateMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    moveToTrash: moveToTrashMutation.mutateAsync,
    restoreEmployee: restoreMutation.mutateAsync,
    permanentDelete: permanentDeleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isTrashing: moveToTrashMutation.isPending,
    isDeletingPermanently: permanentDeleteMutation.isPending,
  };
};
