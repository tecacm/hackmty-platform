'use client'

import { Text, View } from 'react-native'
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

import { sanitizeEmail } from 'app/utils/sanitization'

type ForgotPasswordValues = {
  email: string
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
    color: '#ff6554',
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
})

export function ForgotPasswordScreen() {
  const { navigateTo } = useSmartNavigate();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const images = [rectoria, pavoreal, ciap, photo2024, skyview];

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    defaultValues: {
      email: '',
    },
  })

  useEffect(() => {
    if (headerHeight > stableHeaderHeight) {
      setStableHeaderHeight(headerHeight);
    }
  }, [headerHeight, stableHeaderHeight]);

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24;

  const goToLogin = () => navigateTo('/login')

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    if (isSubmitting) return

    setErrorMessage(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        setErrorMessage('Supabase is not configured for this environment.')
        return
      }

      // Determine redirect URL based on environment (web vs native deep links)
      let redirectTo = 'https://hackmty.com/reset-password'
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        redirectTo = `${window.location.origin}/reset-password`
      }

      const { error } = await supabase.auth.resetPasswordForEmail(sanitizeEmail(email), {
        redirectTo,
      })

      if (error) {
        setErrorMessage(error.message || 'Failed to send recovery email.')
        return
      }

      setStatusMessage('Password recovery link has been sent to your email!')
    } catch {
      setErrorMessage('Unable to send recovery email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={{ flex: 1, position: 'relative', width: '100%' }}>
      {/* Root-level fixed carousel & dark overlay */}
      <Carrousel slideImages={images} mode="crossfade" />
      <LinearGradient
        colors={['rgba(20, 10, 40, 0.35)', 'rgba(20, 10, 40, 0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: Platform.OS === 'web' ? 'fixed' : 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: Platform.OS === 'web' ? -200 : 0,
          height: Platform.OS === 'web' ? ('calc(100vh + 200px)' as any) : '100%',
        }}
      />

      <ParallaxScrollView
        background={null}
        style={{ backgroundColor: 'transparent' }}
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
          <Text style={styles.subtitle}>Enter your email address to receive a link to reset your password.</Text>
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email',
              },
            }}
            render={({ field: { onChange, value } }) => (
              <View style={[styles.fieldGroup, styles.fieldGroupFirst]}>
                <StyledInput
                  variant="glass"
                  label="Email Address"
                  placeholder="Enter your email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              </View>
            )}
          />

          {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
          {statusMessage ? <Text style={styles.successMessage}>{statusMessage}</Text> : null}

          <PillButton
            variant="gradient"
            title={isSubmitting ? 'Sending link...' : 'Send Recovery Link'}
            onPress={handleSubmit(onSubmit)}
            additionalStyle={{ opacity: isSubmitting ? 0.7 : 1 }}
          />

          <SimpleTextLink
            text="Back to "
            accentText="Login"
            onPress={goToLogin}
            textStyle={{ fontSize: 13.5, fontWeight: '500', letterSpacing: 0, fontFamily: 'Montserrat' }}
          />
        </View>
      </ParallaxScrollView>
    </View>
  )
}
