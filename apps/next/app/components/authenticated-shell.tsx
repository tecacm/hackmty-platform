'use client'

import React, { useState, useEffect } from 'react'
import { View, ScrollView, Dimensions, Platform, StyleSheet } from 'react-native'
import { SolitoImage } from 'solito/image'
import { WebNavbar } from 'app/components/web-navbar'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import numbersbg from 'app/assets/images/numbers-bg.webp'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'

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

  const background = (
    <View style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <SolitoImage
        {...({
          src: numbersbg,
          fill: true,
          contentFit: 'cover',
          resizeMode: 'cover',
          transition: 0,
          alt: 'Abstract numbers background',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        } as any)}
      />
    </View>
  ) 
  
  return (
    <View style={styles.root}>
      <WebNavbar />
      <ParallaxScrollView
        background={background}
        style={{ backgroundColor: '#5a0061cc' }}
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
    backgroundColor: '#5a0061cc',
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
