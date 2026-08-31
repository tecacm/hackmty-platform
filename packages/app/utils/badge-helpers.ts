import { supabase } from 'app/lib/supabase'

export type Badge = {
  id: string
  name: any
  description?: any
  icon: string | null
  color: string | null
  event_year?: string | null
}

/**
 * Resolves a badge `icon` value to a displayable URL. Icons are stored either as a
 * full URL or as a path/key in the public `badge-icons` storage bucket.
 */
export function iconPublicUrl(icon: string | null | undefined): string | null {
  if (!icon) return null
  if (/^https?:\/\//i.test(icon)) return icon
  const { data } = supabase.storage.from('badge-icons').getPublicUrl(icon)
  return data?.publicUrl || null
}

/**
 * Picks the best string from a localized jsonb value ({ en, es, ... }) for the given
 * locale, falling back to English then empty. Plain strings pass through.
 */
export function localizeText(value: any, locale: string): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] || value.en || Object.values(value)[0] || ''
}
