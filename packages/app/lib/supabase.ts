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

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const val = parts.pop()?.split(';').shift()
    return val ? decodeURIComponent(val) : null
  }
  return null
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `; expires=${date.toUTCString()}`
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax${isSecure}`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

const cookieWebStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    // Read from cookie first (resilient to iOS PWA cold launch / force quit)
    const cookieVal = getCookie(key)
    if (cookieVal) return cookieVal
    try {
      return window.localStorage.getItem(key)
    } catch (e) {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    setCookie(key, value, 365)
    try {
      window.localStorage.setItem(key, value)
    } catch (e) {}
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    deleteCookie(key)
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
      storage: Platform.OS === 'web' ? cookieWebStorage : AsyncStorage,
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
