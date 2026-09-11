'use client'

import * as React from 'react'
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { supabase, isSupabaseConfigured, fetchAllRows } from 'app/lib/supabase'
import { StyledSelect } from 'app/components/styled-select'
import { showAlert } from 'app/components/cross-alert'
import { useTranslation } from 'app/i18n'
import {
  fetchRegistrations,
  buildCsv,
  downloadCsv,
  collectAnswerKeys,
  answerColumn,
  META_COLUMNS,
  MLH_COLUMNS,
  exportTrackParticipantsCsv,
  fetchTrackUserIds,
  fetchTrackOptions,
  localizeTrackTitle,
  type CsvColumn,
} from '../mlh-export'

const STATUS_OPTIONS = ['draft', 'submitted', 'under_review', 'changes_requested', 'accepted', 'confirmed', 'rejected']

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#5a0061' : '#cbd5e1',
        backgroundColor: active ? '#ede9fe' : '#ffffff',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#5a0061' : '#475569' }}>{label}</Text>
    </Pressable>
  )
}

export function ExportsTab() {
  const { t, locale } = useTranslation()
  const [typeOptions, setTypeOptions] = React.useState<Array<{ label: string; value: string }>>([{ label: 'All types', value: 'all' }])
  const [appType, setAppType] = React.useState('all')
  const [statuses, setStatuses] = React.useState<Set<string>>(new Set())
  const [preset, setPreset] = React.useState<'custom' | 'mlh'>('custom')
  const [trackOptions, setTrackOptions] = React.useState<Array<{ label: string; value: string }>>([{ label: 'All tracks', value: 'all' }])
  const [trackId, setTrackId] = React.useState('all')

  const [apps, setApps] = React.useState<any[] | null>(null)
  const [availableFields, setAvailableFields] = React.useState<string[]>([])
  const [selectedMeta, setSelectedMeta] = React.useState<Set<string>>(new Set(META_COLUMNS.map((m) => m.header)))
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set())

  const [loading, setLoading] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  // Distinct application types present (for the type filter).
  React.useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      try {
        const rows = await fetchAllRows<any>((from, to) =>
          supabase.from('applications').select('application_type_id').order('application_type_id', { ascending: true }).range(from, to)
        )
        const set = new Set<string>()
        rows.forEach((r) => r.application_type_id && set.add(r.application_type_id))
        setTypeOptions([{ label: 'All types', value: 'all' }, ...Array.from(set).sort().map((v) => ({ label: v, value: v }))])
      } catch {
        /* ignore */
      }
    })()
  }, [])

  // Track options for the track filter.
  React.useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      try {
        const tracks = await fetchTrackOptions()
        setTrackOptions([{ label: 'All tracks', value: 'all' }, ...tracks.map((tr) => ({ label: localizeTrackTitle(tr.title, locale), value: tr.id }))])
      } catch {
        /* ignore */
      }
    })()
  }, [locale])

  const toggleStatus = (s: string) =>
    setStatuses((prev) => {
      const n = new Set(prev)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })
  const toggleMeta = (h: string) =>
    setSelectedMeta((prev) => {
      const n = new Set(prev)
      if (n.has(h)) n.delete(h)
      else n.add(h)
      return n
    })
  const toggleField = (f: string) =>
    setSelectedFields((prev) => {
      const n = new Set(prev)
      if (n.has(f)) n.delete(f)
      else n.add(f)
      return n
    })

  const handleLoad = async () => {
    if (loading) return
    setLoading(true)
    try {
      let userIds: string[] | null = null
      if (trackId !== 'all') {
        userIds = await fetchTrackUserIds(trackId)
      }
      const rows = await fetchRegistrations({
        applicationTypeId: appType !== 'all' ? appType : undefined,
        statuses: statuses.size > 0 ? Array.from(statuses) : undefined,
        userIds,
      })
      setApps(rows)
      const fields = collectAnswerKeys(rows)
      setAvailableFields(fields)
      setSelectedFields(new Set(fields))
      setSelectedMeta(new Set(META_COLUMNS.map((m) => m.header)))
    } catch (e: any) {
      showAlert(t('admin.exportFailed'), e?.message || 'Could not load registrations')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!apps || exporting) return
    setExporting(true)
    try {
      let columns: CsvColumn[]
      if (preset === 'mlh') {
        columns = MLH_COLUMNS
      } else {
        columns = [
          ...META_COLUMNS.filter((m) => selectedMeta.has(m.header)),
          ...availableFields.filter((f) => selectedFields.has(f)).map((f) => answerColumn(f)),
        ]
      }
      if (columns.length === 0) {
        showAlert(t('admin.exportFailed'), 'Select at least one column.')
        setExporting(false)
        return
      }
      const csv = buildCsv(apps, columns)
      const scope = `${appType}${preset === 'mlh' ? '-mlh' : ''}`
      const stamp = new Date().toISOString().slice(0, 10)
      downloadCsv(`export-${scope}-${stamp}.csv`, csv)
    } catch (e: any) {
      showAlert(t('admin.exportFailed'), e?.message || 'Could not build CSV')
    } finally {
      setExporting(false)
    }
  }

  const selectAllFields = () => setSelectedFields(new Set(availableFields))
  const clearFields = () => setSelectedFields(new Set())

  const [trackExporting, setTrackExporting] = React.useState(false)
  const handleExportTracks = async () => {
    if (trackExporting) return
    setTrackExporting(true)
    try {
      const n = await exportTrackParticipantsCsv(locale)
      showAlert(t('admin.exportComplete'), t('admin.exportCompleteBody', { count: n, type: 'track' }))
    } catch (e: any) {
      showAlert(t('admin.exportFailed'), e?.message || 'Could not export track participants')
    } finally {
      setTrackExporting(false)
    }
  }

  return (
    <View style={{ width: '100%', gap: 20 }}>
      <View style={styles.headerBox}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={styles.headerTitle}>{t('admin.exportsTitle')}</Text>
          <Text style={styles.headerSubtitle}>{t('admin.exportsSubtitle')}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.card}>
        <StyledSelect label="Application type" value={appType} options={typeOptions} onValueChange={setAppType} />

        <StyledSelect label="Track (assigned)" value={trackId} options={trackOptions} onValueChange={setTrackId} />

        <Text style={styles.label}>Status (none = all)</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <Chip key={s} label={s.replace(/_/g, ' ')} active={statuses.has(s)} onPress={() => toggleStatus(s)} />
          ))}
        </View>

        <Text style={styles.label}>Preset</Text>
        <View style={styles.chipRow}>
          <Chip label="Custom" active={preset === 'custom'} onPress={() => setPreset('custom')} />
          <Chip label="MLH (hackers)" active={preset === 'mlh'} onPress={() => setPreset('mlh')} />
        </View>
        {preset === 'mlh' ? (
          <Text style={styles.hint}>MLH preset exports the fixed MLH columns. Set type to "hacker" above.</Text>
        ) : null}

        <Pressable onPress={handleLoad} disabled={loading} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed || loading ? '#3d0042' : '#5a0061' }]}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Load registrations</Text>}
        </Pressable>
      </View>

      {/* Per-track participant export (assignment-based, independent of the filters above) */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('admin.exportByTrackTitle')}</Text>
        <Text style={styles.hint}>{t('admin.exportByTrackHint')}</Text>
        <Pressable onPress={handleExportTracks} disabled={trackExporting} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed || trackExporting ? '#3d0042' : '#5a0061' }]}>
          {trackExporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>{t('admin.exportByTrackAction')}</Text>}
        </Pressable>
        {Platform.OS !== 'web' ? <Text style={styles.hint}>CSV download is available on the web dashboard.</Text> : null}
      </View>

      {/* Columns + download (after load) */}
      {apps ? (
        <View style={styles.card}>
          <Text style={styles.loadedText}>{apps.length} registration{apps.length === 1 ? '' : 's'} loaded</Text>

          {preset === 'custom' ? (
            <>
              <Text style={styles.label}>Columns — meta</Text>
              <View style={styles.chipRow}>
                {META_COLUMNS.map((m) => (
                  <Chip key={m.header} label={m.header} active={selectedMeta.has(m.header)} onPress={() => toggleMeta(m.header)} />
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={styles.label}>Columns — answer fields</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={selectAllFields}><Text style={styles.linkBtn}>Select all</Text></Pressable>
                  <Pressable onPress={clearFields}><Text style={styles.linkBtn}>Clear</Text></Pressable>
                </View>
              </View>
              {availableFields.length === 0 ? (
                <Text style={styles.hint}>No answer fields found for this selection.</Text>
              ) : (
                <View style={styles.chipRow}>
                  {availableFields.map((f) => (
                    <Chip key={f} label={f} active={selectedFields.has(f)} onPress={() => toggleField(f)} />
                  ))}
                </View>
              )}
            </>
          ) : null}

          <Pressable onPress={handleDownload} disabled={exporting} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed || exporting ? '#3d0042' : '#5a0061' }]}>
            {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Download CSV</Text>}
          </Pressable>
          {Platform.OS !== 'web' ? <Text style={styles.hint}>CSV download is available on the web dashboard.</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(90,0,97,0.12)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#22002c', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90,0,97,0.12)',
    padding: 20,
    gap: 12,
  },
  label: { fontSize: 12, fontWeight: '800', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.3 },
  hint: { fontSize: 12, color: '#64748b' },
  loadedText: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkBtn: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
  primaryBtn: { height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
})
