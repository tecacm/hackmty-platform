'use client'

import { Platform } from 'react-native'
import { supabase, fetchAllRows } from 'app/lib/supabase'
import { createZip, type ZipEntry } from './zip'

// Human labels for the levelOfStudy select (MLH wants the readable label, not the value).
// Kept in sync with app/data/application-fields.json (fields.levelOfStudy.options).
const LEVEL_LABELS: Record<string, string> = {
  less_than_secondary: 'Less than Secondary / High School',
  secondary: 'Secondary / High School',
  undergraduate_2_year: 'Undergraduate (2 year - community college or similar)',
  undergraduate_3_year: 'Undergraduate (3+ year)',
  graduate: 'Graduate University (Masters, Professional, Doctoral, etc)',
  code_school: 'Code School / Bootcamp',
  other_vocational: 'Other Vocational / Trade Program or Apprenticeship',
  post_doctorate: 'Post Doctorate',
  other: 'Other',
  not_a_student: "I'm not currently a student",
}
const levelLabel = (v: any): string => {
  if (v == null || v === '') return ''
  return LEVEL_LABELS[String(v)] || String(v)
}

const yesNo = (v: any): string => (v === true || v === 'true' ? 'Yes' : 'No')
const str = (v: any): string => (v == null ? '' : String(v))
// Force a value to render as TEXT in Excel/Sheets (avoids long phone numbers showing as
// scientific notation like 5.28123E+11). Both apps treat a leading `=` as a formula.
const excelText = (v: any): string => {
  const s = str(v).trim()
  return s ? `="${s.replace(/"/g, '""')}"` : ''
}

export type CsvColumn = { header: string; get: (a: any) => any }

// The exact columns MLH requires, mapped to hacker-form answer keys.
export const MLH_COLUMNS: CsvColumn[] = [
  { header: 'First Name', get: (a) => a.answers?.firstName ?? a.profiles?.first_name ?? '' },
  { header: 'Last Name', get: (a) => a.answers?.lastName ?? a.profiles?.last_name ?? '' },
  { header: 'Email', get: (a) => a.answers?.email ?? a.profiles?.email ?? '' },
  { header: 'Phone Number', get: (a) => excelText(a.answers?.phone) },
  { header: 'Age', get: (a) => str(a.answers?.age) },
  { header: 'Country of Residence', get: (a) => str(a.answers?.country) },
  { header: 'School', get: (a) => str(a.answers?.university) },
  { header: 'Level of Study', get: (a) => levelLabel(a.answers?.levelOfStudy) },
  { header: 'MLH Code of Conduct', get: (a) => yesNo(a.answers?.codeOfConduct) },
  { header: 'MLH Event Logistics Information', get: (a) => yesNo(a.answers?.privacyPolicy) },
  { header: 'MLH Communication', get: (a) => yesNo(a.answers?.mlhEmails) },
]

export type MlhExportOptions = {
  /** Application type to export. Defaults to 'hacker'. */
  applicationTypeId?: string
  /** Optional status filter (e.g. ['accepted','confirmed']). Omit for all statuses. */
  statuses?: string[] | null
}

/** Pull every matching application (paged past the 1000-row cap). */
export async function fetchMlhApplications(opts: MlhExportOptions = {}): Promise<any[]> {
  const typeId = opts.applicationTypeId || 'hacker'
  return fetchAllRows<any>((from, to) => {
    let q = supabase
      .from('applications')
      .select('user_id, status, answers')
      .eq('application_type_id', typeId)
      .order('user_id', { ascending: true })
      .range(from, to)
    if (opts.statuses && opts.statuses.length > 0) q = q.in('status', opts.statuses)
    return q as any
  })
}

function csvEscape(val: any): string {
  const s = val === null || val === undefined ? '' : String(val)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/** Build a CSV from arbitrary columns (UTF-8 BOM so Excel renders accents correctly). */
export function buildCsv(apps: any[], columns: CsvColumn[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',')
  const lines = apps.map((a) => columns.map((c) => csvEscape(c.get(a))).join(','))
  return '\uFEFF' + [header, ...lines].join('\r\n')
}

/** Build a CSV string (UTF-8 BOM so Excel renders accents correctly). */
export function buildMlhCsv(apps: any[]): string {
  return buildCsv(apps, MLH_COLUMNS)
}

/** Trigger a browser download of the CSV (web only). */
export function downloadCsv(filename: string, csv: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}

/** Fetch → build → download. Returns the number of exported participants. */
export async function exportMlhCsv(opts: MlhExportOptions = {}): Promise<number> {
  const apps = await fetchMlhApplications(opts)
  const csv = buildMlhCsv(apps)
  const typeId = opts.applicationTypeId || 'hacker'
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`mlh-${typeId}-${stamp}.csv`, csv)
  return apps.length
}

// ---------------------------------------------------------------------------
// General "all registrations" export — every application with status + all answer fields.
// ---------------------------------------------------------------------------

export type RegistrationsExportOptions = {
  /** Restrict to one application type. Omit for ALL types. */
  applicationTypeId?: string
  /** Optional status filter. Omit for all statuses. */
  statuses?: string[] | null
  /** Optional: restrict to these user IDs (e.g. members of a track). Omit for everyone. */
  userIds?: string[] | null
}

/** Fetch every matching application (all types unless applicationTypeId is set). */
export async function fetchRegistrations(opts: RegistrationsExportOptions = {}): Promise<any[]> {
  const cols = 'user_id, application_type_id, status, answers, created_at, updated_at, confirmed_at'
  const applyFilters = (q: any) => {
    if (opts.applicationTypeId) q = q.eq('application_type_id', opts.applicationTypeId)
    if (opts.statuses && opts.statuses.length > 0) q = q.in('status', opts.statuses)
    return q
  }
  // Scoped to specific users (e.g. a track's members): chunk the IN() to keep URLs short.
  if (opts.userIds) {
    if (opts.userIds.length === 0) return []
    const out: any[] = []
    for (let i = 0; i < opts.userIds.length; i += 100) {
      const chunk = opts.userIds.slice(i, i + 100)
      const rows = await fetchAllRows<any>((from, to) =>
        applyFilters(supabase.from('applications').select(cols).in('user_id', chunk).order('user_id', { ascending: true }).range(from, to)) as any
      )
      out.push(...rows)
    }
    return out
  }
  return fetchAllRows<any>((from, to) =>
    applyFilters(
      supabase
        .from('applications')
        .select(cols)
        .order('application_type_id', { ascending: true })
        .order('user_id', { ascending: true })
        .range(from, to)
    ) as any
  )
}

function answerCell(key: string, v: any): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (Array.isArray(v)) return v.join('; ')
  if (typeof v === 'object') return JSON.stringify(v)
  if (key === 'phone') return excelText(v)
  return String(v)
}

/** Meta (non-answer) columns available for a general export. */
export const META_COLUMNS: CsvColumn[] = [
  { header: 'Application Type', get: (a) => str(a.application_type_id) },
  { header: 'Status', get: (a) => str(a.status) },
  { header: 'Created At', get: (a) => str(a.created_at) },
  { header: 'Updated At', get: (a) => str(a.updated_at) },
  { header: 'Confirmed At', get: (a) => str(a.confirmed_at) },
  { header: 'User ID', get: (a) => str(a.user_id) },
]

/** A column that reads one answer field (values formatted for CSV). */
export function answerColumn(key: string, label?: string): CsvColumn {
  return { header: label || key, get: (a) => answerCell(key, a.answers?.[key]) }
}

/** Union of all answer keys present across the rows (stable, sorted). */
export function collectAnswerKeys(apps: any[]): string[] {
  const keys = new Set<string>()
  apps.forEach((a) => {
    if (a.answers && typeof a.answers === 'object') Object.keys(a.answers).forEach((k) => keys.add(k))
  })
  return Array.from(keys).sort()
}

/** Build a wide CSV: meta columns (type/status/timestamps) + every answer key seen. */
export function buildRegistrationsCsv(apps: any[]): string {
  return buildCsv(apps, [...META_COLUMNS, ...collectAnswerKeys(apps).map((k) => answerColumn(k))])
}

/** Fetch → build → download the full registrations CSV. Returns the row count. */
export async function exportRegistrationsCsv(opts: RegistrationsExportOptions = {}): Promise<number> {
  const apps = await fetchRegistrations(opts)
  const csv = buildRegistrationsCsv(apps)
  const scope = opts.applicationTypeId || 'all'
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`registrations-${scope}-${stamp}.csv`, csv)
  return apps.length
}

// ---------------------------------------------------------------------------
// Per-track participant export (one row per member of each assigned team).
// ---------------------------------------------------------------------------

const localizeJson = (v: any, locale = 'en'): string => {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v[locale] || v.en || (Object.values(v).find((x: any) => typeof x === 'string') as string) || ''
}

/** Rows come from the admin_track_participants() RPC (admin/organizer only). */
export async function fetchTrackParticipants(): Promise<any[]> {
  const { data, error } = await supabase.rpc('admin_track_participants')
  if (error) throw error
  return (data as any[]) || []
}

export function buildTrackParticipantsCsv(rows: any[], locale = 'en'): string {
  const columns: CsvColumn[] = [
    { header: 'Track', get: (r) => localizeJson(r.track_title, locale) },
    { header: 'Team', get: (r) => str(r.team_name) },
    { header: 'Desk Number', get: (r) => str(r.desk_number) },
    { header: 'Devpost', get: (r) => str(r.devpost_url) },
    { header: 'First Name', get: (r) => str(r.first_name) },
    { header: 'Last Name', get: (r) => str(r.last_name) },
    { header: 'Email', get: (r) => str(r.email) },
    { header: 'Status', get: (r) => str(r.status) },
    { header: 'Assigned Randomly', get: (r) => (r.assigned_random ? 'Yes' : 'No') },
  ]
  return buildCsv(rows, columns)
}

/** Fetch → build → download participants grouped by assigned track. Returns row count. */
export async function exportTrackParticipantsCsv(locale = 'en'): Promise<number> {
  const rows = await fetchTrackParticipants()
  const csv = buildTrackParticipantsCsv(rows, locale)
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(`track-participants-${stamp}.csv`, csv)
  return rows.length
}

/** Distinct user IDs assigned to a given track (from admin_track_participants). */
export async function fetchTrackUserIds(trackId: string): Promise<string[]> {
  const rows = await fetchTrackParticipants()
  return Array.from(new Set(rows.filter((r) => r.track_id === trackId).map((r) => r.user_id).filter(Boolean)))
}

// ---------------------------------------------------------------------------
// Team project submissions export — one row per team: desk + Devpost link.
// ---------------------------------------------------------------------------

/** All team project submissions (staff-readable via RLS), enriched with team name + assigned track. */
export async function fetchTeamProjects(): Promise<any[]> {
  const { data, error } = await supabase
    .from('team_projects')
    .select('team_id, devpost_url, desk_number, submitted_at, updated_at, teams(name)')
  if (error) throw error
  const rows = (data as any[]) || []

  // Best-effort assigned-track per team (may be empty before tracks are finalized).
  const trackByTeamName: Record<string, { id: string; title: any }> = {}
  try {
    const parts = await fetchTrackParticipants()
    for (const p of parts) {
      if (p.team_name && p.track_title && !trackByTeamName[p.team_name]) {
        trackByTeamName[p.team_name] = { id: p.track_id, title: p.track_title }
      }
    }
  } catch {
    /* tracks not finalized / no access — leave track blank */
  }

  return rows
    .map((r) => {
      const tr = trackByTeamName[(r.teams?.name as string) || '']
      return {
        ...r,
        team_name: (r.teams?.name as string) || '',
        track_id: tr?.id || null,
        track_title: tr?.title || null,
      }
    })
    .sort((a, b) => str(a.desk_number).localeCompare(str(b.desk_number), undefined, { numeric: true }))
}

export function buildTeamProjectsCsv(rows: any[], locale = 'en'): string {
  const columns: CsvColumn[] = [
    { header: 'Team', get: (r) => str(r.team_name) },
    { header: 'Desk Number', get: (r) => str(r.desk_number) },
    { header: 'Devpost URL', get: (r) => str(r.devpost_url) },
    { header: 'Track', get: (r) => localizeJson(r.track_title, locale) },
    { header: 'Submitted At', get: (r) => str(r.submitted_at) },
    { header: 'Last Updated', get: (r) => str(r.updated_at) },
  ]
  return buildCsv(rows, columns)
}

/** Fetch → build → download team project submissions. Optionally filter by track / team-name search. Returns row count. */
export async function exportTeamProjectsCsv(
  locale = 'en',
  opts: { trackId?: string; search?: string } = {}
): Promise<number> {
  let rows = await fetchTeamProjects()
  const trackId = opts.trackId && opts.trackId !== 'all' ? opts.trackId : null
  const q = (opts.search || '').trim().toLowerCase()
  if (trackId) rows = rows.filter((r) => r.track_id === trackId)
  if (q) rows = rows.filter((r) => String(r.team_name || '').toLowerCase().includes(q))
  const csv = buildTeamProjectsCsv(rows, locale)
  const stamp = new Date().toISOString().slice(0, 10)
  const scope = trackId ? `track-${trackId.slice(0, 8)}` : 'all'
  downloadCsv(`team-projects-${scope}-${stamp}.csv`, csv)
  return rows.length
}

/** Active tracks for a filter dropdown: { id, title }. */
export async function fetchTrackOptions(): Promise<Array<{ id: string; title: any }>> {
  const { data } = await supabase.from('tracks').select('id, title').eq('is_active', true).order('display_order', { ascending: true })
  return (data as any[]) || []
}

export function localizeTrackTitle(v: any, locale = 'en'): string {
  return localizeJson(v, locale)
}

// ---------------------------------------------------------------------------
// Resume / CV bundle export — download all CVs matching a filter as a single ZIP.
// ---------------------------------------------------------------------------

const safeName = (s: string): string => (s || '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 60)
const extOf = (path: string): string => {
  const base = path.split('?')[0] || ''
  const ext = base.split('.').pop() || ''
  return ext && ext.length <= 5 ? ext.toLowerCase() : 'pdf'
}

/** Bundle every resume/CV for the filtered applications into one ZIP and download it.
 *  Returns { count: files zipped, total: applications that had a resume }. */
export async function exportResumesZip(opts: RegistrationsExportOptions = {}): Promise<{ count: number; total: number }> {
  const apps = await fetchRegistrations(opts)
  const withResume = apps.filter((a) => a.answers?.resume)
  const files: ZipEntry[] = []
  const seen = new Set<string>()

  const processOne = async (a: any) => {
    const path = String(a.answers.resume)
    try {
      let bytes: Uint8Array | null = null
      if (/^https?:\/\//i.test(path)) {
        const res = await fetch(path)
        if (res.ok) bytes = new Uint8Array(await res.arrayBuffer())
      } else {
        const { data } = await supabase.storage.from('resumes').download(path)
        if (data) bytes = new Uint8Array(await (data as Blob).arrayBuffer())
      }
      if (!bytes) return
      const first = safeName(a.answers?.firstName || '')
      const last = safeName(a.answers?.lastName || '')
      let name = `${last || 'Unknown'}_${first || 'Applicant'}_${(a.user_id || '').slice(0, 8)}.${extOf(path)}`
      while (seen.has(name)) name = name.replace(/(\.\w+)$/, `_${Math.random().toString(36).slice(2, 6)}$1`)
      seen.add(name)
      files.push({ name, data: bytes })
    } catch {
      /* skip files that fail to download */
    }
  }

  // Bounded-concurrency worker pool so hundreds of CVs download quickly (not one-at-a-time).
  const CONCURRENCY = 8
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, withResume.length) }, async () => {
      while (next < withResume.length) {
        const i = next++
        await processOne(withResume[i])
      }
    })
  )

  const zip = createZip(files)
  const scope = opts.applicationTypeId || 'all'
  const stamp = new Date().toISOString().slice(0, 10)
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(zip)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumes-${scope}-${stamp}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  return { count: files.length, total: withResume.length }
}
