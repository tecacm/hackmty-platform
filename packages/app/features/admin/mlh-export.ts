'use client'

import { Platform } from 'react-native'
import { supabase, fetchAllRows } from 'app/lib/supabase'

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

// The exact columns MLH requires, mapped to hacker-form answer keys.
const MLH_COLUMNS: Array<{ header: string; get: (a: any) => any }> = [
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

/** Build a CSV string (UTF-8 BOM so Excel renders accents correctly). */
export function buildMlhCsv(apps: any[]): string {
  const header = MLH_COLUMNS.map((c) => csvEscape(c.header)).join(',')
  const lines = apps.map((a) => MLH_COLUMNS.map((c) => csvEscape(c.get(a))).join(','))
  return '\uFEFF' + [header, ...lines].join('\r\n')
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
