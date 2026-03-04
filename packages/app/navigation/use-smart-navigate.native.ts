import { useNavigationState } from '@react-navigation/native'
import { useRouter } from 'solito/navigation'

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

  const navigateTo = (target: string) => {
    // Strip leading slash for comparison with native route names
    const targetName = target.replace(/^\//, '')

    if (previousRouteName === targetName) {
      router.back()
    } else {
      router.push(target)
    }
  }

  return { navigateTo }
}
