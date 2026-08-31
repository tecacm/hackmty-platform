'use client'

import React, { useEffect, useState, useRef } from 'react'
import { View, Text, Pressable, StyleSheet, Platform, Image, useWindowDimensions } from 'react-native'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { usePathname } from 'next/navigation'
import logoImage from 'app/assets/images/hackmty-logo.webp'
import tecAcm from 'app/assets/images/tec-acm-purple-gold.webp'
import { SolitoImage } from 'solito/image'
import { PersonSilhouette } from 'app/components/person-silhouette'
import { AppIcon } from 'app/components/app-icon'
import { checkEventPassUnlocked, selectActiveRoles, isOperatorRole } from 'app/utils/event-config'
import { useTranslation } from 'app/i18n'

// Module-level in-memory cache to prevent flashing on component mount / route changes
let globalProfileCache: { avatarUrl: string | null; initials: string } | null = null

export function WebNavbar() {
  if (Platform.OS !== 'web') return null

  const { t, locale, setLocale } = useTranslation()
  const { navigateTo, replaceTo } = useSmartNavigate()
  const { hasPermission } = useUserPermissions()
  const pathname = usePathname()
  const { width } = useWindowDimensions()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const isMobile = hasMounted && width > 0 && width < 1200

  const showApplicationTab = hasPermission('applications', 'view')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => globalProfileCache?.avatarUrl ?? null)
  const [initials, setInitials] = useState<string>(() => globalProfileCache?.initials ?? '')
  const [imageError, setImageError] = useState(false)
  const [isPassAllowed, setIsPassAllowed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<any>(null)

  useEffect(() => {
    setImageError(false)
  }, [avatarUrl])

  useEffect(() => {
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
              if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)
              if (parsed.initials) setInitials(parsed.initials)
            } catch (e) {}
          }
        }
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        const first = (profile?.first_name || user.user_metadata?.first_name || user.user_metadata?.name || '').charAt(0).toUpperCase()
        const last = (profile?.last_name || user.user_metadata?.last_name || '').charAt(0).toUpperCase()
        const resolvedInitials = `${first}${last}`.trim() || '👤'
        
        const rawAvatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        let resolvedAvatar: string | null = null
        if (rawAvatar) {
          if (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://')) {
            resolvedAvatar = rawAvatar
          } else {
            const { data } = supabase.storage.from('avatars').getPublicUrl(rawAvatar)
            resolvedAvatar = data?.publicUrl || rawAvatar
          }
        }

        globalProfileCache = { avatarUrl: resolvedAvatar, initials: resolvedInitials }
        setAvatarUrl(resolvedAvatar)
        setInitials(resolvedInitials)

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ avatarUrl: resolvedAvatar, initials: resolvedInitials })
          )
        }
      } catch (err) {
        console.error('Failed to load user profile for navbar:', err)
      }
    }

    loadUserProfile()

    // Listen for custom profile update events from profile screen
    const handleProfileUpdate = (e: any) => {
      if (e?.detail?.avatarUrl !== undefined) {
        setAvatarUrl(e.detail.avatarUrl)
        if (globalProfileCache) globalProfileCache.avatarUrl = e.detail.avatarUrl
      }
      if (e?.detail?.initials !== undefined) {
        setInitials(e.detail.initials)
        if (globalProfileCache) globalProfileCache.initials = e.detail.initials
      }
      loadUserProfile()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('profile_avatar_updated', handleProfileUpdate)
      window.addEventListener('profile_updated', handleProfileUpdate)
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUserProfile()
    })

    async function checkPass() {
      if (!isSupabaseConfigured) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) {
          setIsPassAllowed(false)
          return
        }

        // Resolve roles (staff bypass) and confirmation status, matching the
        // gating used by the profile and QR screens.
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role, event_year')
          .eq('user_id', user.id)
        const rolesList = selectActiveRoles(rolesData).map((r) => r.toLowerCase())
        const isOperator = isOperatorRole(rolesList)

        const { data: userAppsData } = await supabase
          .from('applications')
          .select('status, confirmed_at')
          .eq('user_id', user.id)
        const isConfirmed = Array.isArray(userAppsData) && userAppsData.some(
          (app) => app.status === 'confirmed' || app.confirmed_at !== null
        )

        const isUnlocked = await checkEventPassUnlocked(rolesList)
        setIsPassAllowed((isOperator || isConfirmed) && isUnlocked)
      } catch (err) {
        console.error('Failed to check event pass access for navbar:', err)
        setIsPassAllowed(false)
      }
    }
    checkPass()

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('profile_avatar_updated', handleProfileUpdate)
        window.removeEventListener('profile_updated', handleProfileUpdate)
      }
      authListener?.subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      if (typeof window !== 'undefined') {
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i)
            if (key && key.startsWith('user_profile_')) {
              localStorage.removeItem(key)
            }
          }
        } catch (e) {}
      }
      globalProfileCache = null
      setAvatarUrl(null)
      setInitials('')
      replaceTo('/login')
    }
  }

  return (
    <View style={styles.navbarContainer}>
      <View style={[styles.navbarInner, isMobile && { height: 56 }]}>
        {/* Left Side: Brand logos */}
        <View style={styles.brandGroup}>
          <Pressable onPress={() => { setMobileMenuOpen(false); navigateTo('/home') }} style={styles.brandContainer}>
            <View style={{ width: isMobile ? 95 : 120, height: isMobile ? 28 : 35 }}>
              <SolitoImage
                {...({
                  src: logoImage,
                  height: isMobile ? 28 : 35,
                  width: isMobile ? 95 : 120,
                  alt: 'HackMTY Logo',
                  contentFit: 'contain',
                  resizeMode: 'contain',
                } as any)}
              />
            </View>
          </Pressable>
          <View style={{ width: 1.5, height: isMobile ? 24 : 35, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 8 }} />
          <Pressable onPress={() => { setMobileMenuOpen(false); navigateTo('https://tec.acm.org') }} style={styles.brandContainer}>
             <SolitoImage
              {...({
                src: tecAcm,
                height: isMobile ? 28 : 35,
                width: isMobile ? 95 : 120,
                alt: 'TecACM Logo',
                contentFit: 'contain',
                resizeMode: 'contain',
              } as any)}
            />
          </Pressable>
        </View>

        {/* Center: Absolute Overlaid Links (Desktop) */}
        {!isMobile && (
          <View pointerEvents="box-none" style={styles.linksOverlay}>
            <View style={styles.linksContainer}>
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
                      {t('nav.home')}
                    </Text>
                  )}
                </Pressable>
              )}

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
                      {t('nav.applications')}
                    </Text>
                  )}
                </Pressable>
              )}

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
                      {t('nav.teams')}
                    </Text>
                  )}
                </Pressable>
              )}

              {isPassAllowed && (
                <Pressable
                  onPress={() => navigateTo('/leaderboard')}
                  style={({ hovered }) => [
                    styles.navLink,
                    pathname === '/leaderboard' && styles.navLinkActive,
                  ]}
                >
                  {({ hovered }) => (
                    <Text
                      style={[
                        styles.navLinkText,
                        hovered && styles.navLinkTextHover,
                        pathname === '/leaderboard' && styles.navLinkTextActive,
                      ]}
                    >
                      {t('nav.leaderboard')}
                    </Text>
                  )}
                </Pressable>
              )}

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
                    {t('nav.profile')}
                  </Text>
                )}
              </Pressable>

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
                      {t('nav.admin')}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Right Side: Language Switcher, Avatar Dropdown & Mobile Toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {!isMobile && (
            <Pressable
              onPress={() => setLocale(locale === 'en' ? 'es' : 'en')}
              style={({ hovered }) => [
                styles.langTogglePill,
                hovered && styles.langTogglePillHover,
              ]}
              accessibilityLabel={t('nav.toggleLanguage')}
            >
              <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>EN</Text>
              <Text style={styles.langDivider}>|</Text>
              <Text style={[styles.langText, locale === 'es' && styles.langTextActive]}>ES</Text>
            </Pressable>
          )}

          <View ref={dropdownRef} style={styles.dropdownWrapper}>
            <Pressable onPress={() => setIsOpen(!isOpen)} style={styles.avatarButton}>
              {avatarUrl && !imageError ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  {initials && initials !== '👤' ? (
                    <Text style={styles.avatarFallbackText}>{initials}</Text>
                  ) : (
                    <PersonSilhouette size={28} color="#ffffff" />
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
                  <Text style={styles.dropdownItemText}>{t('nav.myProfile')}</Text>
                </Pressable>
                {isPassAllowed && (
                  <Pressable
                    onPress={() => {
                      setIsOpen(false)
                      navigateTo('/qr')
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={[styles.dropdownItemText, { color: '#c2b75f', fontWeight: '800' }]}>
                      {t('nav.myEventPass')}
                    </Text>
                  </Pressable>
                )}
                <View style={styles.divider} />
                <Pressable onPress={handleSignOut} style={styles.dropdownItem}>
                  <Text style={[styles.dropdownItemText, { color: '#ff6b6b' }]}>{t('nav.signOut')}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {isMobile && (
            <Pressable
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={styles.hamburgerBtn}
            >
              <AppIcon name={mobileMenuOpen ? 'xmark' : 'menu'} size={22} color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Slide-Down Mobile Drawer Menu */}
      {isMobile && mobileMenuOpen && (
        <View style={styles.mobileDrawer}>
          {hasPermission('announcements', 'view') && (
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false)
                navigateTo('/home')
              }}
              style={[
                styles.mobileNavLink,
                (pathname === '/home' || pathname === '/announcements') && styles.mobileNavLinkActive,
              ]}
            >
              <Text style={styles.mobileNavLinkText}>{t('nav.home')}</Text>
            </Pressable>
          )}

          {showApplicationTab && (
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false)
                navigateTo('/applications')
              }}
              style={[
                styles.mobileNavLink,
                (pathname === '/applications' || pathname === '/application') && styles.mobileNavLinkActive,
              ]}
            >
              <Text style={styles.mobileNavLinkText}>{t('nav.applications')}</Text>
            </Pressable>
          )}

          {hasPermission('teams', 'create') && (
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false)
                navigateTo('/teams')
              }}
              style={[
                styles.mobileNavLink,
                pathname === '/teams' && styles.mobileNavLinkActive,
              ]}
            >
              <Text style={styles.mobileNavLinkText}>{t('nav.teams')}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              setMobileMenuOpen(false)
              navigateTo('/profile')
            }}
            style={[
              styles.mobileNavLink,
              pathname === '/profile' && styles.mobileNavLinkActive,
            ]}
          >
            <Text style={styles.mobileNavLinkText}>{t('nav.profile')}</Text>
          </Pressable>

          {isPassAllowed && (
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false)
                navigateTo('/leaderboard')
              }}
              style={[
                styles.mobileNavLink,
                pathname === '/leaderboard' && styles.mobileNavLinkActive,
              ]}
            >
              <Text style={styles.mobileNavLinkText}>{t('nav.leaderboard')}</Text>
            </Pressable>
          )}

          {isPassAllowed && (
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false)
                navigateTo('/qr')
              }}
              style={[
                styles.mobileNavLink,
                pathname === '/qr' && styles.mobileNavLinkActive,
              ]}
            >
              <Text style={[styles.mobileNavLinkText, { color: '#c2b75f', fontWeight: '800' }]}>
                {t('nav.myEventPass')}
              </Text>
            </Pressable>
          )}

          {hasPermission('applications', 'view_others') && (
            <Pressable
              onPress={() => {
                setMobileMenuOpen(false)
                navigateTo('/admin')
              }}
              style={[
                styles.mobileNavLink,
                pathname === '/admin' && styles.mobileNavLinkActive,
              ]}
            >
              <Text style={styles.mobileNavLinkText}>{t('nav.admin')}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setLocale(locale === 'en' ? 'es' : 'en')}
            style={styles.mobileLangRow}
          >
            <Text style={styles.mobileLangLabel}>{t('nav.language')}</Text>
            <View style={styles.langTogglePill}>
              <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>EN</Text>
              <Text style={styles.langDivider}>|</Text>
              <Text style={[styles.langText, locale === 'es' && styles.langTextActive]}>ES</Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => {
              setMobileMenuOpen(false)
              handleSignOut()
            }}
            style={[styles.mobileNavLink, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
          >
            <Text style={[styles.mobileNavLinkText, { color: '#ff6b6b' }]}>{t('nav.signOut')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    backgroundColor: 'rgba(23, 23, 26, 0.91)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
    paddingTop: 'env(safe-area-inset-top, 0px)',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      } as any,
    }),
  },
  navbarInner: {
    position: 'relative',
    maxWidth: 1600,
    width: '100%',
    height: 50,
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
  hamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mobileDrawer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(23, 23, 26, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    zIndex: 999,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4)',
      } as any,
    }),
  },
  mobileNavLink: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  mobileNavLinkActive: {
    backgroundColor: '#7a47a2',
  },
  mobileNavLinkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  langTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      } as any,
    }),
  },
  langTogglePillHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(194, 183, 95, 0.5)',
  },
  langText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  langTextActive: {
    color: '#c2b75f',
  },
  langDivider: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 10,
  },
  mobileLangRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 4,
  },
  mobileLangLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
})
