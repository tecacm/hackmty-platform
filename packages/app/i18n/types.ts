export type Locale = 'en' | 'es'

export interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number> | (string | number)[]) => string
}
