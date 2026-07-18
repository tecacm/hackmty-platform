import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'

// Module-level cache state
let cachedPermissions: string[] | null = null
let cachedRole: string | null = null
let currentUserId: string | null = null
let fetchingUserId: string | null = null
let activeRequestId = 0

const listeners = new Set<(state: { permissions: string[]; role: string; loading: boolean }) => void>()

function notifyListeners() {
  const state = {
    permissions: cachedPermissions || [],
    role: cachedRole || 'user',
    loading: cachedPermissions === null
  }
  listeners.forEach(listener => listener(state))
}

async function loadPermissions() {
  const requestId = ++activeRequestId

  if (!isSupabaseConfigured) {
    cachedPermissions = ['teams:create', 'teams:view', 'applications:view_others', 'applications:review', 'sponsor_portal:view']
    cachedRole = 'admin'
    notifyListeners()
    return
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    if (requestId !== activeRequestId) return

    if (!user) {
      cachedPermissions = []
      cachedRole = 'user'
      currentUserId = null
      fetchingUserId = null
      notifyListeners()
      return
    }

    // Skip network request if user is unchanged and cache is loaded
    if (user.id === currentUserId && cachedPermissions !== null) {
      return
    }

    // Skip if we are already fetching for this exact user to avoid duplicate queries
    if (user.id === fetchingUserId) {
      return
    }

    fetchingUserId = user.id

    // 1. Fetch user roles array from public.user_roles table
    const currentYear = new Date().getFullYear().toString()
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role, event_year')
      .eq('user_id', user.id)

    if (requestId !== activeRequestId) return

    const filteredRoles = (rolesData || [])
      .filter(r => r.event_year === currentYear || r.event_year === null || r.event_year === 'NULL' || r.event_year === 'null')
      .map(r => r.role)

    const userRoles = filteredRoles.length > 0 ? filteredRoles : ['user']
    cachedRole = userRoles.join(', ')

    // 2. Fetch role mapping configuration for all roles
    const { data: mapping } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .in('role', userRoles)

    if (requestId !== activeRequestId) return

    if (mapping) {
      // Deduplicate permission ids
      cachedPermissions = Array.from(new Set(mapping.map(m => m.permission_id)))
    } else {
      cachedPermissions = []
    }

    currentUserId = user.id
  } catch (err) {
    if (requestId !== activeRequestId) return
    console.error('Failed to load user permissions:', err)
    cachedPermissions = []
    cachedRole = 'user'
  } finally {
    if (requestId === activeRequestId) {
      fetchingUserId = null
      notifyListeners()
    }
  }
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

    if (cachedPermissions === null) {
      loadPermissions()
    }

    let subscription: any = null
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          cachedPermissions = []
          cachedRole = 'user'
          currentUserId = null
          fetchingUserId = null
          notifyListeners()
        } else {
          // Trigger reload only on user change or if cache is empty
          if (session.user.id !== currentUserId || cachedPermissions === null) {
            cachedPermissions = null
            notifyListeners()
            await loadPermissions()
          }
        }
      })
      subscription = data.subscription
    }

    return () => {
      listeners.delete(listener)
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const hasPermission = (feature: string, action: 'view' | 'modify' | 'create' | 'view_others' | 'review'): boolean => {
    return permissions.includes(`${feature}:${action}`)
  }

  return { permissions, role, hasPermission, loading }
}


