import { useEffect, useState } from 'react'

// Simulates the fetch latency a real backend would introduce, so the Logs/Salesmen/
// Dashboard screens have a real skeleton phase to show instead of popping in instantly.
export function useLoading(delay = 600) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return isLoading
}
