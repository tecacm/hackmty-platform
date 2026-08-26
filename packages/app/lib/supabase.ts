import 'react-native-url-polyfill/auto'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(key)
    } catch (e) {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, value)
    } catch (e) {}
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch (e) {}
  },
}

export const supabase = createClient(
  supabaseUrl ?? 'https://localhost.supabase.co',
  supabaseAnonKey ?? 'missing-supabase-anon-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'implicit',
    }
  }
)

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Request persistent storage from WebKit so iOS does not evict PWA auth state
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {})
  }
  // Re-sync session when PWA returns from background or cold start
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().catch(() => {})
    }
  })
}

export { fetchAllRows } from './supabase-pagination'

