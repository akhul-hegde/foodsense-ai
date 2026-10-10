import { useCallback, useEffect, useState } from 'react'

function readHash(): string {
  return window.location.hash.replace(/^#\/?/, '')
}

/** The current "#/page" segment, so pages are linkable and the back button works without a router. */
export function useHashRoute(): [string, (route: string) => void] {
  const [route, setRoute] = useState(readHash)

  useEffect(() => {
    const onChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: string) => {
    window.location.hash = `/${next}`
  }, [])

  return [route, navigate]
}
