import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'

export async function savePushTokenToSupabase(token: string) {
  if (!isSupabaseConfigured || !token) return null
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) {
    console.warn('[Push] User not authenticated. Cannot save push token.')
    return null
  }

  const { data, error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: user.id,
      push_token: token,
      platform: 'web',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,push_token' }
  )

  if (error) {
    console.error('[Push] Error upserting token to Supabase user_push_tokens:', error.message)
    throw error
  }

  console.log('[Push] Token successfully saved to Supabase for user:', user.id)
  return data
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : ''
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)

  const registerPushToken = async () => {
    if (!isSupabaseConfigured) return

    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        let registration = await navigator.serviceWorker.getRegistration('/sw.js')
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          console.log('[SW] Service Worker successfully registered:', registration.scope)
        }
        await navigator.serviceWorker.ready

        if ('PushManager' in window && 'Notification' in window) {
          let permission = Notification.permission
          setPermissionStatus(permission)

          if (permission === 'default') {
            try {
              permission = await Notification.requestPermission()
              setPermissionStatus(permission)
            } catch (permErr) {
              console.warn('[Push] Notification permission prompt skipped or blocked by browser gesture rules:', permErr)
            }
          }

          if (permission === 'granted') {
            const PUBLIC_VAPID_KEY = 'BKB-YHa-AhOSTXUb4m3ypiBiM-j7XN9IOmwECqpQcbPdAcLDZErJ3qzBlvhicOFp9wrHr0mo5M94St_dFQqW27k'
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
            })

            const tokenStr = JSON.stringify(subscription)
            setPushToken(tokenStr)
            await savePushTokenToSupabase(tokenStr)
          }
        }
      }
    } catch (webErr) {
      console.warn('[Push] Web service worker / push subscription setup failed:', webErr)
    }
  }

  useEffect(() => {
    registerPushToken()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => {
          void registerPushToken()
        }, 0)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { pushToken, permissionStatus, registerPushToken }
}
