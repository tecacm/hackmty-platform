'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { BadgeIcon } from 'app/components/badge-icon'
import { AppIcon } from 'app/components/app-icon'
import { showAlert } from 'app/components/cross-alert'
import { jsonbToTranslations, translationsToJsonb, type Translation } from 'app/utils/i18n-helpers'
import { useTranslation } from 'app/i18n'

type Badge = {
  id: string
  name: any
  description: any
  icon: string | null
  color: string | null
  event_year: string | null
}

const PRESET_COLORS = ['#c2b75f', '#5a0061', '#e0392b', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#64748b']

function iconPublicUrl(icon: string | null): string | null {
  if (!icon) return null
  if (/^https?:\/\//i.test(icon)) return icon
  const { data } = supabase.storage.from('badge-icons').getPublicUrl(icon)
  return data?.publicUrl || null
}

function localize(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.en || ''
}

export function BadgesTab() {
  const { t, locale } = useTranslation()
  const [badges, setBadges] = React.useState<Badge[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creating, setCreating] = React.useState(false)

  // Create form
  const [newId, setNewId] = React.useState('')
  const [nameTranslations, setNameTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
    { key: 'es', value: '' },
  ])
  const [color, setColor] = React.useState('#c2b75f')
  const [assets, setAssets] = React.useState<Array<{ name: string; url: string }>>([])
  const [selectedIcon, setSelectedIcon] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<any>(null)

  const fetchBadges = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase.from('badges').select('*').order('created_at', { ascending: true })
      if (error) throw error
      setBadges((data as Badge[]) || [])
    } catch (e: any) {
      console.warn('Failed to load badges:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAssets = React.useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { data } = await supabase.storage
        .from('badge-icons')
        .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } })
      const files = (data || []).filter((f: any) => /\.svg$/i.test(f.name))
      setAssets(
        files.map((f: any) => {
          const { data: pub } = supabase.storage.from('badge-icons').getPublicUrl(f.name)
          return { name: f.name, url: pub?.publicUrl || '' }
        })
      )
    } catch (e) {
      console.warn('Failed to list badge assets:', e)
    }
  }, [])

  React.useEffect(() => {
    fetchBadges()
    fetchAssets()
  }, [fetchBadges, fetchAssets])

  const pickSvg = () => {
    if (Platform.OS !== 'web') {
      showAlert(t('admin.badgesUploadWebOnlyTitle'), t('admin.badgesUploadWebOnly'))
      return
    }
    fileInputRef.current?.click?.()
  }

  const onFileChange = (e: any) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    if (!/svg/i.test(file.type) && !/\.svg$/i.test(file.name)) {
      setFormError(t('admin.badgesSvgOnly'))
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const text = String(reader.result || '')
      // Store under the file's own slug (not the badge id) so it can be reused across badges.
      const slug =
        file.name.replace(/\.svg$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') ||
        `badge_${Date.now()}`
      const path = `${slug}.svg`
      setUploading(true)
      try {
        const { error } = await supabase.storage
          .from('badge-icons')
          .upload(path, text, { contentType: 'image/svg+xml', upsert: true })
        if (error) throw error
        await fetchAssets()
        setSelectedIcon(path)
      } catch (err: any) {
        setFormError(err?.message || 'Upload failed')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const resetForm = () => {
    setNewId('')
    setNameTranslations([{ key: 'en', value: '' }, { key: 'es', value: '' }])
    setColor('#c2b75f')
    setSelectedIcon(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreate = async () => {
    setFormError(null)
    const id = newId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!id) {
      setFormError(t('admin.badgesIdRequired'))
      return
    }
    const name = translationsToJsonb(nameTranslations)
    if (!Object.values(name).some((v) => (v || '').trim())) {
      setFormError(t('admin.badgesNameRequired'))
      return
    }
    if (!selectedIcon) {
      setFormError(t('admin.badgesSvgRequired'))
      return
    }
    setCreating(true)
    try {
      const { error: insErr } = await supabase.from('badges').upsert({
        id,
        name,
        icon: selectedIcon,
        color,
      })
      if (insErr) throw insErr

      resetForm()
      fetchBadges()
    } catch (e: any) {
      setFormError(e?.message || 'Could not create badge')
    } finally {
      setCreating(false)
    }
  }

  // Confirm before deleting a badge, surfacing how many users currently hold it
  // (deleting cascades and removes the badge from them).
  const handleDelete = async (badge: Badge) => {
    let count = 0
    try {
      const { count: c } = await supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('badge_id', badge.id)
      count = c || 0
    } catch {
      // best-effort count
    }
    const name = localize(badge.name, locale) || badge.id
    const message =
      count > 0
        ? t('admin.badgesDeleteConfirmHeld', { count, name })
        : t('admin.badgesDeleteConfirmNone', { name })

    showAlert(t('admin.badgesDeleteConfirmTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.badgesDeleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('badges').delete().eq('id', badge.id)
            if (error) throw error
            // The SVG asset is intentionally kept (shared library). Cascade removes grants.
            fetchBadges()
          } catch (e: any) {
            showAlert(t('common.error'), e?.message || 'Could not delete badge')
          }
        },
      },
    ])
  }

  // Delete a reusable SVG from the library. Blocked if any badge still references it.
  const handleDeleteAsset = async (name: string) => {
    setFormError(null)
    if (badges.some((b) => b.icon === name)) {
      setFormError(t('admin.badgesAssetInUse'))
      return
    }
    try {
      const { error } = await supabase.storage.from('badge-icons').remove([name])
      if (error) throw error
      if (selectedIcon === name) setSelectedIcon(null)
      fetchAssets()
    } catch (e: any) {
      setFormError(e?.message || 'Could not delete asset')
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  return (
    <View style={{ width: '100%' }}>
      {/* Create form */}
      <View style={styles.createCard}>
        <Text style={styles.sectionTitle}>{t('admin.badgesCreateTitle')}</Text>

        <View style={styles.createRow}>
          <View style={styles.previewBox}>
            <BadgeIcon svgUrl={iconPublicUrl(selectedIcon)} color={color} size={56} />
          </View>

          <View style={{ flex: 1, gap: 8, minWidth: 220 }}>
            <TextInput
              value={newId}
              onChangeText={setNewId}
              placeholder={t('admin.badgesIdPlaceholder')}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={styles.input}
            />
            <BadgeTranslationsEditor
              label={t('admin.badgesNameLabel')}
              placeholder={t('admin.badgesNamePlaceholder')}
              addLabel={t('admin.badgesAddLanguage')}
              translations={nameTranslations}
              setTranslations={setNameTranslations}
            />
          </View>
        </View>

        {/* Color */}
        <Text style={styles.fieldLabel}>{t('admin.badgesColorLabel')}</Text>
        <View style={styles.swatchRow}>
          {PRESET_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
          <TextInput
            value={color}
            onChangeText={setColor}
            placeholder="#c2b75f"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            style={[styles.input, { width: 110 }]}
          />
        </View>

        {/* Icon: pick a reusable SVG from the library, or upload a new one */}
        <View style={styles.uploadRow}>
          <Text style={styles.fieldLabel}>{t('admin.badgesIconLabel')}</Text>
          <Pressable onPress={pickSvg} style={styles.uploadBtn}>
            {uploading ? (
              <ActivityIndicator size="small" color="#5a0061" />
            ) : (
              <AppIcon name="plus.circle.fill" size={16} color="#5a0061" />
            )}
            <Text style={styles.uploadBtnText}>{t('admin.badgesUploadSvg')}</Text>
          </Pressable>
          {Platform.OS === 'web' ? (
            // @ts-ignore raw web input
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
          ) : null}
        </View>

        {assets.length === 0 ? (
          <Text style={styles.assetHint}>{t('admin.badgesNoAssets')}</Text>
        ) : (
          <View style={styles.assetGrid}>
            {assets.map((a) => {
              const isSelected = selectedIcon === a.name
              return (
                <View key={a.name} style={[styles.assetTile, isSelected && styles.assetTileActive]}>
                  <Pressable onPress={() => setSelectedIcon(a.name)} style={styles.assetTileInner}>
                    <BadgeIcon svgUrl={a.url} color={isSelected ? color : '#94a3b8'} size={36} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteAsset(a.name)} style={styles.assetDeleteBtn} hitSlop={6}>
                    <AppIcon name="xmark" size={11} color="#dc2626" />
                  </Pressable>
                </View>
              )
            })}
          </View>
        )}

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Pressable
          onPress={handleCreate}
          disabled={creating}
          style={[styles.createBtn, creating && { opacity: 0.6 }]}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.createBtnText}>{t('admin.badgesCreateButton')}</Text>
          )}
        </Pressable>
      </View>

      {/* Existing badges */}
      <View style={[styles.createCard, { marginTop: 20, marginBottom: 8 }]}>
      <Text style={[styles.sectionTitle]}>
        {t('admin.badgesExistingTitle')} ({badges.length})
      </Text>
      {badges.length === 0 ? (
        <Text style={styles.emptyText}>{t('admin.badgesEmpty')}</Text>
      ) : (
        <View style={styles.grid}>
          {badges.map((b) => (
            <View key={b.id} style={styles.badgeCard}>
              <BadgeIcon svgUrl={iconPublicUrl(b.icon)} color={b.color || '#c2b75f'} size={48} />
              <Text style={styles.badgeName} numberOfLines={1}>{localize(b.name, locale) || b.id}</Text>
              <Text style={styles.badgeId} numberOfLines={1}>{b.id}</Text>
              <Pressable onPress={() => handleDelete(b)} style={styles.deleteBtn}>
                <AppIcon name="xmark" size={13} color="#dc2626" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      </View>
    </View>
  )
}

function BadgeTranslationsEditor({
  label,
  placeholder,
  addLabel,
  translations,
  setTranslations,
}: {
  label: string
  placeholder: string
  addLabel: string
  translations: Translation[]
  setTranslations: (value: Translation[]) => void
}) {
  const update = (index: number, key: keyof Translation, value: string) =>
    setTranslations(translations.map((tr, i) => (i === index ? { ...tr, [key]: value } : tr)))

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {translations.map((tr, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TextInput
            style={[styles.input, { width: 64, textAlign: 'center', fontWeight: '700' }]}
            placeholder="key"
            placeholderTextColor="#94a3b8"
            value={tr.key}
            onChangeText={(v) => update(index, 'key', v)}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            value={tr.value}
            onChangeText={(v) => update(index, 'value', v)}
          />
          {translations.length > 1 && (
            <Pressable
              onPress={() => setTranslations(translations.filter((_, i) => i !== index))}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '900' }}>×</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={() => setTranslations([...translations, { key: '', value: '' }])}>
        <Text style={{ fontSize: 12, color: '#5a0061', fontWeight: '800' }}>{addLabel}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  createCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    gap: 12,
  },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  createRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', alignItems: 'center' },
  previewBox: {
    width: 80,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  fieldLabel: { color: '#475569', fontSize: 13, fontWeight: '700' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  swatch: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: '#0f172a' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assetTile: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  assetTileInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  assetDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetTileActive: { borderColor: '#5a0061', backgroundColor: '#faf5fb' },
  assetHint: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  uploadBtnText: { color: '#5a0061', fontSize: 13, fontWeight: '700' },
  createBtn: {
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  createBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
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
  emptyText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: {
    width: 120,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  badgeName: { color: '#0f172a', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  badgeId: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
