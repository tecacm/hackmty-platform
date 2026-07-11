import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'

// Module-level state cache
let cachedPermissions: string[] | null = null
let cachedRole: string | null = null
let isFetching = false
const listeners = new Set<(state: { permissions: string[]; role: string; loading: boolean }) => void>()

function notifyListeners() {
  const state = {
    permissions: cachedPermissions || [],
    role: cachedRole || 'user',
    loading: cachedPermissions === null
  }
  listeners.forEach(listener => listener(state))
}

// Sync session auth changes to flush/refresh caching bounds
if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      cachedPermissions = null
      cachedRole = null
      notifyListeners()
    } else if (event === 'SIGNED_IN') {
      cachedPermissions = null
      cachedRole = null
      notifyListeners()
    }
  })
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

    async function loadPermissions() {
      if (cachedPermissions !== null) {
        setLoading(false)
        return
      }

      if (!isSupabaseConfigured) {
        cachedPermissions = ['teams:create', 'teams:view', 'applications:create', 'applications:view', 'applications:modify', 'sponsor_portal:view']
        cachedRole = 'admin'
        notifyListeners()
        return
      }

      if (isFetching) return
      isFetching = true

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          cachedPermissions = []
          cachedRole = 'user'
          notifyListeners()
          return
        }

        // 1. Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        const userRole = profile?.role || 'user'
        cachedRole = userRole

        // 2. Fetch role mapping configuration
        const { data: mapping } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role', userRole)

        if (mapping) {
          cachedPermissions = mapping.map(m => m.permission_id)
        } else {
          cachedPermissions = []
        }
      } catch (err) {
        console.error('Failed to load user permissions:', err)
        cachedPermissions = []
        cachedRole = 'user'
      } finally {
        isFetching = false
        notifyListeners()
      }
    }

    loadPermissions()

    return () => {
      listeners.delete(listener)
    }
  }, [])

  const hasPermission = (feature: string, action: 'view' | 'modify' | 'create'): boolean => {
    return permissions.includes(`${feature}:${action}`)
  }

  return { permissions, role, hasPermission, loading }
}
