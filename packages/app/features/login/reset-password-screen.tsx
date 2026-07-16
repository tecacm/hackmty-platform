'use client'

import { Text, View, ActivityIndicator } from 'react-native'
import { SolitoImage } from 'solito/image'
import { LinearGradient } from 'app/components/linear-gradient'
import logoImage from 'app/assets/images/hackmty-logo.webp'
import rectoria from 'app/assets/images/login-screen/rectoria.webp'
import pavoreal from 'app/assets/images/login-screen/pavoreal.webp'
import ciap from 'app/assets/images/login-screen/ciap.webp'
import photo2024 from 'app/assets/images/login-screen/2024photo.webp'
import skyview from 'app/assets/images/login-screen/skyview.webp'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { Carrousel } from 'app/components/carrousel'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { useEffect, useState } from 'react'
import { StyleSheet, Platform } from 'react-native'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import { StyledInput } from 'app/components/styled-input'
import { PillButton } from 'app/components/pill-button'
import { SimpleTextLink } from 'app/components/simple-text-link'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { Controller, useForm } from 'react-hook-form'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'

type ResetPasswordValues = {
  password: string
  confirmPassword: string
}

const styles = StyleSheet.create({
  glassCard: {
    position: 'relative',
    width: 640,
    maxWidth: '100%',
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 34,
    paddingHorizontal: 44,
    alignItems: 'center',
    overflow: 'hidden',
    gap: 13,
    ...Platform.select({
      web: {
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)',
        backdropFilter: 'blur(34px) saturate(190%) brightness(1.08) contrast(1.03)',
        WebkitBackdropFilter: 'blur(34px) saturate(190%) brightness(1.08) contrast(1.03)',
        boxShadow:
          '0 30px 70px -18px rgba(0,0,0,.45), 0 4px 14px rgba(0,0,0,.15), inset 0 1.5px 1px rgba(255,255,255,.75), inset 0 -14px 26px -18px rgba(255,255,255,.2), inset 0 0 0 1px rgba(255,255,255,.1), 0 0 50px -8px rgba(240,217,176,.35)',
      } as any,
      native: {
        backgroundColor: 'rgba(60, 40, 80, 0.55)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 10,
      },
    }),
  },
  glassCardGlow: {
    position: 'absolute',
    bottom: '-15%',
    right: '-10%',
    width: '70%',
    height: '45%',
    ...Platform.select({
      web: {
        backgroundImage: 'radial-gradient(ellipse at 70% 100%, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 65%)',
      } as any,
    }),
  },
  glassCardRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 38,
    padding: 1.5,
    ...Platform.select({
      web: {
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,.7) 0%, rgba(255,255,255,.12) 20%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 65%, rgba(255,255,255,.22) 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      } as any,
    }),
  },
  wordmarkBlock: {
    alignItems: 'center',
    gap: 8,
  },
  wordmarkRow: {
    flexDirection: 'row',
  },
  wordmarkHack: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Montserrat',
  },
  wordmarkMty: {
    color: '#c9a668',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Montserrat',
  },
  divider: {
    width: 44,
    height: 2,
  },
  subtitle: {
    color: '#e9e3f0',
    fontSize: 13.5,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  fieldGroup: {
    width: '100%',
    gap: 6,
  },
  fieldGroupFirst: {
    marginTop: 4,
  },
  authError: {
    color: '#ffb4b4',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  successMessage: {
    color: '#c5ffd3',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  initializingText: {
    color: '#e9e3f0',
    marginTop: 12,
    fontFamily: 'Montserrat',
  },
})

export function ResetPasswordScreen() {
  const { navigateTo } = useSmartNavigate();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const images = [rectoria, pavoreal, ciap, photo2024, skyview];

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const passwordVal = watch('password')

  useEffect(() => {
    if (headerHeight > stableHeaderHeight) {
      setStableHeaderHeight(headerHeight);
    }
  }, [headerHeight, stableHeaderHeight]);

  useEffect(() => {
    const initializeRecoverySession = async () => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        setIsInitializing(false)
        return
      }

      try {
        if (!isSupabaseConfigured) {
          setIsInitializing(false)
          return
        }

        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const hash = window.location.hash
        let hasSession = false

        // 1. If code exists, exchange code for session (PKCE Flow)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          hasSession = true
        }
        // 2. If access_token hash parameter exists, set session manually (Implicit Flow)
        else if (hash && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.substring(1)) // remove '#'
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (error) throw error
            hasSession = true
          }
        }

        // 3. Clean up the URL to prevent subsequent reload loops trying to reuse the single-use token/code
        if (hasSession) {
          const cleanUrl = window.location.pathname
          window.history.replaceState({}, document.title, cleanUrl)
        }

        // 4. Asynchronous state verification check with retry bounds (up to 1.2 seconds)
        let activeUser: any = null
        for (let i = 0; i < 6; i++) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            activeUser = user
            break
          }
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        if (!activeUser) {
          setErrorMessage('This reset link is no longer valid. Please request a new password reset email.')
        }
      } catch (err: any) {
        console.error('Failed to resolve recovery session:', err)
        // "code verifier not found" happens when an older reset link is opened
        // after a newer one was requested, invalidating the stored PKCE state.
        const isStaleLink = typeof err?.message === 'string' && /code verifier/i.test(err.message)
        setErrorMessage(
          isStaleLink
            ? 'This reset link is no longer valid, possibly because a newer one was requested. Please request a new password reset email.'
            : 'This reset link is no longer valid. Please request a new password reset email.'
        )
      } finally {
        setIsInitializing(false)
      }
    }

    initializeRecoverySession()
  }, [])

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24;

  const goToLogin = () => navigateTo('/login')

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    if (isSubmitting) return

    setErrorMessage(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        setErrorMessage('Supabase is not configured for this environment.')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setErrorMessage(error.message || 'Failed to update your password.')
        return
      }

      setStatusMessage('Your password has been reset successfully!')
      setTimeout(() => {
        navigateTo('/login')
      }, 2000)
    } catch {
      setErrorMessage('Unable to reset password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const background = (
    <>
      <Carrousel slideImages={images} mode="crossfade" />
      <LinearGradient
        colors={['rgba(20, 10, 40, 0.35)', 'rgba(20, 10, 40, 0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </>
  );

  return (
    <ParallaxScrollView
      background={background}
      style={{ backgroundColor: Platform.select({ web: 'oklch(0.16 0.01 280)', default: '#211f26' }) }}
      contentContainerStyle={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: topOffset,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        overflow: 'visible',
      }}
    >
        <View style={styles.glassCard}>
          <View style={styles.glassCardGlow} pointerEvents="none" />
          <View style={styles.glassCardRing} pointerEvents="none" />
          <View style={{ width: 98, height: 140, flexShrink: 0 }}>
            {(() => {
              const ImageComponent = SolitoImage as any
              return (
                <ImageComponent
                  src={logoImage}
                  height={140}
                  width={98}
                  alt="The HackMTY Logo"
                  contentFit="contain"
                  resizeMode="contain"
                />
              )
            })()}
          </View>
          <View style={styles.wordmarkBlock}>
            <View style={styles.wordmarkRow}>
              <Text style={styles.wordmarkHack}>Hack</Text>
              <Text style={styles.wordmarkMty}>MTY</Text>
            </View>
            <LinearGradient
              colors={['transparent', '#f0d9b0', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.divider}
            />
          </View>

          {isInitializing ? (
            <View style={{ marginVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#f0d9b0" />
              <Text style={styles.initializingText}>Establishing secure reset session...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>Enter and confirm your new account password.</Text>
              <Controller
                control={control}
                name="password"
                rules={{
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters long',
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.fieldGroup, styles.fieldGroupFirst]}>
                    <StyledInput
                      variant="glass"
                      label="New Password"
                      placeholder="Enter new password"
                      textContentType="password"
                      onChangeText={onChange}
                      value={value}
                      error={errors.password?.message}
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                rules={{
                  required: 'Please confirm your password',
                  validate: (value) => value === passwordVal || 'Passwords do not match',
                }}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <StyledInput
                      variant="glass"
                      label="Confirm New Password"
                      placeholder="Confirm new password"
                      textContentType="password"
                      onChangeText={onChange}
                      value={value}
                      error={errors.confirmPassword?.message}
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  </View>
                )}
              />

              {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
              {statusMessage ? <Text style={styles.successMessage}>{statusMessage}</Text> : null}

              <PillButton
                variant="gradient"
                title={isSubmitting ? 'Saving...' : 'Save New Password'}
                onPress={handleSubmit(onSubmit)}
                additionalStyle={{ opacity: isSubmitting ? 0.7 : 1 }}
              />

              <SimpleTextLink
                text="Back to "
                accentText="Login"
                onPress={goToLogin}
                textStyle={{ fontSize: 13.5, fontWeight: '500', letterSpacing: 0, fontFamily: 'Montserrat' }}
              />
            </>
          )}
        </View>
    </ParallaxScrollView>
  )
}
