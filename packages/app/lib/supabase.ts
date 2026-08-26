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

/**
 * PostgREST caps every request at a fixed number of rows (1000 by default), so a
 * plain `.select()` silently truncates large tables. This helper pages through the
 * full result set with `.range()` until every row has been retrieved.
 *
 * Pass a factory that applies `.range(from, to)` to a fresh query each call, e.g.:
 *
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from('profiles').select('*').order('created_at').range(from, to)
 *   )
 *
 * @throws the first PostgREST error encountered.
 */
export async function fetchAllRows<T = any>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = []
  let from = 0

  // Hard stop to avoid an unbounded loop if the server keeps returning full pages.
  for (let page = 0; page < 10000; page++) {
    const to = from + pageSize - 1
    const { data, error } = await queryFactory(from, to)
    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...(data as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}
