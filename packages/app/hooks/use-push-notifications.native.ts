import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
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
      platform: Platform.OS,
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

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)

  const registerPushToken = async () => {
    if (!isSupabaseConfigured) return

    try {
      let Notifications: any = null
      try {
        Notifications = require('expo-notifications')
      } catch (e) {
        console.log('expo-notifications module not loaded, fallback enabled.')
      }

      if (!Notifications) return

      if (typeof Notifications.setNotificationHandler === 'function') {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        })
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      setPermissionStatus(finalStatus)

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied.')
        return
      }

      const tokenData = await Notifications.getExpoPushTokenAsync()
      const token = tokenData?.data
      if (!token) return

      setPushToken(token)
      await savePushTokenToSupabase(token)
    } catch (err) {
      console.warn('Error setting up push notifications:', err)
    }
  }

  useEffect(() => {
    registerPushToken()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        registerPushToken()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { pushToken, permissionStatus, registerPushToken }
}
