import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services/student.service';

/**
 * Standardized Query Key Factory for Student 360° (Rule 12)
 */
export const STUDENT_KEYS = {
  all: ['students'],
  lists: () => [...STUDENT_KEYS.all, 'list'],
  list: (filters = {}) => [...STUDENT_KEYS.lists(), filters],
  details: () => [...STUDENT_KEYS.all, 'detail'],
  detail: (id) => [...STUDENT_KEYS.details(), id],
};

/**
 * Query hook for paginated, searchable Student Directory
 * Supports branch, status, search, and pagination
 *
 * @param {Object} filters - { branch, status, search, page, limit, fields }
 * @param {Object} [queryOptions] - Custom TanStack Query options
 */
export const useStudents = (filters = {}, queryOptions = {}) => {
  const query = useQuery({
    queryKey: STUDENT_KEYS.list(filters),
    queryFn: () => studentService.getStudents(filters),
    placeholderData: (previousData) => previousData,
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

  const pagination = useMemo(() => {
    return (
      rawData?.data?.pagination ||
      rawData?.pagination || {
        total: students.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      }
    );
  }, [rawData, students.length]);

  return {
    ...query,
    students,
    pagination,
  };
};

/**
 * Query hook for single Student 360° Profile
 *
 * @param {string} id - Student ObjectId
 * @param {Object} [queryOptions] - Custom TanStack Query options
 */
export const useStudent = (id, queryOptions = {}) => {
  const query = useQuery({
    queryKey: STUDENT_KEYS.detail(id),
    queryFn: () => studentService.getStudentById(id),
    enabled: Boolean(id),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...queryOptions,
  });

  const rawData = query.data;
  const student = useMemo(() => {
    if (!rawData) return null;
    return (
      rawData?.data?.student ||
      rawData?.student ||
      rawData?.data ||
      null
    );
  }, [rawData]);

  return {
    ...query,
    student,
  };
};

/**
 * Mutation hook for updating student profile sections
 */
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => studentService.updateStudent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.lists() });
    },
  });
};

/**
 * Mutation hook for adding a note to the student timeline
 */
export const useAddStudentNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, noteData }) => studentService.addStudentNote(id, noteData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_KEYS.detail(variables.id) });
    },
  });
};
