/**
 * i18n & %s String Template Formatting Helpers for HackMTY
 */

export type Translation = { key: string; value: string }

/**
 * Converts a jsonb object or string into a Translation[] array for dynamic UI editors.
 * e.g., { en: "Hello", es: "Hola" } -> [{ key: "en", value: "Hello" }, { key: "es", value: "Hola" }]
 */
export function jsonbToTranslations(jsonbVal: any): Translation[] {
  if (!jsonbVal) return [{ key: 'en', value: '' }]
  if (typeof jsonbVal === 'string') {
    if (jsonbVal.trim().startsWith('{') || jsonbVal.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(jsonbVal)
        return jsonbToTranslations(parsed)
      } catch {
        return [{ key: 'en', value: jsonbVal }]
      }
    }
    return [{ key: 'en', value: jsonbVal }]
  }
  if (typeof jsonbVal === 'object') {
    const entries = Object.entries(jsonbVal)
    if (entries.length > 0) {
      return entries.map(([key, value]) => ({ key, value: String(value) }))
    }
  }
  return [{ key: 'en', value: '' }]
}

/**
 * Converts a Translation[] array back into a jsonb object.
 * e.g., [{ key: "en", value: "Hello" }, { key: "es", value: "Hola" }] -> { en: "Hello", es: "Hola" }
 */
export function translationsToJsonb(translations: Translation[]): Record<string, string> {
  const result: Record<string, string> = {}
  translations.forEach(({ key, value }) => {
    const k = key.trim().toLowerCase()
    if (k) {
      result[k] = value || ''
    }
  })
  return Object.keys(result).length > 0 ? result : { en: '' }
}

/**
 * Extracts localized text from a string, JSON string, or jsonb object.
 * e.g., { en: "Hello", es: "Hola" } -> "Hello" (for locale 'en')
 */
export function getLocalizedText(value: any, locale: string = 'en'): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        return getLocalizedText(parsed, locale)
      } catch (e) {
        return value
      }
    }
    return value
  }

  if (typeof value === 'object') {
    if (value[locale] && typeof value[locale] === 'string') {
      return value[locale]
    }
    // Fallback to Spanish if requested locale missing, or English, or first key
    if (value['es'] && typeof value['es'] === 'string') return value['es']
    if (value['en'] && typeof value['en'] === 'string') return value['en']
    const firstVal = Object.values(value)[0]
    if (typeof firstVal === 'string') return firstVal
  }

  return String(value)
}

/**
 * Replaces `%s` placeholders sequentially in a template string with provided arguments.
 * Equivalent to Java's String.format or C's printf for %s.
 * 
 * Example:
 * formatString("Meal claimed at %s by %s", "8:42 PM", "Alex")
 * => "Meal claimed at 8:42 PM by Alex"
 */
export function formatString(template: string, ...args: any[]): string {
  if (!template || typeof template !== 'string') return ''
  if (!args || args.length === 0) return template

  let argIndex = 0
  return template.replace(/%s/g, () => {
    if (argIndex < args.length) {
      const val = args[argIndex++]
      return val !== null && val !== undefined ? String(val) : ''
    }
    return '%s'
  })
}

/**
 * Formats a Date object or ISO string to localized 12-hour time (e.g. "8:42 PM" / "08:42 PM")
 */
export function formatTime(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return ''
  try {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso
    if (isNaN(d.getTime())) return String(dateOrIso)
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch (e) {
    return String(dateOrIso)
  }
}
