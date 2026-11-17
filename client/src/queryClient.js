import { QueryClient } from '@tanstack/react-query';

// Global TanStack Query Client (Rule 12)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 4 * 60 * 1000, // 4 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes cache garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
