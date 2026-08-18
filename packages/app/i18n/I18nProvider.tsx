'use client'

import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react'
import { Platform } from 'react-native'
import en from './locales/en.json'
import es from './locales/es.json'
import { Locale, I18nContextType } from './types'

const STORAGE_KEY = 'hackmty_locale'
const dictionaries: Record<Locale, any> = { en, es }

export const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
})

function getInitialLocale(): Locale {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'en' || saved === 'es') {
        return saved
      }
      const navLang = navigator.language || (navigator as any).userLanguage || ''
      if (navLang.toLowerCase().startsWith('es')) {
        return 'es'
      }
    } catch (e) {}
  }
  return 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    const initial = getInitialLocale()
    setLocaleState(initial)
    setHasMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale)
        document.documentElement.lang = newLocale
      } catch (e) {}
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number> | (string | number)[]): string => {
      const currentDict = dictionaries[locale] || dictionaries.en
      const fallbackDict = dictionaries.en

      // Traverse dot notation (e.g. 'auth.login')
      const resolveKey = (dict: any, path: string): string | undefined => {
        const parts = path.split('.')
        let current = dict
        for (const part of parts) {
          if (!current || typeof current !== 'object') return undefined
          current = current[part]
        }
        return typeof current === 'string' ? current : undefined
      }

      let template = resolveKey(currentDict, key)
      if (template === undefined) {
        template = resolveKey(fallbackDict, key)
      }
      if (template === undefined) {
        return key
      }

      // If params array or arguments provided, replace %s
      if (Array.isArray(params)) {
        let idx = 0
        return template.replace(/%s/g, () => {
          if (idx < params.length) {
            const val = params[idx++]
            return val !== null && val !== undefined ? String(val) : ''
          }
          return '%s'
        })
      }

      // If object params provided, replace {param} or {{param}}
      if (params && typeof params === 'object') {
        let result = template
        for (const [k, v] of Object.entries(params)) {
          const regex = new RegExp(`\\{\\{?\\s*${k}\\s*\\}?\\}`, 'g')
          result = result.replace(regex, String(v))
        }
        // Also support single %s with first value if no template key matched
        if (result === template && Object.keys(params).length > 0 && template.includes('%s')) {
          const firstVal = Object.values(params)[0]
          result = result.replace(/%s/, String(firstVal))
        }
        return result
      }

      return template
    },
    [locale]
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
