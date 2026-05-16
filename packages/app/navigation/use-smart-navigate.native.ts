import { useNavigationState } from '@react-navigation/native'
import { useRouter } from 'solito/navigation'

type NavigateTarget =
  | string
  | {
      pathname: string
      query?: Record<string, string | string[] | number | boolean | null | undefined>
    }

/**
 * Reads directly from React Navigation's state
 * Swipe-back, programmatic back, etc. all update this automatically.
 */
export function useSmartNavigate() {
  const router = useRouter()

  const routes = useNavigationState((state) => state.routes)
  const index = useNavigationState((state) => state.index)

  const previousRouteName =
    index > 0 ? routes[index - 1]?.name ?? null : null

  const navigateTo = (target: NavigateTarget) => {
    // Strip leading slash for comparison with native route names
    const targetName = typeof target === 'string' ? target.replace(/^\//, '') : target.pathname.replace(/^\//, '')

    let urlToPush = target
    if (typeof target !== 'string') {
      // Solito App router push requires a string href
      const searchParams = new URLSearchParams()
      if (target.query) {
        Object.entries(target.query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
      }
      const qs = searchParams.toString()
      urlToPush = qs ? `${target.pathname}?${qs}` : target.pathname
    }

    if (previousRouteName === targetName) {
      router.back()
    } else {
      router.push(urlToPush as string)
    }
  }

  return { navigateTo }
}
