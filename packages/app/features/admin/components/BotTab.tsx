'use client'

import * as React from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { StyledSelect } from 'app/components/styled-select'
import { useTranslation } from 'app/i18n'

// activity_type: null = none; matches Discord ActivityType (0 Playing,1 Streaming,2 Listening,3 Watching,4 Custom,5 Competing)
const ACTIVITY_OPTIONS = [
  { label: 'No activity', value: '' },
  { label: 'Playing', value: '0' },
  { label: 'Listening to', value: '2' },
  { label: 'Watching', value: '3' },
  { label: 'Competing in', value: '5' },
  { label: 'Custom status', value: '4' },
  { label: 'Streaming', value: '1' },
]
const STATUS_OPTIONS = [
  { label: 'Online', value: 'online' },
  { label: 'Idle', value: 'idle' },
  { label: 'Do Not Disturb', value: 'dnd' },
  { label: 'Invisible', value: 'invisible' },
]

export function BotTab() {
  const { t } = useTranslation()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState('online')
  const [activityType, setActivityType] = React.useState('')
  const [activityText, setActivityText] = React.useState('')
  const [streamUrl, setStreamUrl] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }
      try {
        const { data } = await supabase.from('bot_config').select('*').eq('id', 'singleton').maybeSingle()
        if (data) {
          setStatus(data.status || 'online')
          setActivityType(data.activity_type != null ? String(data.activity_type) : '')
          setActivityText(data.activity_text || '')
          setStreamUrl(data.stream_url || '')
          setSavedAt(data.updated_at || null)
        }
      } catch (e) {
        console.warn('Failed to load bot_config:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    if (!isSupabaseConfigured) return
    setSaving(true)
    try {
      const { error } = await supabase.from('bot_config').upsert({
        id: 'singleton',
        status,
        activity_type: activityType === '' ? null : parseInt(activityType, 10),
        activity_text: activityText.trim() || null,
        stream_url: activityType === '1' ? streamUrl.trim() || null : null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      setSavedAt(new Date().toISOString())
    } catch (e: any) {
      alert(t('admin.botSaveFailed') + ' ' + (e?.message || ''))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#c2b75f" style={{ marginVertical: 40 }} />
      </View>
    )
  }

  const verb = ACTIVITY_OPTIONS.find((o) => o.value === activityType)?.label || ''
  const preview =
    activityType === ''
      ? t('admin.botPreviewNone')
      : activityType === '4'
      ? activityText || '…'
      : `${verb} ${activityText}`.trim()

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={styles.headerTitle}>{t('admin.botTab')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.botHint')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <StyledSelect label={t('admin.botStatus')} value={status} options={STATUS_OPTIONS} onValueChange={setStatus} />
        <StyledSelect label={t('admin.botActivity')} value={activityType} placeholder={t('admin.botActivityNone')} options={ACTIVITY_OPTIONS} onValueChange={setActivityType} />

        {activityType !== '' ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{activityType === '4' ? t('admin.botCustomText') : t('admin.botActivityText')}</Text>
            <TextInput
              value={activityText}
              onChangeText={setActivityText}
              placeholder={activityType === '4' ? 'e.g. HackMTY 2026 🚀' : 'e.g. HackMTY 2026'}
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
          </View>
        ) : null}

        {activityType === '1' ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>{t('admin.botStreamUrl')}</Text>
            <TextInput
              value={streamUrl}
              onChangeText={setStreamUrl}
              placeholder="https://twitch.tv/… or https://youtube.com/…"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.subHint}>{t('admin.botStreamHint')}</Text>
          </View>
        ) : null}

        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>{t('admin.botPreview')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.dot, { backgroundColor: status === 'online' ? '#22c55e' : status === 'idle' ? '#f59e0b' : status === 'dnd' ? '#ef4444' : '#94a3b8' }]} />
            <Text style={styles.previewText}>{preview}</Text>
          </View>
        </View>

        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveBtnText}>{t('admin.botSave')}</Text>}
        </Pressable>
        {savedAt ? <Text style={styles.subHint}>{t('admin.botLastUpdated', { when: new Date(savedAt).toLocaleString() })}</Text> : null}
        <Text style={styles.subHint}>{t('admin.botApplyNote')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#22002c', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', padding: 20, gap: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  subHint: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  previewBox: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, gap: 6 },
  previewLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.3, textTransform: 'uppercase' },
  previewText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  saveBtn: { backgroundColor: '#5a0061', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
})
