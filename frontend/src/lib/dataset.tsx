import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, messageOf, postJson, type DatasetInfo, type Restaurant } from '@/lib/api'

export type DatasetAction = 'select' | 'upload' | 'paste' | 'scrape'

interface DatasetContextValue {
  /** The dataset every analysis runs on; null until the first load finishes. */
  current: DatasetInfo | null
  restaurants: Restaurant[] | null
  /** True while the current dataset and restaurant list are being fetched. */
  loading: boolean
  /** Set when the server could not be reached for the current dataset or restaurants. */
  loadError: string | null
  /** Bumps whenever the dataset changes or is refreshed, so analysis views refetch. */
  version: number
  pending: DatasetAction | null
  actionError: string | null
  select: (restaurant: string) => Promise<boolean>
  upload: (file: File) => Promise<boolean>
  paste: (text: string) => Promise<boolean>
  scrape: (url: string) => Promise<boolean>
  refresh: () => void
  clearActionError: () => void
}

const DatasetContext = createContext<DatasetContextValue | null>(null)

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DatasetInfo | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [pending, setPending] = useState<DatasetAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [info, list] = await Promise.all([
        api<DatasetInfo>('/data/current'),
        api<Restaurant[]>('/restaurants'),
      ])
      setCurrent(info)
      setRestaurants(list)
    } catch (error) {
      setLoadError(messageOf(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = useCallback(
    async (action: DatasetAction, request: () => Promise<DatasetInfo>, corpusChanged = false) => {
      setPending(action)
      setActionError(null)
      try {
        setCurrent(await request())
        if (corpusChanged) setRestaurants(await api<Restaurant[]>('/restaurants'))
        setVersion((v) => v + 1)
        return true
      } catch (error) {
        setActionError(messageOf(error))
        return false
      } finally {
        setPending(null)
      }
    },
    [],
  )

  const value = useMemo<DatasetContextValue>(
    () => ({
      current,
      restaurants,
      loading,
      loadError,
      version,
      pending,
      actionError,
      select: (restaurant) => run('select', () => postJson('/data/select', { restaurant })),
      upload: (file) =>
        run(
          'upload',
          () => {
            const body = new FormData()
            body.append('file', file)
            return api('/data/upload', { method: 'POST', body })
          },
          true,
        ),
      paste: (text) => run('paste', () => postJson('/data/paste', { text })),
      scrape: (url) => run('scrape', () => postJson('/data/scrape', { url })),
      refresh: () => {
        void load()
        setVersion((v) => v + 1)
      },
      clearActionError: () => setActionError(null),
    }),
    [current, restaurants, loading, loadError, version, pending, actionError, run, load],
  )

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDataset(): DatasetContextValue {
  const context = useContext(DatasetContext)
  if (!context) throw new Error('useDataset must be used inside <DatasetProvider>.')
  return context
}
