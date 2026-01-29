'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/Toast';
import { AppShell } from '@/components/Navigation';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: true,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <ToastProvider>
                        <AppShell>
                            {children}
                        </AppShell>
                    </ToastProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
