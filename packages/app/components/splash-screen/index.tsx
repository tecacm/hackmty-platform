'use client'

import { useCallback, useEffect, useRef } from 'react'
import { View, ActivityIndicator, Platform, StyleSheet, Animated, Easing } from 'react-native'
import { SolitoImage } from 'solito/image'
import { LinearGradient } from 'app/components/linear-gradient'
import logoImage from 'app/assets/images/hackmty-logo.webp'

interface SplashScreenProps {
  /** Called once the minimum intro time has elapsed; the caller redirects when both this
   *  and the session check have completed. */
  onDone?: () => void
  /** Minimum time the splash stays visible so the animation is perceptible (ms). */
  minMs?: number
}

/**
 * Branded loading splash shown while the app resolves the persisted auth session on
 * (re)start: the HackMTY logo gently hovering over a dark purple gradient with a gold
 * spinner. Stays visible until BOTH `minMs` elapses AND the caller's session check
 * resolves, so it never just flashes.
 */
export function SplashScreen({ onDone, minMs = 1000 }: SplashScreenProps) {
  const firedRef = useRef(false)
  const fire = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    onDone?.()
  }, [onDone])

  useEffect(() => {
    const id = setTimeout(fire, minMs)
    return () => clearTimeout(id)
  }, [fire, minMs])

  // Gentle up/down hover on the logo.
  const float = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [float])
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [9, -9] })

  const ImageComponent = SolitoImage as any

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#33094a', '#1a0426', '#0d0214']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill as any}
      />
      <Animated.View style={[{ transform: [{ translateY }] }, styles.logoShadow]}>
        <View style={{ width: 210, height: 300 }}>
          <ImageComponent src={logoImage} height={300} width={210} alt="HackMTY" contentFit="contain" resizeMode="contain" priority />
        </View>
      </Animated.View>
      <ActivityIndicator size="large" color="#c9a668" style={{ marginTop: 44 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0214',
    ...Platform.select({ web: { minHeight: '100vh' as any } }),
  },
  logoShadow: {
    ...Platform.select({
      web: { filter: 'drop-shadow(0 26px 46px rgba(0,0,0,0.7))' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.65,
        shadowRadius: 26,
        elevation: 22,
      },
    }),
  },
})
