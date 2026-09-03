'use client'

import { useEffect, useState } from 'react'
import { View, Text, Image, StyleSheet, Platform } from 'react-native'
import { Skeleton } from 'moti/skeleton'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { EVENT_YEAR } from 'app/utils/event-config'
import { useTranslation } from 'app/i18n'

const CM = 'light' as const

// Cached avatar from the navbar's localStorage cache, so the pass shows the real pfp.
function useCachedAvatar(): string | null {
  const [url, setUrl] = useState<string | null>(null)
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
        const c = localStorage.getItem(`user_profile_${uid}`)
        if (c && mounted) {
          const p = JSON.parse(c)
          if (p.avatarUrl) setUrl(p.avatarUrl)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      mounted = false
    }
  }, [])
  return url
}

/**
 * Loading skeleton for the event pass (QR) screen. Used both as the route's dynamic()
 * fallback and the screen's own loading state, so there's no spinner-then-skeleton.
 * SSR-safe: fixed QR size (no width-based branch) and the cached avatar is read
 * client-only, so server and client first render match.
 */
export function QRSkeleton() {
  const { t } = useTranslation()
  const avatarUrl = useCachedAvatar()
  return (
    <View style={styles.mainContainer}>
      <View style={styles.scrollContent}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerSubtitle}>{t('qr.officialEventPass', { year: EVENT_YEAR })}</Text>
        </View>
        <View style={styles.passCard}>
          <Skeleton colorMode={CM} width={'100%'} height={40} radius={12} />
          <View style={{ height: 20 }} />
          <Skeleton colorMode={CM} width={'100%'} height={44} radius={12} />
          <View style={{ height: 20 }} />
          <View style={styles.qrPassBody}>
            <View style={styles.qrWrapper}>
              <Skeleton colorMode={CM} width={230} height={230} radius={12} />
            </View>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Skeleton colorMode={CM} radius="round" width={'100%'} height={'100%'} />
                )}
              </View>
              <Skeleton colorMode={CM} width={160} height={18} radius={4} />
              <View style={{ height: 10 }} />
              <Skeleton colorMode={CM} width={90} height={26} radius={6} />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, width: '100%', position: 'relative' },
  scrollContent: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: '100%',
  },
  headerBadge: { alignItems: 'center', marginBottom: 20 },
  headerSubtitle: { color: '#c2b75f', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  passCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
      },
      web: { boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)' } as any,
    }),
  },
  qrPassBody: { width: '100%', alignItems: 'center' },
  qrWrapper: {
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileSection: { width: '100%', alignItems: 'center' },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#5a0061',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: { width: '100%', height: '100%' },
})
