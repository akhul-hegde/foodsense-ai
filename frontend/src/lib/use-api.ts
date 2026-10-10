import { useCallback, useEffect, useState } from 'react'

import { api, messageOf } from '@/lib/api'
import { useDataset } from '@/lib/dataset'

export interface ApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

/**
 * GET an /api path and refetch whenever the current dataset changes.
 * Pass null to skip the request (for example until an input is filled in).
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const { version } = useDataset()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Omit<ApiState<T>, 'reload'>>({
    data: null,
    error: null,
    loading: path !== null,
  })

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    setState((s) => ({ ...s, error: null, loading: true }))
    api<T>(path).then(
      (data) => !cancelled && setState({ data, error: null, loading: false }),
      (error) => !cancelled && setState({ data: null, error: messageOf(error), loading: false }),
    )
    return () => {
      cancelled = true
    }
  }, [path, version, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
