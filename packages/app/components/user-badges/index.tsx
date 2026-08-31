'use client'

import * as React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { BadgeChip } from 'app/components/badge-chip'
import { EVENT_YEAR } from 'app/utils/event-config'
import { useTranslation } from 'app/i18n'

interface UserBadgesProps {
  userId?: string | null
  size?: number
  showLabels?: boolean
  gap?: number
  ring?: boolean
  align?: 'center' | 'flex-start'
  /** Optional message rendered (after load) when the user has no badges. */
  emptyLabel?: string
}

type ResolvedBadge = { id: string; name: string; description: string; iconUrl: string | null; color: string }

// Module-level cache keyed by userId+locale so switching between views/screens shows
// badges instantly instead of flashing empty. Stale-while-revalidate: seed from cache
// on mount, then always refetch and update the cache.
const badgeCache = new Map<string, ResolvedBadge[]>()

function localize(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.en || (Object.values(value).find((v) => typeof v === 'string') as string) || ''
}

// Badge icon is stored as a key in the public badge-icons bucket (or a full URL).
function resolveIconUrl(icon: string | null | undefined): string | null {
  if (!icon) return null
  if (/^https?:\/\//i.test(icon)) return icon
  try {
    const { data } = supabase.storage.from('badge-icons').getPublicUrl(icon)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

/**
 * Renders the badges a user has earned for the current event as tinted silhouettes.
 * Renders nothing when the user has no badges.
 */
export function UserBadges({ userId, size = 34, showLabels = false, gap = 8, ring = false, align = 'center', emptyLabel }: UserBadgesProps) {
  const { locale } = useTranslation()
  const cacheKey = userId ? `${userId}:${locale}` : ''
  const [badges, setBadges] = React.useState<ResolvedBadge[]>(() => (cacheKey && badgeCache.get(cacheKey)) || [])
  const [loaded, setLoaded] = React.useState<boolean>(() => !!(cacheKey && badgeCache.has(cacheKey)))

  React.useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setBadges([])
      setLoaded(false)
      return
    }
    const key = `${userId}:${locale}`
    const cached = badgeCache.get(key)
    // Seed from cache immediately (no flash); otherwise render nothing until loaded.
    if (cached) {
      setBadges(cached)
      setLoaded(true)
    } else {
      setLoaded(false)
    }
    let mounted = true
    ;(async () => {
      // Two-step (no PostgREST embed): fetch this user's grants, then resolve the
      // badge rows by id. Avoids relying on the user_badges→badges FK being present
      // in PostgREST's schema cache (a stale cache makes an embed silently return
      // nothing right after a migration).
      const { data: ub, error: ubErr } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)
        .eq('event_year', EVENT_YEAR)
      if (!mounted) return
      if (ubErr) {
        console.warn('UserBadges: failed to load user_badges', ubErr)
        return
      }
      const ids = Array.from(new Set((ub || []).map((r: any) => r.badge_id).filter(Boolean)))
      if (ids.length === 0) {
        badgeCache.set(key, [])
        setBadges([])
        setLoaded(true)
        return
      }
      const { data: bs, error: bErr } = await supabase
        .from('badges')
        .select('id, name, icon, color, description')
        .in('id', ids)
      if (!mounted) return
      if (bErr) {
        console.warn('UserBadges: failed to load badges', bErr)
        return
      }
      const byId = new Map<string, any>((bs || []).map((b: any) => [b.id, b]))
      const mapped = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((b: any) => ({
          id: b.id,
          name: localize(b.name, locale),
          description: localize(b.description, locale),
          iconUrl: resolveIconUrl(b.icon),
          color: b.color || '#c2b75f',
        })) as ResolvedBadge[]
      badgeCache.set(key, mapped)
      setBadges(mapped)
      setLoaded(true)
    })()
    return () => {
      mounted = false
    }
  }, [userId, locale])

  if (badges.length === 0) {
    if (loaded && emptyLabel) {
      return <Text style={styles.empty}>{emptyLabel}</Text>
    }
    return null
  }

  return (
    <View style={[styles.row, { gap, justifyContent: align, width: align === 'flex-start' ? '100%' : undefined }]}>
      {badges.map((b) => (
        <BadgeChip
          key={b.id}
          iconUrl={b.iconUrl}
          color={b.color}
          size={size}
          name={b.name}
          description={b.description}
          showLabel={showLabels}
          ring={ring}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
})
