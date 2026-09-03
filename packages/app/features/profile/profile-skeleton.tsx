'use client'

import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, Platform } from 'react-native'
import { Skeleton } from 'moti/skeleton'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
import { useTranslation } from 'app/i18n'
import { UserBadges } from 'app/components/user-badges'

const CM = 'light' as const

type CachedProfile = { uid: string | null; url: string | null; initials: string; name: string; role: string | null }

// The web navbar caches avatar/initials/name in localStorage (user_profile_<id>), and the
// permissions hook caches the role (user_role_<id>). Reading both lets the profile skeleton
// paint the real avatar, name AND role together during load — no per-field pop-in.
function useCachedProfile(): CachedProfile | null {
  const [data, setData] = useState<CachedProfile | null>(null)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !isSupabaseConfigured) return
    let mounted = true
    ;(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (!uid || !mounted) return
        let url: string | null = null
        let initials = ''
        let name = ''
        const cached = localStorage.getItem(`user_profile_${uid}`)
        if (cached) {
          const p = JSON.parse(cached)
          url = p.avatarUrl ?? null
          initials = p.initials ?? ''
          name = `${p.firstName || ''} ${p.lastName || ''}`.trim()
        }
        const role = localStorage.getItem(`user_role_${uid}`)
        if (mounted) setData({ uid, url, initials, name, role: role || null })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      mounted = false
    }
  }, [])
  return data
}

/** Loading skeleton for the profile screen (floating header + awards card). */
export function ProfileSkeleton() {
  const cached = useCachedProfile()
  const { role: liveRole, loading: permsLoading } = useUserPermissions()
  const { locale } = useTranslation()

  // Prefer the live (in-memory) role; fall back to the persisted one so it paints instantly.
  const resolvedRole = !permsLoading ? liveRole : cached?.role || null

  return (
    <>
      <View style={styles.floatingHeader}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            {cached?.url ? (
              <Image source={{ uri: cached.url }} style={styles.avatarImage} />
            ) : cached?.initials ? (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{cached.initials}</Text>
              </View>
            ) : (
              <Skeleton colorMode={CM} radius="round" width={110} height={110} />
            )}
          </View>
        </View>

        {cached?.name ? (
          <Text style={styles.floatingName}>{cached.name}</Text>
        ) : (
          <View style={{ marginBottom: 4 }}>
            <Skeleton colorMode={CM} width={220} height={28} radius={6} />
          </View>
        )}

        {resolvedRole ? (
          <Text style={styles.floatingRole}>{getApplicantRoleLabel(resolvedRole, locale)}</Text>
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Skeleton colorMode={CM} width={130} height={16} radius={4} />
          </View>
        )}
      </View>

      <View style={styles.innerCard}>
        {/* Card header: university / grad year (not cached) + the Awards/Info toggle */}
        <View style={styles.cardHeaderRow}>
          <View style={{ gap: 8, flex: 1, minWidth: 160 }}>
            <Skeleton colorMode={CM} width={180} height={18} radius={4} />
            <Skeleton colorMode={CM} width={120} height={12} radius={4} />
          </View>
          <Skeleton colorMode={CM} width={220} height={40} radius={12} />
        </View>

        {/* Default view is "awards": the real badges component (self-cached) shows circles. */}
        <View style={styles.badgesBig}>
          <UserBadges userId={cached?.uid ?? null} size={64} ring gap={20} showLabels align="flex-start" />
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  floatingHeader: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#ffffff22',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff33',
  },
  avatarInitials: { color: '#ffffff', fontSize: 40, fontWeight: '800' },
  floatingName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  floatingRole: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  innerCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      },
      web: { boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)' } as any,
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  badgesBig: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
})
