import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './store/authStore.js'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ulangi hanya untuk gangguan jaringan atau 5xx. Jangan ulangi 401/403/422/429:
      // mengulang malah memperparah pembatas laju.
      retry: (failureCount, error) =>
        (error?.status === 0 || error?.status >= 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)