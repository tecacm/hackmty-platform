'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Image } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { AppIcon } from 'app/components/app-icon'
import { showAlert } from 'app/components/cross-alert'
import { localizeText } from 'app/utils/badge-helpers'
import { useTranslation } from 'app/i18n'

type Track = {
  id: string
  title: any
  description: any
  sponsor_name: string | null
  sponsor_logo_url: string | null
}

type TeamTrackRow = {
  team_id: string
  preferences: string[] | null
  assigned_track_id: string | null
  submitted_at: string | null
  assigned_at: string | null
  assigned_random: boolean | null
}

interface TeamTrackSectionProps {
  teamId: string
  isOwner: boolean
  members: Array<{ id: string; first_name?: string | null; last_name?: string | null }>
  membersApplications: Array<{ user_id: string; status?: string | null; confirmed_at?: string | null }>
}

function trackLogoUrl(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const { data } = supabase.storage.from('track-logos').getPublicUrl(path)
  return data?.publicUrl || null
}

/** Tooltip card content: logo, title, sponsor, description. */
function TrackTip({ track, locale }: { track: Track; locale: string }) {
  const logo = trackLogoUrl(track.sponsor_logo_url)
  return (
    <View style={styles.tooltip} pointerEvents="none">
      <View style={styles.tipHead}>
        {logo ? <Image source={{ uri: logo }} style={styles.tipLogo} resizeMode="contain" /> : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitle} numberOfLines={2}>{localizeText(track.title, locale)}</Text>
          {track.sponsor_name ? <Text style={styles.tipSponsor}>{track.sponsor_name}</Text> : null}
        </View>
      </View>
      {track.description ? <Text style={styles.tipDesc}>{localizeText(track.description, locale)}</Text> : null}
    </View>
  )
}

function AvailableTrackChip({ track, locale, onAdd }: { track: Track; locale: string; onAdd: () => void }) {
  const [show, setShow] = React.useState(false)
  const logo = trackLogoUrl(track.sponsor_logo_url)
  return (
    <View style={[styles.chipWrap, show && styles.wrapRaised]}>
      <Pressable
        onPress={onAdd}
        onHoverIn={() => setShow(true)}
        onHoverOut={() => setShow(false)}
        style={styles.availChip}
      >
        {logo ? <Image source={{ uri: logo }} style={styles.availLogo} resizeMode="contain" /> : null}
        <Text style={styles.availChipText} numberOfLines={1}>{localizeText(track.title, locale)}</Text>
        <AppIcon name="plus.circle.fill" size={15} color="#5a0061" />
      </Pressable>
      {show ? <TrackTip track={track} locale={locale} /> : null}
    </View>
  )
}

function RankedTrackRow({
  track,
  index,
  total,
  locale,
  onUp,
  onDown,
  onRemove,
  readOnly,
}: {
  track: Track
  index: number
  total: number
  locale: string
  onUp?: () => void
  onDown?: () => void
  onRemove?: () => void
  readOnly?: boolean
}) {
  const [show, setShow] = React.useState(false)
  return (
    <View style={[styles.rowWrap, show && styles.wrapRaised]}>
      <View style={styles.rankedItem}>
        <Text style={styles.rankNum}>{index + 1}</Text>
        <Pressable
          style={{ flex: 1 }}
          onHoverIn={() => setShow(true)}
          onHoverOut={() => setShow(false)}
          onPress={() => setShow((s) => !s)}
        >
          <Text style={styles.rankName} numberOfLines={1}>{localizeText(track.title, locale)}</Text>
        </Pressable>
        {!readOnly ? (
          <>
            <Pressable onPress={onUp} disabled={index === 0} style={[styles.moveBtn, index === 0 && { opacity: 0.3 }]} hitSlop={6}>
              <AppIcon name="chevron.up" size={14} color="#5a0061" />
            </Pressable>
            <Pressable onPress={onDown} disabled={index === total - 1} style={[styles.moveBtn, index === total - 1 && { opacity: 0.3 }]} hitSlop={6}>
              <AppIcon name="chevron.down" size={14} color="#5a0061" />
            </Pressable>
            <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={6}>
              <AppIcon name="xmark" size={12} color="#dc2626" />
            </Pressable>
          </>
        ) : null}
      </View>
      {show ? <TrackTip track={track} locale={locale} /> : null}
    </View>
  )
}

export function TeamTrackSection({ teamId, isOwner, members, membersApplications }: TeamTrackSectionProps) {
  const { t, locale } = useTranslation()
  const [loading, setLoading] = React.useState(true)
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [row, setRow] = React.useState<TeamTrackRow | null>(null)
  const [deadline, setDeadline] = React.useState<string | null>(null)
  const [opensAt, setOpensAt] = React.useState<string | null>(null)
  const [ranking, setRanking] = React.useState<string[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured || !teamId) {
      setLoading(false)
      return
    }
    try {
      const [{ data: trackData }, { data: rowData }, { data: cfg }, { data: opensCfg }] = await Promise.all([
        supabase.from('tracks').select('id, title, description, sponsor_name, sponsor_logo_url').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('team_tracks').select('*').eq('team_id', teamId).maybeSingle(),
        supabase.from('global_config').select('value').eq('key', 'track_selection_deadline').maybeSingle(),
        supabase.from('global_config').select('value').eq('key', 'track_selection_opens_at').maybeSingle(),
      ])
      setTracks((trackData as Track[]) || [])
      setRow((rowData as TeamTrackRow) || null)
      setDeadline((cfg as any)?.value || null)
      setOpensAt((opensCfg as any)?.value || null)
    } catch (e) {
      console.warn('Failed to load team track data:', e)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  React.useEffect(() => {
    load()
  }, [load])

  const trackById = React.useMemo(() => {
    const m = new Map<string, Track>()
    tracks.forEach((tr) => m.set(tr.id, tr))
    return m
  }, [tracks])

  const memberName = (m: { first_name?: string | null; last_name?: string | null; id: string }) =>
    [m.first_name, m.last_name].filter(Boolean).join(' ') || t('teams.trackUnnamedMember')

  const unconfirmed = React.useMemo(() => {
    return members.filter((m) => {
      const apps = membersApplications.filter((a) => a.user_id === m.id)
      return !apps.some((a) => a.status === 'confirmed' || !!a.confirmed_at)
    })
  }, [members, membersApplications])

  const allConfirmed = members.length > 0 && unconfirmed.length === 0
  const allAccepted =
    members.length > 0 &&
    members.every((m) => {
      const apps = membersApplications.filter((a) => a.user_id === m.id)
      return apps.some((a) => a.status === 'accepted' || a.status === 'confirmed' || !!a.confirmed_at)
    })
  const submitted = !!row?.submitted_at
  const deadlinePassed = !!deadline && Date.now() >= new Date(deadline).getTime()
  const opened = !opensAt || Date.now() >= new Date(opensAt).getTime()
  const assignedTrack = row?.assigned_track_id ? trackById.get(row.assigned_track_id) : null

  const deadlineStr = deadline
    ? new Date(deadline).toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null
  const submittedStr = row?.submitted_at
    ? new Date(row.submitted_at).toLocaleString(locale, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const addToRanking = (id: string) => setRanking((prev) => (prev.includes(id) ? prev : [...prev, id]))
  const removeFromRanking = (id: string) => setRanking((prev) => prev.filter((x) => x !== id))
  const move = (i: number, dir: -1 | 1) =>
    setRanking((prev) => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })

  const handleSubmit = () => {
    if (ranking.length === 0) {
      setFormError(t('teams.trackNoneSelected'))
      return
    }
    showAlert(t('teams.trackSubmitConfirmTitle'), t('teams.trackSubmitConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('teams.trackSubmit'),
        onPress: async () => {
          try {
            setSubmitting(true)
            setFormError(null)
            const { error } = await supabase.rpc('submit_team_tracks', { p_team_id: teamId, p_prefs: ranking })
            if (error) throw error
            await load()
          } catch (e: any) {
            setFormError(e?.message || 'Could not submit track choices')
          } finally {
            setSubmitting(false)
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={[styles.card, { alignItems: 'center' }]}>
        <ActivityIndicator size="small" color="#5a0061" />
      </View>
    )
  }

  if (tracks.length === 0 && !assignedTrack) return null

  // 1. Assigned + revealed (after deadline)
  if (assignedTrack && deadlinePassed) {
    return (
      <View style={styles.card}>
        <Text style={styles.assignedLabel}>{t('teams.trackAssignedTitle')}</Text>
        <View style={styles.assignedRow}>
          <View style={styles.logoBox}>
            {assignedTrack.sponsor_logo_url ? (
              <Image source={{ uri: trackLogoUrl(assignedTrack.sponsor_logo_url) || undefined }} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <AppIcon name="checkmark.circle.fill" size={26} color="#c2b75f" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.assignedTitle}>{localizeText(assignedTrack.title, locale)}</Text>
            {assignedTrack.sponsor_name ? <Text style={styles.assignedSponsor}>{assignedTrack.sponsor_name}</Text> : null}
            {assignedTrack.description ? (
              <Text style={styles.assignedDesc}>{localizeText(assignedTrack.description, locale)}</Text>
            ) : null}
          </View>
        </View>
      </View>
    )
  }

  // 2. Submitted → locked, awaiting reveal
  if (submitted) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('teams.trackTitle')}</Text>
          <View style={styles.lockedPill}>
            <AppIcon name="checkmark.circle.fill" size={13} color="#15803d" />
            <Text style={styles.lockedPillText}>{t('teams.trackLocked')}</Text>
          </View>
        </View>
        <Text style={styles.hint}>
          {deadlineStr ? t('teams.trackResultsAfter', { date: deadlineStr }) : t('teams.trackResultsSoon')}
        </Text>
        {submittedStr ? <Text style={styles.submittedNote}>{t('teams.trackSubmittedOn', { date: submittedStr })}</Text> : null}
        <View style={styles.rankedList}>
          {(row?.preferences || []).map((id, i) => {
            const tr = trackById.get(id)
            if (!tr) return null
            return (
              <RankedTrackRow key={id} track={tr} index={i} total={(row?.preferences || []).length} locale={locale} readOnly />
            )
          })}
        </View>
      </View>
    )
  }

  // Hidden before the configured opening time (track_selection_opens_at), even for
  // accepted teams. Already-submitted/assigned teams above are unaffected.
  if (!opened) return null

  // Hide the whole section until the team is past review — i.e. every member has been
  // accepted or confirmed. Teams still under review shouldn't see the track/confirm UI.
  // (Assigned/submitted teams above are already past this stage.)
  if (!allAccepted) return null

  // 3. Not submitted — selection closed once the deadline passes
  if (deadlinePassed) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('teams.trackTitle')}</Text>
        <Text style={styles.hint}>{t('teams.trackClosed')}</Text>
      </View>
    )
  }

  // 4. Not submitted — non-owner sees status (incl. who the team is waiting on to confirm),
  // plus a read-only list of all tracks and their descriptions so members can browse.
  if (!isOwner) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t('teams.trackTitle')}</Text>
        {!allConfirmed ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnTitle}>{t('teams.trackAllMustConfirm')}</Text>
            <Text style={styles.warnBody}>{t('teams.trackWaitingOn', { names: unconfirmed.map(memberName).join(', ') })}</Text>
            <Text style={styles.warnBody}>{t('teams.trackLeaderSubmitsWhenConfirmed')}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            {deadlineStr ? t('teams.trackLeaderWillChoose', { date: deadlineStr }) : t('teams.trackLeaderWillChooseNoDate')}
          </Text>
        )}

        {tracks.length > 0 ? (
          <>
            <Text style={styles.subLabel}>{t('teams.trackAvailable')}</Text>
            <View style={styles.browseList}>
              {tracks.map((tr) => {
                const logo = trackLogoUrl(tr.sponsor_logo_url)
                return (
                  <View key={tr.id} style={styles.browseItem}>
                    <View style={styles.browseHead}>
                      {logo ? <Image source={{ uri: logo }} style={styles.browseLogo} resizeMode="contain" /> : null}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.browseTitle} numberOfLines={2}>{localizeText(tr.title, locale)}</Text>
                        {tr.sponsor_name ? <Text style={styles.browseSponsor}>{tr.sponsor_name}</Text> : null}
                      </View>
                    </View>
                    {tr.description ? (
                      <Text style={styles.browseDesc}>{localizeText(tr.description, locale)}</Text>
                    ) : null}
                  </View>
                )
              })}
            </View>
          </>
        ) : null}
      </View>
    )
  }

  // 4. Owner, not submitted
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('teams.trackChoose')}</Text>
        {deadlineStr ? <Text style={styles.deadlineTag}>{t('teams.trackDeadline', { date: deadlineStr })}</Text> : null}
      </View>

      {!allConfirmed ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnTitle}>{t('teams.trackAllMustConfirm')}</Text>
          <Text style={styles.warnBody}>
            {t('teams.trackWaitingOn', { names: unconfirmed.map(memberName).join(', ') })}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.hint}>{t('teams.trackRankHint')}</Text>

          {/* Ranked selections */}
          {ranking.length > 0 ? (
            <View style={styles.rankedList}>
              {ranking.map((id, i) => {
                const tr = trackById.get(id)
                if (!tr) return null
                return (
                  <RankedTrackRow
                    key={id}
                    track={tr}
                    index={i}
                    total={ranking.length}
                    locale={locale}
                    onUp={() => move(i, -1)}
                    onDown={() => move(i, 1)}
                    onRemove={() => removeFromRanking(id)}
                  />
                )
              })}
            </View>
          ) : null}

          {/* Available tracks */}
          <Text style={styles.subLabel}>{t('teams.trackAvailable')}</Text>
          <View style={styles.availGrid}>
            {tracks
              .filter((tr) => !ranking.includes(tr.id))
              .map((tr) => (
                <AvailableTrackChip key={tr.id} track={tr} locale={locale} onAdd={() => addToRanking(tr.id)} />
              ))}
          </View>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <Pressable onPress={handleSubmit} disabled={submitting || ranking.length === 0} style={[styles.submitBtn, (submitting || ranking.length === 0) && { opacity: 0.6 }]}>
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>{t('teams.trackSubmit')}</Text>
            )}
          </Pressable>
          <Text style={styles.lockNote}>{t('teams.trackLockNote')}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
    ...Platform.select({ web: { boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.10)' } as any }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  title: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  deadlineTag: { color: '#b45309', fontSize: 12, fontWeight: '800' },
  hint: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  submittedNote: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  subLabel: { color: '#334155', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 4 },
  warnBox: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74', borderRadius: 12, padding: 14, gap: 4 },
  warnTitle: { color: '#9a3412', fontSize: 14, fontWeight: '800' },
  warnBody: { color: '#9a3412', fontSize: 13, fontWeight: '600' },
  rankedList: { gap: 8 },
  rowWrap: { position: 'relative', ...Platform.select({ web: { zIndex: 0 } as any }) },
  chipWrap: { position: 'relative', ...Platform.select({ web: { zIndex: 0 } as any }) },
  wrapRaised: { ...Platform.select({ web: { zIndex: 50 } as any }) },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 6,
    width: 240,
    maxWidth: 280,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    ...Platform.select({ web: { zIndex: 100, boxShadow: '0 12px 28px rgba(34,0,44,0.16)' } as any }),
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipLogo: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#f8fafc' },
  tipTitle: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
  tipSponsor: { color: '#5a0061', fontSize: 11, fontWeight: '800', marginTop: 1 },
  tipDesc: { color: '#475569', fontSize: 12, fontWeight: '600', lineHeight: 16 },
  rankedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#faf5fb',
    borderWidth: 1,
    borderColor: '#e9d5ee',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rankNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5a0061',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  rankName: { flex: 1, color: '#0f172a', fontSize: 14, fontWeight: '700' },
  moveBtn: { padding: 4 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  browseList: { gap: 8 },
  browseItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  browseHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  browseLogo: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#ffffff' },
  browseTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  browseSponsor: { color: '#5a0061', fontSize: 11, fontWeight: '800', marginTop: 1 },
  browseDesc: { color: '#475569', fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  availChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '100%',
  },
  availLogo: { width: 18, height: 18, borderRadius: 4 },
  availChipText: { color: '#334155', fontSize: 13, fontWeight: '700', flexShrink: 1 },
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
  submitBtn: { backgroundColor: '#5a0061', borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  lockNote: { color: '#94a3b8', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  lockedPillText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  assignedLabel: { color: '#5a0061', fontSize: 12, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  assignedRow: { flexDirection: 'row', gap: 14, alignItems: 'center', flexWrap: 'wrap' },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  assignedTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  assignedSponsor: { color: '#5a0061', fontSize: 13, fontWeight: '800', marginTop: 2 },
  assignedDesc: { color: '#475569', fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 19 },
})
