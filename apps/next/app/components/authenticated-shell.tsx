'use client'

import React, { useState, useEffect } from 'react'
import { View, ScrollView, Dimensions, Platform, StyleSheet } from 'react-native'
import { SolitoImage } from 'solito/image'
import { WebNavbar } from 'app/components/web-navbar'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import numbersbg from 'app/assets/images/numbers-bg.webp'

/**
 * Persistent shell for all authenticated screens.
 * Renders once and stays mounted during client-side navigation,
 * so the navbar and background never flash or remount.
 */
export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeArea()
  const [screenWidth, setScreenWidth] = useState(0)
  const [screenHeight, setScreenHeight] = useState(0)

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const update = () => {
        setScreenWidth(window.innerWidth)
        setScreenHeight(window.innerHeight)
      }
      update()
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
  }, [])

  const intrinsicWidth = (numbersbg as any)?.width ?? 1920
  const intrinsicHeight = (numbersbg as any)?.height ?? 1080
  const bgWidth = screenWidth > 0 ? screenWidth : intrinsicWidth
  const bgHeight = screenHeight > 0 ? screenHeight : intrinsicHeight

  return (
    <View style={styles.root}>
      {/* Fixed background — never remounts */}
      <View style={styles.background as any}>
        <SolitoImage
          {...({
            src: numbersbg,
            width: bgWidth,
            height: bgHeight,
            contentFit: 'cover',
            resizeMode: 'cover',
            transition: 0,
            alt: 'Abstract numbers background',
          } as any)}
        />
      </View>

      {/* Persistent navbar — never remounts */}
      <WebNavbar />

      {/* Scrollable page content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? 104 : insets.top + 64,
            paddingBottom: insets.bottom + 40,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#5a0061cc',
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    gap: 24,
    minHeight: '100vh' as any,
  },
})
