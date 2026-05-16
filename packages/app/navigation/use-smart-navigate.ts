import { useRouter } from 'solito/navigation'

type NavigateTarget =
  | string
  | {
      pathname: string
      query?: Record<string, string | string[] | number | boolean | null | undefined>
    }

/**
 * Web fallback: no React Navigation state available.
 * Always push — the browser handles back navigation natively.
 */
export function useSmartNavigate() {
  const router = useRouter()

  const navigateTo = (target: NavigateTarget) => {
    if (typeof target === 'string') {
      router.push(target)
    } else {
      const searchParams = new URLSearchParams()
      if (target.query) {
        Object.entries(target.query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
      }
      const qs = searchParams.toString()
      const url = qs ? `${target.pathname}?${qs}` : target.pathname
      router.push(url)
    }
  }

  return { navigateTo }
}
