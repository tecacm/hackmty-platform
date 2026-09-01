'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform, Image, Switch } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { AppIcon } from 'app/components/app-icon'
import { showAlert } from 'app/components/cross-alert'
import { jsonbToTranslations, translationsToJsonb, type Translation } from 'app/utils/i18n-helpers'
import { localizeText } from 'app/utils/badge-helpers'
import { StyledSelect } from 'app/components/styled-select'
import { StyledSegmented } from 'app/components/styled-segmented'
import { AdminPaginationBar } from './AdminPaginationBar'
import { useTranslation } from 'app/i18n'

type Track = {
  id: string
  title: any
  description: any
  sponsor_name: string | null
  sponsor_logo_url: string | null
  capacity: number
  is_active: boolean
  display_order: number | null
}

function TranslationsEditor({
  label,
  placeholder,
  translations,
  setTranslations,
  addLabel,
  multiline,
}: {
  label: string
  placeholder: string
  translations: Translation[]
  setTranslations: (t: Translation[]) => void
  addLabel: string
  multiline?: boolean
}) {
  const update = (i: number, value: string) =>
    setTranslations(translations.map((t, j) => (j === i ? { ...t, value } : t)))
  const updateKey = (i: number, key: string) =>
    setTranslations(translations.map((t, j) => (j === i ? { ...t, key } : t)))
  const remove = (i: number) => setTranslations(translations.filter((_, j) => j !== i))
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {translations.map((tr, i) => (
        <View key={i} style={styles.trRow}>
          <TextInput
            value={tr.key}
            onChangeText={(v) => updateKey(i, v)}
            placeholder="en"
            placeholderTextColor="#94a3b8"
            style={[styles.input, { width: 56, textAlign: 'center' }]}
            autoCapitalize="none"
          />
          <TextInput
            value={tr.value}
            onChangeText={(v) => update(i, v)}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            style={[styles.input, { flex: 1 }, multiline && { minHeight: 60 }]}
            multiline={multiline}
          />
          {translations.length > 1 ? (
            <Pressable onPress={() => remove(i)} style={styles.trRemove} hitSlop={6}>
              <AppIcon name="xmark" size={12} color="#dc2626" />
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable onPress={() => setTranslations([...translations, { key: '', value: '' }])} style={styles.addLangBtn}>
        <AppIcon name="plus.circle.fill" size={14} color="#5a0061" />
        <Text style={styles.addLangText}>{addLabel}</Text>
      </Pressable>
    </View>
  )
}

function trackLogoUrl(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const { data } = supabase.storage.from('track-logos').getPublicUrl(path)
  return data?.publicUrl || null
}

export function TracksTab() {
  const { t, locale } = useTranslation()
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [finalizing, setFinalizing] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [deadline, setDeadline] = React.useState<string | null>(null)
  const [overview, setOverview] = React.useState<any[]>([])
  const [teamSearch, setTeamSearch] = React.useState('')
  const [teamFilter, setTeamFilter] = React.useState<'eligible' | 'all'>('all')
  const [teamPage, setTeamPage] = React.useState(1)
  const [teamPageSize, setTeamPageSize] = React.useState(20)
  const [expandedTeams, setExpandedTeams] = React.useState<Set<string>>(new Set())

  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [titleT, setTitleT] = React.useState<Translation[]>([{ key: 'en', value: '' }, { key: 'es', value: '' }])
  const [descT, setDescT] = React.useState<Translation[]>([{ key: 'en', value: '' }, { key: 'es', value: '' }])
  const [sponsorName, setSponsorName] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [capacity, setCapacity] = React.useState('200')
  const [isActive, setIsActive] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<any>(null)

  const fetchAll = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    try {
      const [{ data: trackData }, { data: cfg }, overviewRes] = await Promise.all([
        supabase.from('tracks').select('*').order('display_order', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('global_config').select('value').eq('key', 'track_selection_deadline').maybeSingle(),
        supabase.rpc('admin_track_overview'),
      ])
      setTracks((trackData as Track[]) || [])
      setDeadline((cfg as any)?.value || null)
      setOverview((overviewRes?.data as any[]) || [])
    } catch (e) {
      console.warn('Failed to load tracks:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const trackById = React.useMemo(() => {
    const m = new Map<string, Track>()
    tracks.forEach((tr) => m.set(tr.id, tr))
    return m
  }, [tracks])

  // Capacity is measured in PEOPLE: sum each assigned team's member count per track.
  const peopleCounts = React.useMemo(() => {
    const tally: Record<string, number> = {}
    overview.forEach((r) => {
      if (r.assigned_track_id) tally[r.assigned_track_id] = (tally[r.assigned_track_id] || 0) + (r.member_count || 0)
    })
    return tally
  }, [overview])

  const filteredOverview = React.useMemo(() => {
    const q = teamSearch.trim().toLowerCase()
    return overview.filter((r) => {
      // Show any team with at least one accepted/confirmed member; hide teams where nobody
      // is past review (all draft/under-review/rejected).
      if ((r.accepted_count || 0) < 1) return false
      // "Eligible" narrows to fully-confirmed teams (what finalize will actually assign).
      const eligible = r.member_count > 0 && r.confirmed_count === r.member_count
      if (teamFilter === 'eligible' && !eligible) return false
      if (q && !(r.team_name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [overview, teamSearch, teamFilter])

  const teamTotalPages = Math.max(1, Math.ceil(filteredOverview.length / teamPageSize))
  const pageItems = React.useMemo(
    () => filteredOverview.slice((teamPage - 1) * teamPageSize, teamPage * teamPageSize),
    [filteredOverview, teamPage, teamPageSize]
  )
  React.useEffect(() => {
    if (teamPage > teamTotalPages) setTeamPage(1)
  }, [teamTotalPages, teamPage])

  const toggleTeam = (id: string) =>
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleAssign = async (teamId: string, trackId: string) => {
    try {
      const { error } = await supabase.rpc('admin_assign_team_track', { p_team_id: teamId, p_track_id: trackId || null })
      if (error) throw error
      fetchAll()
    } catch (e: any) {
      showAlert(t('common.error'), e?.message || 'Could not update assignment')
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setTitleT([{ key: 'en', value: '' }, { key: 'es', value: '' }])
    setDescT([{ key: 'en', value: '' }, { key: 'es', value: '' }])
    setSponsorName('')
    setLogoUrl(null)
    setCapacity('200')
    setIsActive(true)
    setFormError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openEdit = (track: Track) => {
    setEditingId(track.id)
    setTitleT(jsonbToTranslations(track.title))
    setDescT(track.description ? jsonbToTranslations(track.description) : [{ key: 'en', value: '' }, { key: 'es', value: '' }])
    setSponsorName(track.sponsor_name || '')
    setLogoUrl(track.sponsor_logo_url || null)
    setCapacity(String(track.capacity ?? 200))
    setIsActive(track.is_active)
    setFormError(null)
  }

  const pickLogo = () => {
    if (Platform.OS !== 'web') {
      showAlert(t('admin.tracksUploadWebOnlyTitle'), t('admin.tracksUploadWebOnly'))
      return
    }
    fileInputRef.current?.click?.()
  }

  const onFileChange = async (e: any) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    if (!/^image\//i.test(file.type)) {
      setFormError(t('admin.trackLogoOnly'))
      return
    }
    try {
      setUploading(true)
      setFormError(null)
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('track-logos').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('track-logos').getPublicUrl(path)
      setLogoUrl(data?.publicUrl || path)
    } catch (err: any) {
      setFormError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setFormError(null)
    const title = translationsToJsonb(titleT)
    if (!Object.values(title).some((v) => (v || '').trim())) {
      setFormError(t('admin.trackTitleRequired'))
      return
    }
    const cap = parseInt(capacity, 10)
    if (Number.isNaN(cap) || cap < 0) {
      setFormError(t('admin.trackCapacityInvalid'))
      return
    }
    const descObj = translationsToJsonb(descT)
    const payload: any = {
      title,
      description: Object.values(descObj).some((v) => (v || '').trim()) ? descObj : null,
      sponsor_name: sponsorName.trim() || null,
      sponsor_logo_url: logoUrl,
      capacity: cap,
      is_active: isActive,
    }
    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('tracks').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tracks').insert(payload)
        if (error) throw error
      }
      resetForm()
      fetchAll()
    } catch (e: any) {
      setFormError(e?.message || 'Could not save track')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (track: Track) => {
    const assigned = peopleCounts[track.id] || 0
    showAlert(t('admin.trackDeleteConfirmTitle'), t('admin.trackDeleteConfirmBody', { count: assigned }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.trackDelete'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('tracks').delete().eq('id', track.id)
            if (error) throw error
            fetchAll()
          } catch (e: any) {
            showAlert(t('common.error'), e?.message || 'Could not delete track')
          }
        },
      },
    ])
  }

  const handleFinalize = () => {
    showAlert(t('admin.tracksFinalizeTitle'), t('admin.tracksFinalizeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.tracksFinalizeConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            setFinalizing(true)
            const { data, error } = await supabase.functions.invoke('finalize-tracks', { body: { force: true } })
            if (error) throw error
            fetchAll()
            showAlert(t('admin.tracksFinalizeDone'), t('admin.tracksFinalizeResult', { count: (data as any)?.assigned ?? 0 }))
          } catch (e: any) {
            showAlert(t('common.error'), e?.message || 'Finalize failed')
          } finally {
            setFinalizing(false)
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

  return (
    <View style={{ width: '100%', gap: 16 }}>
      {/* Create / edit form */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingId ? t('admin.tracksEditTitle') : t('admin.tracksCreateTitle')}</Text>

        <View style={styles.formRow}>
          <View style={styles.logoBox}>
            {logoUrl ? (
              <Image source={{ uri: trackLogoUrl(logoUrl) || undefined }} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <AppIcon name="camera.fill" size={26} color="#94a3b8" />
            )}
          </View>
          <View style={{ flex: 1, gap: 10, minWidth: 240 }}>
            <TranslationsEditor
              label={t('admin.trackTitleLabel')}
              placeholder={t('admin.trackTitlePlaceholder')}
              translations={titleT}
              setTranslations={setTitleT}
              addLabel={t('admin.addLanguage')}
            />
            <TextInput
              value={sponsorName}
              onChangeText={setSponsorName}
              placeholder={t('admin.trackSponsorPlaceholder')}
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>
        </View>

        <TranslationsEditor
          label={t('admin.trackDescLabel')}
          placeholder={t('admin.trackDescPlaceholder')}
          translations={descT}
          setTranslations={setDescT}
          addLabel={t('admin.addLanguage')}
          multiline
        />

        <View style={styles.inlineRow}>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{t('admin.trackCapacityLabel')}</Text>
            <TextInput
              value={capacity}
              onChangeText={(v) => setCapacity(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={[styles.input, { width: 120 }]}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{t('admin.trackActive')}</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{t('admin.trackLogoLabel')}</Text>
            <Pressable onPress={pickLogo} style={styles.uploadBtn}>
              {uploading ? (
                <ActivityIndicator size="small" color="#5a0061" />
              ) : (
                <AppIcon name="plus.circle.fill" size={15} color="#5a0061" />
              )}
              <Text style={styles.uploadBtnText}>{t('admin.trackUploadLogo')}</Text>
            </Pressable>
            {Platform.OS === 'web' ? (
              // @ts-ignore raw web input
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
            ) : null}
          </View>
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <View style={styles.formActions}>
          <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>{editingId ? t('admin.trackSave') : t('admin.trackCreate')}</Text>
            )}
          </Pressable>
          {editingId ? (
            <Pressable onPress={resetForm} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Deadline + finalize */}
      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }]}>
        <View style={{ gap: 2 }}>
          <Text style={styles.fieldLabel}>{t('admin.tracksDeadline')}</Text>
          <Text style={styles.deadlineText}>
            {deadline
              ? new Date(deadline).toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : t('admin.tracksNoDeadline')}
          </Text>
        </View>
        <Pressable onPress={handleFinalize} disabled={finalizing} style={[styles.finalizeBtn, finalizing && { opacity: 0.6 }]}>
          {finalizing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.finalizeBtnText}>{t('admin.tracksFinalizeNow')}</Text>
          )}
        </Pressable>
      </View>

      {/* Existing tracks */}
      <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>{t('admin.tracksExisting', { count: tracks.length })}</Text>
      {tracks.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionHint}>{t('admin.tracksEmpty')}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {tracks.map((track) => {
            const assigned = peopleCounts[track.id] || 0
            const full = assigned >= track.capacity
            return (
              <View key={track.id} style={styles.trackItem}>
                <View style={styles.trackLogoSm}>
                  {track.sponsor_logo_url ? (
                    <Image source={{ uri: trackLogoUrl(track.sponsor_logo_url) || undefined }} style={styles.logoImgSm} resizeMode="contain" />
                  ) : (
                    <AppIcon name="camera.fill" size={18} color="#94a3b8" />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={styles.trackName} numberOfLines={1}>
                    {localizeText(track.title, locale) || '—'}
                    {!track.is_active ? <Text style={styles.inactiveTag}>  {t('admin.trackInactive')}</Text> : null}
                  </Text>
                  {track.sponsor_name ? <Text style={styles.trackSponsor} numberOfLines={1}>{track.sponsor_name}</Text> : null}
                </View>
                <View style={[styles.capacityPill, full && styles.capacityPillFull]}>
                  <Text style={[styles.capacityPillText, full && { color: '#b91c1c' }]}>
                    {t('admin.trackAssignedOf', { assigned, capacity: track.capacity })}
                  </Text>
                </View>
                <Pressable onPress={() => openEdit(track)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>{t('admin.trackEdit')}</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(track)} style={styles.deleteBtn} hitSlop={6}>
                  <AppIcon name="xmark" size={14} color="#dc2626" />
                </Pressable>
              </View>
            )
          })}
        </View>
      )}

      {/* Team assignments (preliminary + manual override) */}
      <Text style={[styles.sectionTitle, { color: '#ffffff', marginTop: 6 }]}>{t('admin.trackAdminTeamsTitle')}</Text>
      <View style={styles.card}>
        <StyledSegmented
          label=""
          value={teamFilter}
          options={[
            { label: t('admin.trackAdminFilterEligible'), value: 'eligible' },
            { label: t('admin.trackAdminFilterAll'), value: 'all' },
          ]}
          onValueChange={(v) => {
            setTeamFilter(v as 'eligible' | 'all')
            setTeamPage(1)
          }}
        />
        <Text style={styles.filterHint}>
          {teamFilter === 'eligible' ? t('admin.trackAdminHintEligible') : t('admin.trackAdminHintAll')}
        </Text>
        <TextInput
          value={teamSearch}
          onChangeText={(v) => {
            setTeamSearch(v)
            setTeamPage(1)
          }}
          placeholder={t('admin.trackAdminSearch')}
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        {filteredOverview.length === 0 ? (
          <Text style={styles.sectionHint}>{t('admin.trackAdminNoTeams')}</Text>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              {pageItems.map((row) => {
                const prefIds: string[] = row.preferences || []
                const hasPrefs = !!row.submitted_at && prefIds.length > 0
                const expanded = expandedTeams.has(row.team_id)
                const eligible = row.member_count > 0 && row.confirmed_count === row.member_count
                return (
                  <View key={row.team_id} style={styles.teamRow}>
                    <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={styles.teamName} numberOfLines={1}>{row.team_name}</Text>
                        <Text style={[styles.eligPill, eligible ? styles.eligPillOk : styles.eligPillNo]}>
                          {eligible ? t('admin.trackAdminEligible') : t('admin.trackAdminIneligible')}
                        </Text>
                      </View>
                      <Text style={styles.teamMeta}>
                        {t('admin.trackAdminConfirmed', { confirmed: row.confirmed_count, total: row.member_count })}
                        {row.unconfirmed_names?.length ? `  ·  ${t('admin.trackAdminWaiting', { names: row.unconfirmed_names.join(', ') })}` : ''}
                      </Text>
                      <Pressable
                        onPress={() => hasPrefs && toggleTeam(row.team_id)}
                        style={styles.prefToggle}
                        disabled={!hasPrefs}
                        hitSlop={6}
                      >
                        <Text style={[styles.prefStatus, !hasPrefs && styles.prefStatusMuted]}>
                          {hasPrefs ? t('admin.trackAdminPrefCount', { count: prefIds.length }) : t('admin.trackAdminNoSubmit')}
                        </Text>
                        {hasPrefs ? <AppIcon name={expanded ? 'chevron.up' : 'chevron.down'} size={13} color="#7a3aa0" /> : null}
                      </Pressable>
                      {expanded && hasPrefs ? (
                        <View style={styles.prefList}>
                          {prefIds.map((id, i) => (
                            <Text key={id} style={styles.prefItem}>
                              {i + 1}. {localizeText(trackById.get(id)?.title, locale) || '?'}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                    <View style={{ width: 220, gap: 4 }}>
                      {row.assigned_random ? <Text style={styles.randomBadge}>{t('admin.trackAdminRandomBadge')}</Text> : null}
                      <StyledSelect
                        label=""
                        placeholder={t('admin.trackAdminUnassigned')}
                        value={row.assigned_track_id || ''}
                        options={[
                          { label: t('admin.trackAdminUnassigned'), value: '' },
                          ...tracks.map((tr) => ({ label: localizeText(tr.title, locale) || tr.id, value: tr.id })),
                        ]}
                        onValueChange={(v) => handleAssign(row.team_id, v)}
                      />
                    </View>
                  </View>
                )
              })}
            </View>
            <AdminPaginationBar
              currentPage={teamPage}
              totalPages={teamTotalPages}
              pageSize={teamPageSize}
              totalItems={filteredOverview.length}
              onPageChange={setTeamPage}
              onPageSizeChange={(s) => {
                setTeamPageSize(s)
                setTeamPage(1)
              }}
            />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, gap: 12 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  sectionHint: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  fieldLabel: { color: '#334155', fontSize: 13, fontWeight: '800' },
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
  formRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  trRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  trRemove: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLangBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  addLangText: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
  inlineRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  uploadBtnText: { color: '#5a0061', fontSize: 13, fontWeight: '800' },
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
  },
  formActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  saveBtn: { backgroundColor: '#5a0061', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', minWidth: 120 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: '800' },
  deadlineText: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  finalizeBtn: { backgroundColor: '#5a0061', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  finalizeBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexWrap: 'wrap',
  },
  trackLogoSm: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImgSm: { width: '100%', height: '100%' },
  trackName: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  trackSponsor: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  inactiveTag: { color: '#b45309', fontSize: 11, fontWeight: '800' },
  capacityPill: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  capacityPillFull: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  capacityPillText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  editBtn: { backgroundColor: '#faf5fb', borderWidth: 1, borderColor: '#e9d5ee', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexWrap: 'wrap',
  },
  teamName: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  eligPill: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, overflow: 'hidden' },
  filterHint: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: -8, marginBottom: 6 },
  eligPillOk: { backgroundColor: '#dcfce7', color: '#15803d' },
  eligPillNo: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  teamMeta: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  teamPrefs: { color: '#475569', fontSize: 12, fontWeight: '700' },
  prefToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  prefStatus: { color: '#7a3aa0', fontSize: 12, fontWeight: '800' },
  prefStatusMuted: { color: '#94a3b8' },
  prefList: { gap: 3, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#e9d5ee', marginTop: 2 },
  prefItem: { color: '#475569', fontSize: 12, fontWeight: '700' },
  randomBadge: {
    alignSelf: 'flex-start',
    color: '#b45309',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  editBtnText: { color: '#5a0061', fontSize: 13, fontWeight: '800' },
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
})
