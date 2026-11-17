import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { pipelineService } from '../services/pipeline.service';
import { PIPELINE_KEYS } from './usePipelineQueries';
import { PIPELINE_STAGE_LABELS } from '../config/constants';

/**
 * Helper to surgically update student fields in pipeline query data (Rule 14)
 */
function updateStudentInCache(oldData, studentId, updates) {
  if (!oldData) return oldData;

  // Handle standard ApiResponse structure: { success: true, students: [...], ... }
  if (Array.isArray(oldData?.students)) {
    return {
      ...oldData,
      students: oldData.students.map((student) =>
        student._id === studentId ? { ...student, ...updates } : student
      ),
    };
  }

  // Handle nested data structure: { data: { students: [...] } }
  if (Array.isArray(oldData?.data?.students)) {
    return {
      ...oldData,
      data: {
        ...oldData.data,
        students: oldData.data.students.map((student) =>
          student._id === studentId ? { ...student, ...updates } : student
        ),
      },
    };
  }

  // Handle raw array
  if (Array.isArray(oldData)) {
    return oldData.map((student) =>
      student._id === studentId ? { ...student, ...updates } : student
    );
  }

  return oldData;
}

/**
 * Optimistic Stage Update Mutation with Automatic Revert (Rules 12, 13, 14)
 * Transitions student stage visually instantaneously, rolling back if backend validation fails.
 */
export const useUpdateStudentStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, newStage, reason, simulateError }) =>
      pipelineService.updateStudentStage(studentId, {
        stage: newStage,
        reason,
        simulateError,
      }),

    // Optimistic Update Phase
    onMutate: async ({ studentId, newStage, studentName }) => {
      const stageName = PIPELINE_STAGE_LABELS[newStage] || newStage;
      const toastId = toast.loading(
        `Moving ${studentName || 'student'} to ${stageName}...`
      );

      // 1. Cancel any active outgoing refetches
      await queryClient.cancelQueries({ queryKey: PIPELINE_KEYS.all });

      // 2. Snapshot current state for rollback
      const snapshot = queryClient.getQueriesData({ queryKey: PIPELINE_KEYS.all });

      // 3. Apply instantaneous optimistic update to cache
      queryClient.setQueriesData({ queryKey: PIPELINE_KEYS.all }, (oldData) =>
        updateStudentInCache(oldData, studentId, {
          stage: newStage,
          updatedAt: new Date().toISOString(),
          _isOptimistic: true,
        })
      );

      // Return context for error rollback
      return { snapshot, toastId, studentId, newStage, studentName };
    },

    // Rollback Phase on Backend Rejection / Failure
    onError: (err, variables, context) => {
      // Revert cache to pre-mutation snapshot immediately
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData);
        });
      }

      const rawMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Stage transition rejected by server.';

      toast.error(rawMsg, {
        id: context?.toastId,
        duration: 5500,
      });
    },

    // Success Confirmation Phase
    onSuccess: (response, variables, context) => {
      const serverStudent =
        response?.data?.student || response?.student || null;

      if (serverStudent && context?.studentId) {
        // Surgically merge confirmed server data
        queryClient.setQueriesData({ queryKey: PIPELINE_KEYS.all }, (oldData) =>
          updateStudentInCache(oldData, context.studentId, {
            ...serverStudent,
            _isOptimistic: false,
          })
        );
      }

      const stageName =
        PIPELINE_STAGE_LABELS[variables.newStage] || variables.newStage;

      toast.success(
        `${variables.studentName || 'Student'} successfully moved to ${stageName}`,
        {
          id: context?.toastId,
        }
      );
    },
  });
};

/**
 * Toggle Document Verification with Surgical In-place Cache Update
 */
export const useToggleDocumentVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, documentsVerified }) =>
      pipelineService.toggleDocumentVerification(studentId, documentsVerified),

    onMutate: async ({ studentId, documentsVerified, studentName }) => {
      const toastId = toast.loading(
        `Updating document status for ${studentName || 'student'}...`
      );

      await queryClient.cancelQueries({ queryKey: PIPELINE_KEYS.all });
      const snapshot = queryClient.getQueriesData({ queryKey: PIPELINE_KEYS.all });

      // In-place surgical cache update
      queryClient.setQueriesData({ queryKey: PIPELINE_KEYS.all }, (oldData) =>
        updateStudentInCache(oldData, studentId, {
          documentsVerified,
        })
      );

      return { snapshot, toastId, studentName, documentsVerified };
    },

    onError: (err, variables, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData);
        });
      }
      toast.error(
        err?.response?.data?.message || 'Failed to update document verification status',
        { id: context?.toastId }
      );
    },

    onSuccess: (response, variables, context) => {
      const statusLabel = context?.documentsVerified ? 'Verified' : 'Pending';
      toast.success(
        `Documents marked as ${statusLabel} for ${context?.studentName || 'student'}`,
        { id: context?.toastId }
      );
    },
  });
};

/**
 * Add New Student to Pipeline with Surgical Cache Append
 */
export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentData) => pipelineService.createStudent(studentData),
    onSuccess: (response) => {
      const newStudent = response?.data?.student || response?.student;
      if (newStudent) {
        queryClient.setQueriesData({ queryKey: PIPELINE_KEYS.all }, (oldData) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData?.students)) {
            return {
              ...oldData,
              students: [newStudent, ...oldData.students],
              total: (oldData.total || 0) + 1,
            };
          }
          if (Array.isArray(oldData?.data?.students)) {
            return {
              ...oldData,
              data: {
                ...oldData.data,
                students: [newStudent, ...oldData.data.students],
                total: (oldData.data.total || 0) + 1,
              },
            };
          }
          return oldData;
        });
      }
      toast.success('New student enquiry registered in pipeline');
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || 'Failed to register student enquiry'
      );
    },
  });
};
