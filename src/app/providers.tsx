'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useState, useEffect, type ReactNode } from 'react'
import { URLLocationLoader } from '@/components/shared/url-location-loader'

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: 2000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <URLLocationLoader />
      </Suspense>
      {children}
    </QueryClientProvider>
  )
}
