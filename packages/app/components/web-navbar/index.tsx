'use client'

import React, { useEffect, useState, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Platform, Image } from 'react-native'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { usePathname } from 'next/navigation'
import logoImage from 'app/assets/images/hackmty-logo.webp'
import tecAcm from 'app/assets/images/tec-acm-purple-gold.webp'
import { SolitoImage } from 'solito/image'
import { PersonSilhouette } from 'app/components/person-silhouette'

// Module-level in-memory cache to prevent flashing on component mount / route changes
let globalProfileCache: { avatarUrl: string | null; initials: string } | null = null

export function WebNavbar() {
  if (Platform.OS !== 'web') return null

  const { navigateTo, replaceTo } = useSmartNavigate()
  const { hasPermission } = useUserPermissions()
  const pathname = usePathname()

  const showApplicationTab = hasPermission('applications', 'view')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => globalProfileCache?.avatarUrl ?? null)
  const [initials, setInitials] = useState<string>(() => globalProfileCache?.initials ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<any>(null)

  useEffect(() => {
    // Synchronously check localStorage if global cache is empty
    if (!globalProfileCache && typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('user_profile_')) {
            const cached = localStorage.getItem(key)
            if (cached) {
              const parsed = JSON.parse(cached)
              if (parsed.avatarUrl || parsed.initials) {
                const init = parsed.initials && parsed.initials !== '👤' ? parsed.initials : ''
                globalProfileCache = { avatarUrl: parsed.avatarUrl || null, initials: init }
                setAvatarUrl(parsed.avatarUrl || null)
                setInitials(init)
                break
              }
            }
          }
        }
      } catch (e) {}
    }

    async function loadUserProfile() {
      if (!isSupabaseConfigured) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) return

        const cacheKey = `user_profile_${user.id}`
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            try {
              const parsed = JSON.parse(cached)
              const init = parsed.initials && parsed.initials !== '👤' ? parsed.initials : ''
              globalProfileCache = { avatarUrl: parsed.avatarUrl || null, initials: init }
              setInitials(init)
              if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)
            } catch (e) {}
          }
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) return

        const first = (profile.first_name || '').charAt(0).toUpperCase()
        const last = (profile.last_name || '').charAt(0).toUpperCase()
        const resolvedInitials = `${first}${last}`.trim()
        
        let resolvedAvatar: string | null = null
        if (profile.avatar_url) {
          resolvedAvatar = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl
        }

        globalProfileCache = { avatarUrl: resolvedAvatar, initials: resolvedInitials }
        setInitials(resolvedInitials)
        setAvatarUrl(resolvedAvatar)

        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify({
            initials: resolvedInitials,
            avatarUrl: resolvedAvatar
          }))
        }
      } catch (err) {
        console.error('Failed to load user profile in WebNavbar:', err)
      }
    }

    loadUserProfile()

    // Listen for auth changes to clear or refresh navbar avatar immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        globalProfileCache = null
        setAvatarUrl(null)
        setInitials('')
      } else {
        loadUserProfile()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    try {
      globalProfileCache = null
      setAvatarUrl(null)
      setInitials('')
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        localStorage.clear()
      }
      replaceTo('/login')
    } catch (err) {
      console.error('Failed to sign out:', err)
    }
  }

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <View style={styles.navbarContainer}>
      <View style={styles.navbarInner}>
        {/* Left Side: Brand Logo */}
        <View style={styles.brandGroup}>
          <Pressable onPress={() => navigateTo('/home')} style={styles.brandContainer}>
            <SolitoImage
              {...({
                src: logoImage,
                height: 35,
                width: 120,
                alt: 'The HackMTY Logo',
                contentFit: 'contain',
                resizeMode: 'contain',
              } as any)}
            />    
          </Pressable>
          <View style={{width: 2, height: 35, backgroundColor: "rgba(255,255,255,0.18)"}} />
          <Pressable onPress={() => navigateTo('https://tec.acm.org')} style={styles.brandContainer}>
            <SolitoImage
              {...({
                src: tecAcm,
                height: 35,
                width: 120,
                alt: 'The TecACM Logo',
                contentFit: 'contain',
                resizeMode: 'contain',
              } as any)}
            />    
          </Pressable>
        </View>

        {/* Center: Main Links */}
        <View pointerEvents="box-none" style={styles.linksOverlay}>
          <View style={styles.linksContainer}>
            {/* 1st Link: Feed / Announcements */}
            {hasPermission('announcements', 'view') && (
              <Pressable
                onPress={() => navigateTo('/home')}
                style={({ hovered }) => [
                  styles.navLink,
                  (pathname === '/home' || pathname === '/announcements') && styles.navLinkActive,
                ]}
              >
                {({ hovered }) => (
                  <Text
                    style={[
                      styles.navLinkText,
                      hovered && styles.navLinkTextHover,
                      (pathname === '/home' || pathname === '/announcements') && styles.navLinkTextActive,
                    ]}
                  >
                    Feed
                  </Text>
                )}
              </Pressable>
            )}

            {/* 2nd Link: Application */}
            {showApplicationTab && (
              <Pressable
                onPress={() => navigateTo('/applications')}
                style={({ hovered }) => [
                  styles.navLink,
                  (pathname === '/applications' || pathname === '/application') && styles.navLinkActive,
                ]}
              >
                {({ hovered }) => (
                  <Text
                    style={[
                      styles.navLinkText,
                      hovered && styles.navLinkTextHover,
                      (pathname === '/applications' || pathname === '/application') && styles.navLinkTextActive,
                    ]}
                  >
                    Application
                  </Text>
                )}
              </Pressable>
            )}

            {/* 3rd Link: My Team */}
            {hasPermission('teams', 'create') && (
              <Pressable
                onPress={() => navigateTo('/teams')}
                style={({ hovered }) => [
                  styles.navLink,
                  pathname === '/teams' && styles.navLinkActive,
                ]}
              >
                {({ hovered }) => (
                  <Text
                    style={[
                      styles.navLinkText,
                      hovered && styles.navLinkTextHover,
                      pathname === '/teams' && styles.navLinkTextActive,
                    ]}
                  >
                    My Team
                  </Text>
                )}
              </Pressable>
            )}

            {/* 4th Link: Profile */}
            <Pressable
              onPress={() => navigateTo('/profile')}
              style={({ hovered }) => [
                styles.navLink,
                pathname === '/profile' && styles.navLinkActive,
              ]}
            >
              {({ hovered }) => (
                <Text
                  style={[
                    styles.navLinkText,
                    hovered && styles.navLinkTextHover,
                    pathname === '/profile' && styles.navLinkTextActive,
                  ]}
                >
                  Profile
                </Text>
              )}
            </Pressable>

            {/* 5th Link: Admin */}
            {hasPermission('applications', 'view_others') && (
              <Pressable
                onPress={() => navigateTo('/admin')}
                style={({ hovered }) => [
                  styles.navLink,
                  pathname === '/admin' && styles.navLinkActive,
                ]}
              >
                {({ hovered }) => (
                  <Text
                    style={[
                      styles.navLinkText,
                      hovered && styles.navLinkTextHover,
                      pathname === '/admin' && styles.navLinkTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Right Side: Avatar Dropdown */}
        <View ref={dropdownRef} style={styles.dropdownWrapper}>
          <Pressable onPress={() => setIsOpen(!isOpen)} style={styles.avatarButton}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                {initials && initials !== '👤' ? (
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                ) : (
                  <PersonSilhouette size={32} color="#ffffff" />
                )}
              </View>
            )}
          </Pressable>

          {isOpen && (
            <View style={styles.dropdownMenu}>
              <Pressable
                onPress={() => {
                  setIsOpen(false)
                  navigateTo('/profile')
                }}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownItemText}>My Profile</Text>
              </Pressable>
              <View style={styles.divider} />
              <Pressable onPress={handleSignOut} style={styles.dropdownItem}>
                <Text style={[styles.dropdownItemText, { color: '#ff6b6b' }]}>Sign Out</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(23, 23, 26, 0.91)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
    }),
  },
  navbarInner: {
    position: 'relative',
    maxWidth: 1200,
    width: '100%',
    height: '100%',
    marginHorizontal: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  linksOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLink: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
      } as any
    })
  },
  navLinkActive: {
    backgroundColor: '#7a47a2',
  },
  navLinkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: 1,
    ...Platform.select({
      web: {
        transition: 'color 0.2s ease',
      } as any
    })
  },
  navLinkTextHover: {
    color: '#c2b75f',
  },
  navLinkTextActive: {
    color: '#ffffff',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3b1c3f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  dropdownWrapper: {
    position: 'relative',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 160,
    backgroundColor: 'rgba(29, 4, 31, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
    }),
  },
  dropdownItem: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    color: '#e1e1e1',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
})
