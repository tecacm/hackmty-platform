'use client'

import * as React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { PersonSilhouette } from 'app/components/person-silhouette'
import { BadgeChip } from 'app/components/badge-chip'
import { EVENT_YEAR } from 'app/utils/event-config'
import { useTranslation } from 'app/i18n'

type LeaderboardRow = {
  user_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  total_points: number
  check_in_count: number
}

const TOP_LIMIT = 100

function resolveAvatar(raw: string | null): string | null {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  try {
    const { data } = supabase.storage.from('avatars').getPublicUrl(raw)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

const RANK_COLORS: Record<number, string> = {
  1: '#c2b75f', // gold
  2: '#cbd5e1', // silver
  3: '#d8a15e', // bronze
}

type RowBadge = { id: string; iconUrl: string | null; color: string; name: any; description: any }

function localizeBadge(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.en || (Object.values(value).find((v) => typeof v === 'string') as string) || ''
}

function resolveBadgeIcon(icon: string | null | undefined): string | null {
  if (!icon) return null
  if (/^https?:\/\//i.test(icon)) return icon
  try {
    const { data } = supabase.storage.from('badge-icons').getPublicUrl(icon)
    return data?.publicUrl || null
  } catch {
    return null
  }
}

export function LeaderboardScreen() {
  const { t, locale } = useTranslation()
  const [rows, setRows] = React.useState<LeaderboardRow[]>([])
  const [badgesByUser, setBadgesByUser] = React.useState<Record<string, RowBadge[]>>({})
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data, error: qErr } = await supabase
        .from('leaderboard')
        .select('user_id, first_name, last_name, avatar_url, total_points, check_in_count')
        .eq('event_year', EVENT_YEAR)
        .order('total_points', { ascending: false })
        .order('last_check_in_at', { ascending: true })
        .limit(TOP_LIMIT)

      if (qErr) throw qErr
      const list = (data as LeaderboardRow[]) || []
      setRows(list)

      // Bulk-fetch badges for the listed users in two embed-free queries (avoids N+1
      // and avoids relying on the user_badges→badges FK in PostgREST's schema cache).
      const ids = list.map((r) => r.user_id).filter(Boolean)
      if (ids.length > 0) {
        const { data: ub } = await supabase
          .from('user_badges')
          .select('user_id, badge_id')
          .in('user_id', ids)
          .eq('event_year', EVENT_YEAR)
        const grants = (ub as Array<{ user_id: string; badge_id: string }>) || []
        const badgeIds = Array.from(new Set(grants.map((g) => g.badge_id).filter(Boolean)))
        const byId: Record<string, { id: string; icon: string | null; color: string | null; name: any; description: any }> = {}
        if (badgeIds.length > 0) {
          const { data: bs } = await supabase
            .from('badges')
            .select('id, icon, color, name, description')
            .in('id', badgeIds)
          ;(bs || []).forEach((b: any) => {
            byId[b.id] = b
          })
        }
        const map: Record<string, RowBadge[]> = {}
        grants.forEach((g) => {
          const b = byId[g.badge_id]
          if (!b?.id) return
          const arr = map[g.user_id] ?? (map[g.user_id] = [])
          arr.push({
            id: b.id,
            iconUrl: resolveBadgeIcon(b.icon),
            color: b.color || '#c2b75f',
            name: b.name,
            description: b.description,
          })
        })
        setBadgesByUser(map)
      } else {
        setBadgesByUser({})
      }
    } catch (e: any) {
      console.warn('Failed to load leaderboard:', e)
      setError(e?.message || 'Could not load leaderboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  const currentUserRank = React.useMemo(() => {
    const idx = rows.findIndex((r) => r.user_id === currentUserId)
    return idx >= 0 ? idx + 1 : null
  }, [rows, currentUserId])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c2b75f" />
        <Text style={styles.loadingText}>{t('leaderboard.loading')}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ width: '100%' }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c2b75f" />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('leaderboard.title')}</Text>
        <Text style={styles.subtitle}>{t('leaderboard.subtitle')}</Text>
        {currentUserRank ? (
          <View style={styles.myRankPill}>
            <Text style={styles.myRankText}>
              {t('leaderboard.yourRank', { rank: currentUserRank })}
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('leaderboard.empty')}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {rows.map((row, index) => {
            const rank = index + 1
            const isMe = row.user_id === currentUserId
            const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || t('leaderboard.anonymous')
            const avatar = resolveAvatar(row.avatar_url)
            const rankColor = RANK_COLORS[rank]
            const rowBadges = badgesByUser[row.user_id] || []

            return (
              <View key={row.user_id} style={[styles.rowCard, isMe && styles.rowCardMe]}>
                <View style={[styles.rankBadge, rankColor && { backgroundColor: rankColor }]}>
                  <Text style={[styles.rankText, rankColor && { color: '#1d041f' }]}>{rank}</Text>
                </View>

                <View style={styles.avatar}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                  ) : (
                    <PersonSilhouette size={26} />
                  )}
                </View>

                <View style={styles.nameCol}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                    {isMe ? <Text style={styles.youTag}>  {t('leaderboard.you')}</Text> : null}
                  </Text>
                  <Text style={styles.checkins}>
                    {t('leaderboard.checkins', { count: row.check_in_count })}
                  </Text>
                  {rowBadges.length ? (
                    <View style={styles.rowBadges}>
                      {rowBadges.map((b) => (
                        <BadgeChip
                          key={b.id}
                          iconUrl={b.iconUrl}
                          color={b.color}
                          size={16}
                          name={localizeBadge(b.name, locale)}
                          description={localizeBadge(b.description, locale)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.pointsCol}>
                  <Text style={styles.points}>{row.total_points}</Text>
                  <Text style={styles.pointsLabel}>{t('qr.pointsLabel')}</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  content: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 32 : 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  header: {
    width: '100%',
    maxWidth: 640,
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
  },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '900', letterSpacing: 0.3 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  myRankPill: {
    marginTop: 8,
    backgroundColor: '#3d0042',
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  myRankText: { color: '#c2b75f', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  errorText: { color: '#ff6b6b', fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  emptyText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  list: {
    width: '100%',
    maxWidth: 640,
    gap: 8,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowCardMe: {
    borderColor: '#c2b75f',
    borderWidth: 2,
    backgroundColor: '#fffdf5',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#475569', fontSize: 14, fontWeight: '900' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  nameCol: { flex: 1, minWidth: 0 },
  name: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  youTag: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
  checkins: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 1 },
  rowBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  pointsCol: { alignItems: 'flex-end' },
  points: { color: '#5a0061', fontSize: 18, fontWeight: '900' },
  pointsLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
})
