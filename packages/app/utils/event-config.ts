import { supabase, isSupabaseConfigured } from 'app/lib/supabase'

export const EVENT_YEAR = '2026'

let globalConfigCache: {
  configMap: Record<string, string>
  lastFetched: number
} | null = null

const CACHE_TTL_MS = 60 * 1000 // 1 minute cache

export function invalidateGlobalEventConfigCache() {
  globalConfigCache = null
}

/**
 * Dynamically fetches all key-value entries from public.global_config table in Supabase.
 */
export async function getGlobalConfigMap(): Promise<Record<string, string>> {
  const nowMs = Date.now()
  if (globalConfigCache && nowMs - globalConfigCache.lastFetched < CACHE_TTL_MS) {
    return globalConfigCache.configMap
  }

  if (!isSupabaseConfigured) {
    return {}
  }

  try {
    const { data: rows } = await supabase
      .from('global_config')
      .select('key, value')

    const configMap: Record<string, string> = {}
    if (rows) {
      rows.forEach((row) => {
        if (row.key) {
          configMap[row.key] = row.value
        }
      })
    }

    globalConfigCache = {
      configMap,
      lastFetched: nowMs,
    }

    return configMap
  } catch (err) {
    console.error('Error fetching global config from database:', err)
    return globalConfigCache?.configMap || {}
  }
}

/**
 * Filters raw `user_roles` rows down to the roles that are active for the current
 * event year, matching the logic in `use-user-permissions.ts`. This prevents stale
 * roles from previous event years (e.g. a past volunteer/judge) from being treated
 * as current staff. Falls back to `['user']` when no active roles remain.
 */
export function selectActiveRoles(
  rows: Array<{ role: string; event_year?: string | null }> | null | undefined
): string[] {
  const currentYear = new Date().getFullYear().toString()
  const active = (rows || [])
    .filter(
      (r) =>
        r.event_year === currentYear ||
        r.event_year === null ||
        r.event_year === 'NULL' ||
        r.event_year === 'null'
    )
    .map((r) => r.role)
  return active.length > 0 ? active : ['user']
}

/**
 * Roles that operate the event and therefore have unconditional access to the
 * Event Pass: they bypass both the date lock and the attendance-confirmation
 * requirement. These roles typically have no participant application to confirm.
 */
export const OPERATOR_ROLES = ['admin', 'organizer']

/**
 * Returns true when any of the given roles is an event operator (admin/organizer).
 * Applicant-staff roles (volunteer, mentor, judge, sponsor) are NOT operators —
 * they go through the same accept→confirm flow as hackers and must confirm.
 */
export function isOperatorRole(roles: string[] = []): boolean {
  return roles.some((r) => OPERATOR_ROLES.includes((r || '').toLowerCase()))
}

/**
 * Checks whether the Event Pass is active based on database global_config table and user role.
 * Only event operators (admin, organizer) bypass the date lock, for setup & testing.
 * Applicant-staff (volunteer, mentor, judge, sponsor) and hackers are subject to it.
 */
export async function checkEventPassUnlocked(userRolesList: string[] = []): Promise<boolean> {
  // Operators bypass the date lock for testing & setup
  if (isOperatorRole(userRolesList)) return true

  const configMap = await getGlobalConfigMap()

  // 1. Master kill switch from DB (event_pass_enabled)
  const passEnabledStr = configMap['event_pass_enabled']
  if (passEnabledStr && passEnabledStr.toLowerCase() === 'false') {
    return false
  }

  // 2. Event start date lock from DB (event_start_date)
  const startDateStr = configMap['event_start_date']
  if (startDateStr) {
    const startDate = new Date(startDateStr)
    if (!isNaN(startDate.getTime())) {
      const now = new Date()
      return now >= startDate
    }
  }

  return true
}
