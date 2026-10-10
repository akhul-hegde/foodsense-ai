/** Thin fetch wrapper for the FastAPI server. Vite proxies /api to it in development. */

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** FastAPI sends {"detail": "..."} for HTTPException and {"detail": [{msg, loc}, ...]} for validation errors. */
function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: { msg?: string }) => d.msg ?? 'Invalid request').join('; ')
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'The analysis server is not reachable. Start it with "uvicorn app.main:app --reload".'
  }
  return `Request failed with status ${status}.`
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, init)
  } catch {
    throw new ApiError(0, 'Could not reach the analysis server. Check your connection and try again.')
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, errorMessage(response.status, body))
  return body as T
}

export function postJson<T>(path: string, payload: unknown): Promise<T> {
  return api<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

// ---- Shapes shared by the shell ----

export type DatasetSource = 'csv' | 'upload' | 'paste' | 'scrape'

export interface DatasetInfo {
  name: string
  source: DatasetSource
  review_count: number
}

export interface Restaurant {
  name: string
  review_count: number
  avg_rating: number | null
}
