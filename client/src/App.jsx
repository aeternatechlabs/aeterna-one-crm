import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { PermissionProvider } from './context/PermissionContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppRoutes } from './routes/AppRoutes';

// Global TanStack Query Client with Unified Cache Policies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 4 * 60 * 1000, // 4 minutes fresh cache
      gcTime: 15 * 60 * 1000,   // 15 minutes garbage collection
      refetchOnWindowFocus: false, // Prevent unwanted refetch when switching windows/tabs
      refetchOnMount: false,       // Prevent duplicate refetch on component remount if fresh
      refetchOnReconnect: false,   // Prevent redundant refetch on network reconnect
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <BranchProvider>
              <PermissionProvider>
                <Toaster
                  position="bottom-right"
                  toastOptions={{
                    duration: 3500,
                    style: {
                      background: '#101c3b',
                      color: '#ffffff',
                      fontSize: '12px',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                    },
                    success: {
                      iconTheme: {
                        primary: '#20c5d8',
                        secondary: '#101c3b',
                      },
                    },
                    error: {
                      duration: 5000,
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#ffffff',
                      },
                    },
                  }}
                />
                <AppRoutes />
              </PermissionProvider>
            </BranchProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export { queryClient };
export default App;
