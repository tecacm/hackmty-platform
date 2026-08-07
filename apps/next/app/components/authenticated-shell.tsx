'use client'

import React, { useState, useEffect } from 'react'
import { View, ScrollView, Dimensions, Platform, StyleSheet } from 'react-native'
import { WebNavbar } from 'app/components/web-navbar'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import numbersbg from 'app/assets/images/numbers-bg.webp'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { Image } from 'react-native'
/**
 * Persistent shell for all authenticated screens.
 * Renders once and stays mounted during client-side navigation,
 * so the navbar and background never flash or remount.
 */
export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()
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

  const bgUri = (numbersbg as any)?.src || numbersbg

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && bgUri) {
      document.documentElement.style.setProperty('--numbers-bg-url', `url(${bgUri})`)
    }
  }, [bgUri])

  return (
    <View style={styles.root}>
      <WebNavbar />

      <ParallaxScrollView
        background={null}
        style={{ backgroundColor: 'transparent' }}
        contentContainerStyle={{
          alignItems: 'center',
          gap: 16,
          paddingTop: Platform.OS === 'web' ? ('calc(env(safe-area-inset-top, 0px) + 70px)' as any) : Math.max(headerHeight, insets.top) + 16,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          overflow: 'visible',
          width: '100%',
        }}
      >
        {children}
      </ParallaxScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
