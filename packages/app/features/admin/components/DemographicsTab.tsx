'use client'

import * as React from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from 'react-native'
import { supabase, isSupabaseConfigured, fetchAllRows } from 'app/lib/supabase'
import { StyledSegmented } from 'app/components/styled-segmented'
import { DistributionChart } from './charts/DistributionChart'
import { useTranslation } from 'app/i18n'

// Candidate fields to summarize, in display order. These are identifiers only;
// every label (field title + option labels) and each field's option set is resolved
// live from the Supabase `form_fields` table. Fields not present in the DB for this
// event are silently skipped, and whether a field renders as a fixed-option
// distribution or a free-text top-N breakdown is decided by whether the DB row
// carries options — nothing here is read from the static reference JSON.
const CANDIDATE_FIELD_IDS = [
  'gender',
  'tshirt',
  'diet',
  'levelOfStudy',
  'studyingOrWorking',
  'year',
  'firstHackathon',
  'university',
  'major',
  'country',
] as const

// Answer keys occasionally differ from the field id across older submissions.
const ANSWER_KEY_ALIASES: Record<string, string[]> = {
  tshirt: ['tshirt', 'tshirtSize', 'tshirt_size'],
  diet: ['diet', 'dietaryRestrictions', 'dietary_restrictions'],
  levelOfStudy: ['levelOfStudy', 'level_of_study', 'levelofstudy'],
  studyingOrWorking: ['studyingOrWorking', 'studying_or_working'],
  year: ['year', 'graduationYear', 'graduation_year'],
  firstHackathon: ['firstHackathon', 'first_hackathon'],
  university: ['university', 'school'],
}

// How many distinct values to show for free-text breakdowns before rolling the
// remainder into an "Others" bucket.
const TEXT_TOP_N = 10

// Palette for bars (cycled).
const BAR_COLORS = ['#5a0061', '#8b5cf6', '#c2b75f', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#64748b']

type FieldMeta = {
  id: string
  title: string
  // 'options' => fixed-choice select (render full distribution in admin order).
  // 'text'    => free-text field (render top-N most common values).
  kind: 'options' | 'text'
  // Ordered option definitions from the DB (value -> label), preserving admin order.
  options: Array<{ value: string; label: string }>
}

type Distribution = {
  field: FieldMeta
  buckets: Array<{ key: string; label: string; count: number }>
  answered: number
}

function localize(jsonbVal: any, locale: string): string | null {
  if (jsonbVal === null || jsonbVal === undefined) return null
  if (typeof jsonbVal === 'string') return jsonbVal
  if (typeof jsonbVal === 'object') {
    return jsonbVal[locale] || jsonbVal['en'] || Object.values(jsonbVal).find((v) => typeof v === 'string') as string || null
  }
  return String(jsonbVal)
}

function prettifyValue(raw: string): string {
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function DemographicsTab() {
  const { t, locale } = useTranslation()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [scope, setScope] = React.useState<'all' | 'confirmed'>('confirmed')

  const [fieldMetas, setFieldMetas] = React.useState<FieldMeta[]>([])
  // One record per application (a user may appear once per application type).
  const [appRecords, setAppRecords] = React.useState<
    Array<{ userId: string; typeId: string; confirmed: boolean; answers: Record<string, any>; rank: number }>
  >([])
  // Application types present, for the role filter (localized labels from Supabase).
  const [appTypes, setAppTypes] = React.useState<Array<{ id: string; label: string }>>([])
  const [selectedType, setSelectedType] = React.useState<string>('all')

  const load = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Field + option definitions straight from Supabase (localized).
      const { data: fieldsData, error: fieldsErr } = await supabase
        .from('form_fields')
        .select('id, label, options')
        .in('id', CANDIDATE_FIELD_IDS as unknown as string[])
      if (fieldsErr) throw fieldsErr

      const metaById = new Map<string, FieldMeta>()
      ;(fieldsData || []).forEach((f: any) => {
        const opts = Array.isArray(f.options)
          ? f.options
              .map((o: any) => ({ value: String(o?.value ?? ''), label: localize(o?.label, locale) || prettifyValue(String(o?.value ?? '')) }))
              .filter((o: { value: string }) => o.value !== '')
          : []
        metaById.set(f.id, {
          id: f.id,
          title: localize(f.label, locale) || prettifyValue(f.id),
          kind: opts.length > 0 ? 'options' : 'text',
          options: opts,
        })
      })
      // Preserve the requested order; skip fields that don't exist in the DB.
      const metas = CANDIDATE_FIELD_IDS.map((id) => metaById.get(id)).filter(Boolean) as FieldMeta[]
      setFieldMetas(metas)

      // 2. Application types for the role filter (localized labels from Supabase).
      const { data: typesData } = await supabase
        .from('application_types')
        .select('id, label')
      const types = (typesData || []).map((tp: any) => ({
        id: tp.id,
        label: localize(tp.label, locale) || prettifyValue(tp.id),
      }))

      // 3. All applications (paginated — never truncated at 1000). Kept per-application
      // (with type) so the role filter can scope answers to a specific application type.
      const apps = await fetchAllRows<{ user_id: string; status: string; confirmed_at: string | null; answers: Record<string, any>; application_type_id: string }>(
        (from, to) =>
          supabase
            .from('applications')
            .select('user_id, status, confirmed_at, answers, application_type_id')
            .order('user_id', { ascending: true })
            .range(from, to)
      )

      const statusRank = (a: { status: string; confirmed_at: string | null }): number => {
        const confirmed = a.status === 'confirmed' || a.confirmed_at !== null
        if (confirmed) return 3
        if (a.status === 'accepted') return 2
        if (a.status === 'submitted') return 1
        return 0
      }

      const records = apps
        .filter((a) => a.user_id)
        .map((a) => ({
          userId: a.user_id,
          typeId: a.application_type_id,
          confirmed: a.status === 'confirmed' || a.confirmed_at !== null,
          answers: a.answers || {},
          rank: statusRank(a),
        }))
      setAppRecords(records)

      // Only offer filter options for types that actually have applications.
      const presentTypeIds = new Set(records.map((r) => r.typeId).filter(Boolean))
      setAppTypes(types.filter((tp) => presentTypeIds.has(tp.id)))
    } catch (err: any) {
      console.warn('Failed to load demographics:', err)
      setError(err?.message || 'Could not load demographics')
    } finally {
      setLoading(false)
    }
  }, [locale])

  React.useEffect(() => {
    load()
  }, [load])

  // Apply the role (application-type) filter, then dedupe to one record per user.
  // When a specific type is selected we scope to that type's applications; for "all"
  // we dedupe across every type by the user's most-advanced application.
  const people = React.useMemo(() => {
    const filtered = selectedType === 'all' ? appRecords : appRecords.filter((r) => r.typeId === selectedType)
    const byUser = new Map<string, { confirmed: boolean; answers: Record<string, any>; rank: number }>()
    filtered.forEach((r) => {
      const existing = byUser.get(r.userId)
      if (!existing || r.rank > existing.rank) {
        byUser.set(r.userId, { confirmed: r.confirmed, answers: r.answers, rank: r.rank })
      }
    })
    return Array.from(byUser.values()).map(({ confirmed, answers }) => ({ confirmed, answers }))
  }, [appRecords, selectedType])

  const scoped = React.useMemo(
    () => (scope === 'confirmed' ? people.filter((p) => p.confirmed) : people),
    [people, scope]
  )
  const confirmedCount = React.useMemo(() => people.filter((p) => p.confirmed).length, [people])

  const readAnswer = (answers: Record<string, any>, fieldId: string): string | null => {
    const keys = ANSWER_KEY_ALIASES[fieldId] ?? [fieldId]
    for (const key of keys) {
      const v = answers?.[key]
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
    }
    return null
  }

  const distributions: Distribution[] = React.useMemo(() => {
    return fieldMetas.map((field) => {
      const counts = new Map<string, number>()
      let answered = 0
      scoped.forEach((p) => {
        const raw = readAnswer(p.answers, field.id)
        const key = raw ?? '__unspecified__'
        if (raw !== null) answered++
        counts.set(key, (counts.get(key) || 0) + 1)
      })

      const unspecified = counts.get('__unspecified__') || 0
      counts.delete('__unspecified__')

      const buckets: Array<{ key: string; label: string; count: number }> = []

      if (field.kind === 'options') {
        // Fixed-choice: show every defined option in admin order, then any
        // unexpected values present in answers, then "unspecified".
        field.options.forEach((opt) => {
          buckets.push({ key: opt.value, label: opt.label, count: counts.get(opt.value) || 0 })
          counts.delete(opt.value)
        })
        Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([key, count]) => buckets.push({ key, label: prettifyValue(key), count }))
      } else {
        // Free-text: merge case-insensitively, show the top N, roll up the rest.
        const merged = new Map<string, { label: string; count: number }>()
        Array.from(counts.entries()).forEach(([raw, count]) => {
          const norm = raw.toLowerCase()
          const prev = merged.get(norm)
          if (prev) prev.count += count
          else merged.set(norm, { label: prettifyValue(raw), count })
        })
        const sorted = Array.from(merged.values()).sort((a, b) => b.count - a.count)
        sorted.slice(0, TEXT_TOP_N).forEach((entry, i) => buckets.push({ key: `top-${i}-${entry.label}`, label: entry.label, count: entry.count }))
        const othersCount = sorted.slice(TEXT_TOP_N).reduce((sum, e) => sum + e.count, 0)
        if (othersCount > 0) {
          buckets.push({ key: '__others__', label: t('admin.demographicsOthers'), count: othersCount })
        }
      }

      if (unspecified > 0) {
        buckets.push({ key: '__unspecified__', label: t('admin.demographicsUnspecified'), count: unspecified })
      }

      return { field, buckets, answered }
    })
  }, [fieldMetas, scoped, t])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c2b75f" />
        <Text style={styles.loadingText}>{t('admin.loadingTab')}</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>{t('admin.demographicsRetry')}</Text>
        </Pressable>
      </View>
    )
  }

  const totalPeople = people.length

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Summary stat cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalPeople}</Text>
          <Text style={styles.statLabel}>{t('admin.demographicsTotalApplicants')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{confirmedCount}</Text>
          <Text style={styles.statLabel}>{t('admin.demographicsConfirmed')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{scoped.length}</Text>
          <Text style={styles.statLabel}>{t('admin.demographicsShowing')}</Text>
        </View>
      </View>

      {/* Role (application type) filter */}
      {appTypes.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.filterLabel}>{t('admin.demographicsRole')}</Text>
          <View style={styles.pillRow}>
            {[{ id: 'all', label: t('admin.demographicsAllRoles') }, ...appTypes].map((tp) => {
              const active = selectedType === tp.id
              return (
                <Pressable
                  key={tp.id}
                  onPress={() => setSelectedType(tp.id)}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{tp.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      )}

      {/* Scope toggle */}
      <View style={{ marginBottom: 20, maxWidth: 360 }}>
        <StyledSegmented
          label=""
          value={scope}
          options={[
            { label: t('admin.demographicsConfirmed'), value: 'confirmed' },
            { label: t('admin.demographicsAll'), value: 'all' },
          ]}
          onValueChange={(v) => setScope(v as 'all' | 'confirmed')}
        />
      </View>

      {scoped.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t('admin.demographicsNoData')}</Text>
        </View>
      ) : (
        <View style={styles.chartGrid}>
          {distributions.map((dist) => (
            <DistributionChart
              key={dist.field.id}
              title={dist.field.title}
              subtitle={t('admin.demographicsResponses', { answered: dist.answered, total: scoped.length })}
              kind={dist.field.kind}
              data={dist.buckets}
              total={scoped.length}
              colors={BAR_COLORS}
            />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  errorText: { color: '#ff6b6b', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#5a0061',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'flex-start',
  },  filterLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#5a0061',
    borderColor: '#c2b75f',
  },
  filterPillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  statValue: { color: '#0f172a', fontSize: 28, fontWeight: '900', letterSpacing: 0.3 },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
})
