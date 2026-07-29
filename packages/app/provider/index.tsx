'use client'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { SafeArea } from 'app/provider/safe-area'
import { NavigationProvider } from './navigation'
import { usePushNotifications } from 'app/hooks/use-push-notifications'

export function Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => console.log('[SW] Root Service Worker registered:', reg.scope))
        .catch(err => console.warn('[SW] Root Service Worker registration error:', err))
    }
  }, [])

  usePushNotifications()

  return (
    <SafeArea>
      <NavigationProvider>{children as any}</NavigationProvider>
    </SafeArea>
  )
}
