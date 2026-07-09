'use client'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

export function StylesProvider({ children }: { children: React.ReactNode }) {
  // Cache the sheet text content and ID in component state so they match
  // during hydration and remain stable across client-side page updates.
  // @ts-ignore
  const [initialStyles] = useState(() => StyleSheet.getSheet().textContent)
  // @ts-ignore
  const [sheetId] = useState(() => StyleSheet.getSheet().id)

  return (
    <>
      <style
        id={sheetId}
        dangerouslySetInnerHTML={{ __html: initialStyles }}
        suppressHydrationWarning
      />
      {children}
    </>
  )
}
