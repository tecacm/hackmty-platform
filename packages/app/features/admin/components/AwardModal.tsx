'use client'

import * as React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
} from 'react-native'
import { supabase } from 'app/lib/supabase'
import { BadgeIcon } from 'app/components/badge-icon'
import { showAlert } from 'app/components/cross-alert'
import { useTranslation } from 'app/i18n'
import { EVENT_YEAR } from 'app/utils/event-config'
import { iconPublicUrl, localizeText, type Badge } from 'app/utils/badge-helpers'

export interface AwardModalProps {
  visible: boolean
  user: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null } | null
  onClose: () => void
  onAwarded?: () => void
}

export function AwardModal({ visible, user, onClose, onAwarded }: AwardModalProps) {
  const { t, locale } = useTranslation()

  const [loadingData, setLoadingData] = React.useState(false)
  const [badges, setBadges] = React.useState<Badge[]>([])
  const [ownedIds, setOwnedIds] = React.useState<Set<string>>(new Set())
  const [adminId, setAdminId] = React.useState<string | null>(null)

  const [points, setPoints] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [selectedBadges, setSelectedBadges] = React.useState<Set<string>>(new Set())
  const [removeBadges, setRemoveBadges] = React.useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const reset = React.useCallback(() => {
    setPoints('')
    setReason('')
    setSelectedBadges(new Set())
    setRemoveBadges(new Set())
    setFormError(null)
  }, [])

  // Load the badge catalog, the user's existing grants, and the acting admin id.
  React.useEffect(() => {
    if (!visible || !user) return
    reset()
    let cancelled = false
    setLoadingData(true)
    ;(async () => {
      try {
        const [{ data: cat }, { data: owned }, { data: auth }] = await Promise.all([
          supabase.from('badges').select('*').order('created_at', { ascending: true }),
          supabase.from('user_badges').select('badge_id').eq('user_id', user.id).eq('event_year', EVENT_YEAR),
          supabase.auth.getUser(),
        ])
        if (cancelled) return
        setBadges((cat as Badge[]) || [])
        setOwnedIds(new Set((owned || []).map((r: any) => r.badge_id)))
        setAdminId(auth?.user?.id || null)
      } catch {
        if (!cancelled) {
          setBadges([])
          setOwnedIds(new Set())
        }
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible, user, reset])

  const toggleBadge = (id: string) => {
    // Owned badges toggle for REMOVAL; not-yet-owned toggle for granting.
    if (ownedIds.has(id)) {
      setRemoveBadges((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }
    setSelectedBadges((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!user) return
    setFormError(null)

    const pts = parseInt(points, 10)
    const hasPoints = !Number.isNaN(pts) && pts !== 0
    const badgeIds = Array.from(selectedBadges)
    const removeIds = Array.from(removeBadges)

    if (!hasPoints && badgeIds.length === 0 && removeIds.length === 0) {
      setFormError(t('admin.awardNothing'))
      return
    }
    if (points.trim() !== '' && Number.isNaN(pts)) {
      setFormError(t('admin.awardPointsInvalid'))
      return
    }

    setSubmitting(true)
    try {
      if (hasPoints) {
        const { error } = await supabase.from('point_awards').insert({
          user_id: user.id,
          points: pts,
          reason: reason.trim() || null,
          event_year: EVENT_YEAR,
          awarded_by: adminId,
        })
        if (error) throw error
      }

      if (badgeIds.length > 0) {
        const rows = badgeIds.map((badge_id) => ({
          user_id: user.id,
          badge_id,
          event_year: EVENT_YEAR,
          awarded_by: adminId,
        }))
        const { error } = await supabase
          .from('user_badges')
          .upsert(rows, { onConflict: 'user_id,badge_id,event_year', ignoreDuplicates: true })
        if (error) throw error
      }

      if (removeIds.length > 0) {
        const { error } = await supabase
          .from('user_badges')
          .delete()
          .eq('user_id', user.id)
          .eq('event_year', EVENT_YEAR)
          .in('badge_id', removeIds)
        if (error) throw error
      }

      const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.email ?? '')
      onAwarded?.()
      onClose()
      showAlert(t('admin.awardSuccessTitle'), t('admin.awardSuccessBody', { name }))
    } catch (e: any) {
      showAlert(t('common.error'), e?.message || 'Could not update')
    } finally {
      setSubmitting(false)
    }
  }

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || (user.email ?? user.id)
    : ''

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('admin.awardTitle')}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{displayName}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {loadingData ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#5a0061" />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
              {/* Points */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('admin.awardPointsLabel')}</Text>
                <TextInput
                  value={points}
                  onChangeText={setPoints}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numbers-and-punctuation"
                  style={styles.input}
                />
                <Text style={styles.inputHint}>{t('admin.awardPointsHint')}</Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder={t('admin.awardReasonPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>

              {/* Badges */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('admin.awardBadgesLabel')}</Text>
                {badges.length === 0 ? (
                  <Text style={styles.hint}>{t('admin.awardNoBadges')}</Text>
                ) : (
                  <>
                    <Text style={styles.inputHint}>{t('admin.awardBadgesHint')}</Text>
                    <View style={styles.badgeGrid}>
                      {badges.map((b) => {
                        const owned = ownedIds.has(b.id)
                        const selected = selectedBadges.has(b.id)
                        const marked = removeBadges.has(b.id)
                        return (
                          <Pressable
                            key={b.id}
                            onPress={() => toggleBadge(b.id)}
                            style={[
                              styles.badgeTile,
                              selected && styles.badgeTileSelected,
                              owned && !marked && styles.badgeTileOwned,
                              marked && styles.badgeTileRemove,
                            ]}
                          >
                            <BadgeIcon
                              svgUrl={iconPublicUrl(b.icon)}
                              color={marked ? '#dc2626' : owned ? '#cbd5e1' : b.color || '#c2b75f'}
                              size={34}
                            />
                            <Text style={styles.badgeTileText} numberOfLines={1}>
                              {localizeText(b.name, locale) || b.id}
                            </Text>
                            {marked ? (
                              <Text style={styles.removeTag}>{t('admin.awardRemoveTag')}</Text>
                            ) : owned ? (
                              <Text style={styles.ownedTag}>{t('admin.awardOwned')}</Text>
                            ) : null}
                          </Pressable>
                        )
                      })}
                    </View>
                  </>
                )}
              </View>

              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || loadingData}
              style={[styles.submitBtn, (submitting || loadingData) && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>{t('admin.awardButton')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 3, 16, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(2px)' } as any,
    }),
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    gap: 12,
    ...Platform.select({ web: { boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } as any }),
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 13, fontWeight: '700', color: '#5a0061', marginTop: 2 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  loading: { paddingVertical: 40, alignItems: 'center' },
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#334155' },
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
  hint: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  inputHint: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeTile: {
    width: 92,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  badgeTileSelected: { borderColor: '#5a0061', backgroundColor: '#faf5fb' },
  badgeTileOwned: { opacity: 0.7 },
  badgeTileRemove: { borderColor: '#dc2626', backgroundColor: '#fef2f2', opacity: 1 },
  badgeTileText: { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },
  ownedTag: { fontSize: 9, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  removeTag: { fontSize: 9, fontWeight: '800', color: '#dc2626', textTransform: 'uppercase' },
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
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  cancelBtnText: { color: '#64748b', fontSize: 14, fontWeight: '800' },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#5a0061',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
})
