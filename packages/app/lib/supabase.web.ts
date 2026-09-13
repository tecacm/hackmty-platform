import { createBrowserClient } from '@supabase/ssr'
import { fetchAllRows as _fetchAllRows } from './supabase-pagination'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createBrowserClient(
  supabaseUrl || 'https://localhost.supabase.co',
  supabaseAnonKey || 'missing-supabase-anon-key'
)

export { fetchAllRows } from './supabase-pagination'

/**
 * All (user_id, email) pairs from the admin directory RPC, paginated past the PostgREST
 * 1000-row cap. The RPC reads emails from auth.users (source of truth) and is admin/organizer
 * gated. Returns [] on error so callers can degrade gracefully.
 */
export async function fetchAdminDirectoryEmails(): Promise<Array<{ user_id: string; email: string }>> {
  try {
    return await _fetchAllRows<{ user_id: string; email: string }>((from, to) =>
      supabase
        .rpc('get_admin_directory_emails')
        .select('user_id, email')
        .order('user_id', { ascending: true })
        .range(from, to) as any
    )
  } catch {
    return []
  }
}
