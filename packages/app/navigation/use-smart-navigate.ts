import { useRouter } from 'solito/navigation'

/**
 * Web fallback: no React Navigation state available.
 * Always push — the browser handles back navigation natively.
 */
export function useSmartNavigate() {
  const router = useRouter()

  const navigateTo = (target: string) => {
    router.push(target)
  }

  return { navigateTo }
}
