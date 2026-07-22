import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'

let cachedPermissions: string[] | null = null
let cachedRole: string | null = null
let currentUserId: string | null = null
let permissionsLoadPromise: Promise<void> | null = null
let permissionsLoadGeneration: number | null = null
let cacheGeneration = 0

const listeners = new Set<(state: { permissions: string[]; role: string; loading: boolean }) => void>()

function notifyListeners() {
  const state = {
    permissions: cachedPermissions || [],
    role: cachedRole || 'user',
    loading: cachedPermissions === null,
  }
  listeners.forEach(listener => listener(state))
}

function resetPermissions() {
  cacheGeneration += 1
  cachedPermissions = null
  cachedRole = null
  currentUserId = null
}

async function loadPermissions() {
  // Every mounted screen shares one request. This is important because the navbar
  // and the current page both use this hook.
  if (permissionsLoadPromise && permissionsLoadGeneration === cacheGeneration) return permissionsLoadPromise

  const generation = cacheGeneration
  const promise = (async () => {
    if (!isSupabaseConfigured) {
      cachedPermissions = ['teams:create', 'teams:view', 'applications:view_others', 'applications:review', 'sponsor_portal:view', 'announcements:view', 'announcements:create']
      cachedRole = 'admin'
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (generation !== cacheGeneration) return

      const user = session?.user
      if (!user) {
        cachedPermissions = []
        cachedRole = 'user'
        currentUserId = null
        return
      }

      if (user.id === currentUserId && cachedPermissions !== null) return

      const currentYear = new Date().getFullYear().toString()
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, event_year')
        .eq('user_id', user.id)

      if (generation !== cacheGeneration) return
      if (rolesError) throw rolesError

      const userRoles = (rolesData || [])
        .filter(r => r.event_year === currentYear || r.event_year === null || r.event_year === 'NULL' || r.event_year === 'null')
        .map(r => r.role)
      const activeRoles = userRoles.length > 0 ? userRoles : ['user']

      const { data: mapping, error: mappingError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role', activeRoles)

      if (generation !== cacheGeneration) return
      if (mappingError) throw mappingError

      cachedPermissions = Array.from(new Set((mapping || []).map(m => m.permission_id)))
      cachedRole = activeRoles.join(', ')
      currentUserId = user.id
    } catch (err) {
      if (generation !== cacheGeneration) return
      console.error('Failed to load user permissions:', err)
      cachedPermissions = []
      cachedRole = 'user'
      currentUserId = null
    }
  })()

  permissionsLoadPromise = promise
  permissionsLoadGeneration = generation
  try {
    await promise
  } finally {
    if (permissionsLoadPromise === promise) {
      permissionsLoadPromise = null
      permissionsLoadGeneration = null
    }
    if (generation === cacheGeneration) notifyListeners()
  }
}

function schedulePermissionLoad() {
  // Supabase auth holds an internal lock while invoking onAuthStateChange.
  // Starting auth/database work in the next macrotask avoids deadlocking it.
  setTimeout(() => {
    void loadPermissions()
  }, 0)
}

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<string[]>(cachedPermissions || [])
  const [role, setRole] = useState<string>(cachedRole || 'user')
  const [loading, setLoading] = useState(cachedPermissions === null)

  useEffect(() => {
    const listener = (state: { permissions: string[]; role: string; loading: boolean }) => {
      setPermissions(state.permissions)
      setRole(state.role)
      setLoading(state.loading)
    }
    listeners.add(listener)

    if (cachedPermissions === null) void loadPermissions()

    if (!isSupabaseConfigured) {
      return () => listeners.delete(listener)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        resetPermissions()
        cachedPermissions = []
        cachedRole = 'user'
        notifyListeners()
        return
      }

      if (session.user.id !== currentUserId || cachedPermissions === null) {
        resetPermissions()
        notifyListeners()
        schedulePermissionLoad()
      }
    })

    return () => {
      listeners.delete(listener)
      subscription.unsubscribe()
    }
  }, [])

  const hasPermission = (feature: string, action: 'view' | 'modify' | 'create' | 'view_others' | 'review'): boolean => {
    return permissions.includes(`${feature}:${action}`)
  }

  return { permissions, role, hasPermission, loading }
}
