'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform, useWindowDimensions } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { BadgeIcon } from 'app/components/badge-icon'
import { AppIcon } from 'app/components/app-icon'
import { showAlert } from 'app/components/cross-alert'
import { useTranslation } from 'app/i18n'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { EVENT_YEAR } from 'app/utils/event-config'
import { iconPublicUrl, localizeText, type Badge } from 'app/utils/badge-helpers'

type Profile = { id: string; first_name: string | null; last_name: string | null; email: string | null }

type PlacementData = { label: string; points: number; userIds: string[]; badgeIds: string[] }
type Tournament = { id: string; name: string; placements: PlacementData[]; created_at: string }

type Placement = {
  key: string
  label: string
  points: string
  userIds: string[]
  badgeIds: string[]
  query: string
}

const DEFAULT_POINTS = ['100', '75', '50']

function profileName(p: Profile): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || (p.email ?? p.id)
}

function uniqueParticipants(placements: PlacementData[] | Placement[]): number {
  const s = new Set<string>()
  ;(placements as any[]).forEach((p) => (p.userIds || []).forEach((id: string) => s.add(id)))
  return s.size
}

export function TournamentTab() {
  const { t, locale } = useTranslation()
  const { hasPermission } = useUserPermissions()
  const canModify = hasPermission('tournaments', 'modify')
  const { width } = useWindowDimensions()
  const isNarrow = width < 640

  const [loading, setLoading] = React.useState(true)
  const [profiles, setProfiles] = React.useState<Profile[]>([])
  const [badges, setBadges] = React.useState<Badge[]>([])
  const [adminId, setAdminId] = React.useState<string | null>(null)
  const [tournaments, setTournaments] = React.useState<Tournament[]>([])

  const [mode, setMode] = React.useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState('')
  const [placements, setPlacements] = React.useState<Placement[]>([])
  const [openPicker, setOpenPicker] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const placementSeq = React.useRef(0)
  const makePlacement = React.useCallback(
    (i: number): Placement => {
      placementSeq.current += 1
      return {
        key: `p${placementSeq.current}`,
        label: t('admin.tournamentPlaceDefault', { n: i + 1 }),
        points: DEFAULT_POINTS[i] ?? '25',
        userIds: [],
        badgeIds: [],
        query: '',
      }
    },
    [t]
  )

  const profileById = React.useMemo(() => {
    const m = new Map<string, Profile>()
    profiles.forEach((p) => m.set(p.id, p))
    return m
  }, [profiles])

  const badgeById = React.useMemo(() => {
    const m = new Map<string, Badge>()
    badges.forEach((b) => m.set(b.id, b))
    return m
  }, [badges])

  const fetchTournaments = React.useCallback(async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('id, name, placements, created_at')
      .eq('event_year', EVENT_YEAR)
      .order('created_at', { ascending: false })
    setTournaments((data as Tournament[]) || [])
  }, [])

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        // profiles has no email column — names from profiles, emails from the admin RPC.
        const [{ data: profs }, { data: cat }, { data: auth }, emailsRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name').order('first_name', { ascending: true }),
          supabase.from('badges').select('*').order('created_at', { ascending: true }),
          supabase.auth.getUser(),
          supabase.rpc('get_admin_directory_emails'),
        ])
        if (cancelled) return
        const emailMap: Record<string, string> = {}
        ;(emailsRes?.data as any[] | null)?.forEach((e) => {
          if (e?.user_id && e?.email) emailMap[e.user_id] = e.email
        })
        setProfiles(
          ((profs as any[]) || []).map((p) => ({
            id: p.id,
            first_name: p.first_name ?? null,
            last_name: p.last_name ?? null,
            email: emailMap[p.id] ?? null,
          }))
        )
        setBadges((cat as Badge[]) || [])
        setAdminId(auth?.user?.id || null)
        await fetchTournaments()
      } catch {
        if (!cancelled) {
          setProfiles([])
          setBadges([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchTournaments])

  const assignedIds = React.useMemo(() => {
    const s = new Set<string>()
    placements.forEach((p) => p.userIds.forEach((id) => s.add(id)))
    return s
  }, [placements])

  const updatePlacement = (key: string, patch: Partial<Placement>) =>
    setPlacements((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  const addPlacement = () => setPlacements((prev) => [...prev, makePlacement(prev.length)])
  const removePlacement = (key: string) => setPlacements((prev) => prev.filter((p) => p.key !== key))
  const addUser = (key: string, id: string) =>
    setPlacements((prev) =>
      prev.map((p) => (p.key === key ? { ...p, userIds: p.userIds.includes(id) ? p.userIds : [...p.userIds, id], query: '' } : p))
    )
  const removeUser = (key: string, id: string) =>
    setPlacements((prev) => prev.map((p) => (p.key === key ? { ...p, userIds: p.userIds.filter((u) => u !== id) } : p)))
  const togglePlacementBadge = (key: string, badgeId: string) =>
    setPlacements((prev) =>
      prev.map((p) =>
        p.key === key
          ? { ...p, badgeIds: p.badgeIds.includes(badgeId) ? p.badgeIds.filter((b) => b !== badgeId) : [...p.badgeIds, badgeId] }
          : p
      )
    )

  const matchesFor = (query: string): Profile[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return profiles
      .filter((p) => {
        if (assignedIds.has(p.id)) return false
        const hay = `${profileName(p)} ${p.email ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 8)
  }

  const openNew = () => {
    if (!canModify) return
    setEditingId(null)
    setName('')
    setPlacements([makePlacement(0), makePlacement(1), makePlacement(2)])
    setFormError(null)
    setOpenPicker(null)
    setMode('editor')
  }

  const openEdit = (tourn: Tournament) => {
    if (!canModify) return
    setEditingId(tourn.id)
    setName(tourn.name)
    const rows = Array.isArray(tourn.placements) ? tourn.placements : []
    const mapped: Placement[] = rows.map((pl, i) => {
      placementSeq.current += 1
      return {
        key: `p${placementSeq.current}`,
        label: pl.label || t('admin.tournamentPlaceDefault', { n: i + 1 }),
        points: String(pl.points ?? 0),
        userIds: Array.isArray(pl.userIds) ? pl.userIds : [],
        badgeIds: Array.isArray(pl.badgeIds) ? pl.badgeIds : [],
        query: '',
      }
    })
    setPlacements(mapped.length > 0 ? mapped : [makePlacement(0)])
    setFormError(null)
    setOpenPicker(null)
    setMode('editor')
  }

  const handleSave = async () => {
    if (!canModify) return
    setFormError(null)
    const tName = name.trim()
    if (!tName) {
      setFormError(t('admin.tournamentNameRequired'))
      return
    }
    const winners = placements.filter((p) => p.userIds.length > 0)
    if (winners.length === 0) {
      setFormError(t('admin.tournamentNoWinners'))
      return
    }
    for (const p of winners) {
      if (p.points.trim() !== '' && Number.isNaN(parseInt(p.points, 10))) {
        setFormError(t('admin.awardPointsInvalid'))
        return
      }
    }

    setSubmitting(true)
    try {
      const placementsJson: PlacementData[] = placements.map((p) => ({
        label: p.label.trim(),
        points: parseInt(p.points, 10) || 0,
        userIds: p.userIds,
        badgeIds: p.badgeIds,
      }))

      // 1. Upsert the tournament row.
      let tid = editingId
      if (tid) {
        const { error } = await supabase
          .from('tournaments')
          .update({ name: tName, placements: placementsJson, updated_at: new Date().toISOString() })
          .eq('id', tid)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('tournaments')
          .insert({ name: tName, placements: placementsJson, event_year: EVENT_YEAR, created_by: adminId })
          .select('id')
          .single()
        if (error) throw error
        tid = (data as any)?.id
      }
      if (!tid) throw new Error('Could not resolve tournament id')

      // 2. Replace this tournament's grants.
      await supabase.from('point_awards').delete().eq('tournament_id', tid)
      await supabase.from('user_badges').delete().eq('tournament_id', tid)

      const awardRows: any[] = []
      const badgeRows: any[] = []
      for (const p of winners) {
        const pts = parseInt(p.points, 10) || 0
        const label = p.label.trim()
        const reason = label ? `${tName} — ${label}` : tName
        for (const uid of p.userIds) {
          awardRows.push({ user_id: uid, points: pts, reason, event_year: EVENT_YEAR, awarded_by: adminId, tournament_id: tid })
          for (const badge_id of p.badgeIds) {
            badgeRows.push({ user_id: uid, badge_id, event_year: EVENT_YEAR, awarded_by: adminId, tournament_id: tid })
          }
        }
      }
      if (awardRows.length > 0) {
        const { error } = await supabase.from('point_awards').insert(awardRows)
        if (error) throw error
      }
      if (badgeRows.length > 0) {
        const { error } = await supabase
          .from('user_badges')
          .upsert(badgeRows, { onConflict: 'user_id,badge_id,event_year', ignoreDuplicates: true })
        if (error) throw error
      }

      await fetchTournaments()
      setMode('list')
      showAlert(t('admin.tournamentSuccessTitle'), t('admin.tournamentSuccessBody', { count: awardRows.length, name: tName }))
    } catch (e: any) {
      setFormError(e?.message || 'Could not save tournament')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (tourn: Tournament) => {
    if (!canModify) return
    const count = uniqueParticipants(tourn.placements || [])
    showAlert(t('admin.tournamentDeleteConfirmTitle'), t('admin.tournamentDeleteConfirmBody', { count, name: tourn.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.tournamentDelete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('tournaments').delete().eq('id', tourn.id)
            if (error) throw error
            await fetchTournaments()
          } catch (e: any) {
            showAlert(t('common.error'), e?.message || 'Could not delete tournament')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  // ---- LIST VIEW ----
  if (mode === 'list') {
    return (
      <View style={{ width: '100%', gap: 20 }}>
        <View style={[styles.headerBox, isNarrow && styles.headerBoxStacked]}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <Text style={styles.headerTitle}>{t('admin.tournamentListTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('admin.tournamentListSubtitle')}</Text>
          </View>
          <View style={[{ flexDirection: 'row', gap: 8 }, isNarrow && { width: '100%' }]}>
            {canModify && (
              <Pressable onPress={openNew} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? '#3d0042' : '#5a0061' }]}>
                <AppIcon name="plus" size={16} color="#ffffff" />
                <Text style={styles.primaryBtnText}>{t('admin.tournamentCreate')}</Text>
              </Pressable>
            )}
            <Pressable onPress={fetchTournaments} style={({ pressed }) => [styles.outlineBtn, { backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : 'transparent' }]}>
              <Text style={styles.outlineBtnText}>{t('admin.refresh')}</Text>
            </Pressable>
          </View>
        </View>

        {tournaments.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionHint}>{t('admin.tournamentEmpty')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {tournaments.map((tourn) => {
              const pc = Array.isArray(tourn.placements) ? tourn.placements.length : 0
              const participants = uniqueParticipants(tourn.placements || [])
              const expanded = expandedId === tourn.id
              return (
                <View key={tourn.id} style={styles.tournCard}>
                  <View style={styles.tournItemRow}>
                    <Pressable style={{ flex: 1, minWidth: 140 }} onPress={() => setExpandedId(expanded ? null : tourn.id)}>
                      <Text style={styles.tournName} numberOfLines={1}>{tourn.name}</Text>
                      <Text style={styles.tournMeta}>
                        {t('admin.tournamentPlacementsCount', { count: pc })} · {t('admin.tournamentParticipants', { count: participants })}
                      </Text>
                    </Pressable>
                    {canModify && (
                      <Pressable onPress={() => openEdit(tourn)} style={styles.editBtn}>
                        <Text style={styles.editBtnText}>{t('admin.tournamentEdit')}</Text>
                      </Pressable>
                    )}
                    {canModify && (
                      <Pressable onPress={() => handleDelete(tourn)} style={styles.deleteBtn} hitSlop={6}>
                        <AppIcon name="xmark" size={14} color="#dc2626" />
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => setExpandedId(expanded ? null : tourn.id)}
                      style={styles.chevronBtn}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
                    >
                      <AppIcon name={expanded ? 'chevron.down' : 'chevron.right'} size={16} color="#64748b" />
                    </Pressable>
                  </View>

                  {expanded ? (
                    <View style={styles.expandBox}>
                      {(Array.isArray(tourn.placements) ? tourn.placements : []).map((pl, i) => {
                        const names = (pl.userIds || []).map((id) => {
                          const prof = profileById.get(id)
                          return prof ? profileName(prof) : id
                        })
                        const plBadges = (pl.badgeIds || []).map((id) => badgeById.get(id)).filter(Boolean) as Badge[]
                        return (
                          <View key={i} style={styles.expandRow}>
                            <View style={styles.expandHead}>
                              <Text style={styles.expandLabel}>{pl.label || t('admin.tournamentPlaceDefault', { n: i + 1 })}</Text>
                              <Text style={styles.expandPts}>{pl.points ?? 0} {t('admin.tournamentPts')}</Text>
                            </View>
                            <Text style={styles.expandNames}>
                              {names.length > 0 ? names.join(', ') : '—'}
                            </Text>
                            {plBadges.length > 0 ? (
                              <View style={styles.expandBadges}>
                                {plBadges.map((b) => (
                                  <View key={b.id} style={styles.expandBadge}>
                                    <BadgeIcon svgUrl={iconPublicUrl(b.icon)} color={b.color || '#c2b75f'} size={18} />
                                    <Text style={styles.expandBadgeText} numberOfLines={1}>{localizeText(b.name, locale) || b.id}</Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        )
                      })}
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}
      </View>
    )
  }

  // ---- EDITOR VIEW ----
  return (
    <View style={{ width: '100%' }}>
      <View style={styles.card}>
        <View style={styles.editorHeader}>
          <Pressable onPress={() => setMode('list')} style={styles.backBtn} hitSlop={6}>
            <AppIcon name="chevron.left" size={16} color="#5a0061" />
            <Text style={styles.backBtnText}>{t('admin.tournamentBack')}</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>{editingId ? t('admin.tournamentEditTitle') : t('admin.tournamentTitle')}</Text>
        </View>
        <Text style={styles.sectionHint}>{t('admin.tournamentHint')}</Text>

        {/* Tournament name */}
        <Text style={styles.fieldLabel}>{t('admin.tournamentNameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('admin.tournamentNamePlaceholder')}
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        {/* Placements */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>{t('admin.tournamentPlacementsLabel')}</Text>
        <View style={{ gap: 12 }}>
          {placements.map((p) => {
            const matches = openPicker === p.key ? matchesFor(p.query) : []
            return (
              <View key={p.key} style={styles.placementRow}>
                <View style={styles.placementTop}>
                  <TextInput
                    value={p.label}
                    onChangeText={(v) => updatePlacement(p.key, { label: v })}
                    placeholder={t('admin.tournamentPlacementLabelPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    style={[styles.input, styles.placeLabelInput]}
                  />
                  <View style={styles.pointsWrap}>
                    <TextInput
                      value={p.points}
                      onChangeText={(v) => updatePlacement(p.key, { points: v })}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numbers-and-punctuation"
                      style={[styles.input, styles.pointsInput]}
                    />
                    <Text style={styles.pointsSuffix}>{t('admin.tournamentPts')}</Text>
                  </View>
                  {placements.length > 1 ? (
                    <Pressable onPress={() => removePlacement(p.key)} style={styles.removeBtn} hitSlop={6}>
                      <AppIcon name="xmark" size={13} color="#dc2626" />
                    </Pressable>
                  ) : null}
                </View>

                {p.userIds.length > 0 ? (
                  <View style={styles.chipRow}>
                    {p.userIds.map((uid) => {
                      const prof = profileById.get(uid)
                      return (
                        <View key={uid} style={styles.userChip}>
                          <AppIcon name="checkmark.circle.fill" size={13} color="#5a0061" />
                          <Text style={styles.userChipText} numberOfLines={1}>{prof ? profileName(prof) : uid}</Text>
                          <Pressable onPress={() => removeUser(p.key, uid)} hitSlop={6}>
                            <AppIcon name="xmark" size={12} color="#64748b" />
                          </Pressable>
                        </View>
                      )
                    })}
                  </View>
                ) : null}

                <View>
                  <TextInput
                    value={p.query}
                    onChangeText={(v) => {
                      updatePlacement(p.key, { query: v })
                      setOpenPicker(p.key)
                    }}
                    onFocus={() => setOpenPicker(p.key)}
                    placeholder={t('admin.tournamentSelectUser')}
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                  {matches.length > 0 ? (
                    <View style={styles.dropdown}>
                      {matches.map((m) => (
                        <Pressable key={m.id} onPress={() => addUser(p.key, m.id)} style={styles.dropdownItem}>
                          <Text style={styles.dropdownName} numberOfLines={1}>{profileName(m)}</Text>
                          {m.email ? <Text style={styles.dropdownEmail} numberOfLines={1}>{m.email}</Text> : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <Text style={styles.placementBadgesLabel}>{t('admin.tournamentPlacementBadges')}</Text>
                {badges.length === 0 ? (
                  <Text style={styles.sectionHint}>{t('admin.awardNoBadges')}</Text>
                ) : (
                  <View style={styles.badgeGrid}>
                    {badges.map((b) => {
                      const isSel = p.badgeIds.includes(b.id)
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => togglePlacementBadge(p.key, b.id)}
                          style={[styles.badgeTile, isSel && styles.badgeTileSelected]}
                        >
                          <BadgeIcon svgUrl={iconPublicUrl(b.icon)} color={isSel ? b.color || '#c2b75f' : '#94a3b8'} size={28} />
                          <Text style={styles.badgeTileText} numberOfLines={1}>{localizeText(b.name, locale) || b.id}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <Pressable onPress={addPlacement} style={styles.addPlacementBtn}>
          <AppIcon name="plus.circle.fill" size={15} color="#5a0061" />
          <Text style={styles.addPlacementText}>{t('admin.tournamentAddPlacement')}</Text>
        </Pressable>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Pressable onPress={handleSave} disabled={submitting} style={[styles.awardBtn, submitting && { opacity: 0.6 }]}>
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.awardBtnText}>{editingId ? t('admin.tournamentSave') : t('admin.tournamentAward')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' },
  listTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  createBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  tournCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90,0,97,0.12)',
    overflow: 'hidden',
  },
  tournItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  chevronBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  expandBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(90,0,97,0.08)',
    backgroundColor: '#fafafa',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  expandRow: { gap: 4 },
  expandHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  expandLabel: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  expandPts: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
  expandNames: { color: '#475569', fontSize: 13, fontWeight: '600' },
  expandBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  expandBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  expandBadgeText: { color: '#334155', fontSize: 11, fontWeight: '700', maxWidth: 120 },
  tournName: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  tournMeta: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  editBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(90,0,97,0.25)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { color: '#5a0061', fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90,0,97,0.12)',
    padding: 20,
    gap: 8,
  },
  headerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(90,0,97,0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  headerBoxStacked: { flexDirection: 'column', alignItems: 'stretch' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#22002c', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
  primaryBtn: { height: 40, paddingHorizontal: 18, borderRadius: 10, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  outlineBtn: { height: 40, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.25)', justifyContent: 'center', alignItems: 'center' },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: '#5a0061' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { color: '#5a0061', fontSize: 13, fontWeight: '800' },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldLabel: { color: '#334155', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  placementRow: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    backgroundColor: '#fcfdff',
  },
  placementTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeLabelInput: { flex: 1, minWidth: 90 },
  pointsWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointsInput: { width: 84, textAlign: 'right' },
  pointsSuffix: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#faf5fb',
    borderWidth: 1,
    borderColor: '#e9d5ee',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  userChipText: { color: '#5a0061', fontSize: 13, fontWeight: '800', flexShrink: 1 },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    ...Platform.select({ web: { boxShadow: '0 10px 24px rgba(15,23,42,0.12)' } as any }),
  },
  dropdownItem: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownName: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  dropdownEmail: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  placementBadgesLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  addPlacementBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, alignSelf: 'flex-start' },
  addPlacementText: { color: '#5a0061', fontSize: 13, fontWeight: '800' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeTile: {
    width: 84,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  badgeTileSelected: { borderColor: '#5a0061', backgroundColor: '#faf5fb' },
  badgeTileText: { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },
  formError: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  awardBtn: {
    marginTop: 12,
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
})
