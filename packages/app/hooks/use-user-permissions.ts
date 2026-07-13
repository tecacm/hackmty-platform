import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'

// Module-level cache state
let cachedPermissions: string[] | null = null
let cachedRole: string | null = null
let currentUserId: string | null = null
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

async function loadPermissions() {
  if (!isSupabaseConfigured) {
    cachedPermissions = ['teams:create', 'teams:view', 'applications:create', 'applications:view', 'applications:modify', 'sponsor_portal:view']
    cachedRole = 'admin'
    notifyListeners()
    return
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      cachedPermissions = []
      cachedRole = 'user'
      currentUserId = null
      notifyListeners()
      return
    }

    // Skip network request if user is unchanged and cache is loaded
    if (user.id === currentUserId && cachedPermissions !== null) {
      return
    }

    if (isFetching) return
    isFetching = true
    currentUserId = user.id

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

// Sync auth session changes globally
if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      cachedPermissions = []
      cachedRole = 'user'
      currentUserId = null
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

    return () => {
      listeners.delete(listener)
    }
  }, [])

  const hasPermission = (feature: string, action: 'view' | 'modify' | 'create'): boolean => {
    return permissions.includes(`${feature}:${action}`)
  }

  return { permissions, role, hasPermission, loading }
}

