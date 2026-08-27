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
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Platform } from 'react-native'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import { StyledInput } from 'app/components/styled-input'
import { PillButton } from 'app/components/pill-button'
import { SimpleTextLink } from 'app/components/simple-text-link'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { Controller, useForm } from 'react-hook-form'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { sanitizeEmail } from 'app/utils/sanitization'
import { useTranslation } from 'app/i18n'
import { BlurTargetView, BlurView } from 'expo-blur';

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
        boxShadow:
          '0 30px 70px -18px rgba(0,0,0,.45), 0 4px 14px rgba(0,0,0,.15), inset 0 1.5px 1px rgba(255,255,255,.75), inset 0 -14px 26px -18px rgba(255,255,255,.2), inset 0 0 0 1px rgba(255,255,255,.1), 0 0 50px -8px rgba(240,217,176,.35)',
      } as any,
      native: {
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
  const { t } = useTranslation()
  const { navigateTo } = useSmartNavigate()
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const images = [rectoria, pavoreal, ciap, photo2024, skyview]
  const targetRef = useRef<View | null>(null);

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
      setStableHeaderHeight(headerHeight)
    }
  }, [headerHeight, stableHeaderHeight])

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24

  const goToLogin = () => navigateTo('/login')

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    if (isSubmitting) return

    setErrorMessage(null)
    setStatusMessage(null)
    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        setErrorMessage(t('auth.supabaseNotConfigured'))
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

      setStatusMessage(t('auth.recoverySent'))
    } catch {
      setErrorMessage('Unable to send recovery email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const background = (
    <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
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
    </BlurTargetView>
  )

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
      <BlurView style={styles.glassCard} blurTarget={targetRef} intensity={40} blurMethod="dimezisBlurView">
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
        <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: t('auth.emailRequired'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email',
            },
          }}
          render={({ field: { onChange, value } }) => (
            <View style={[styles.fieldGroup, styles.fieldGroupFirst]}>
              <StyledInput
                variant="glass"
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
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
          title={isSubmitting ? t('auth.sendingLink') : t('auth.sendRecoveryLink')}
          onPress={handleSubmit(onSubmit)}
          additionalStyle={{ opacity: isSubmitting ? 0.7 : 1 }}
        />

        <SimpleTextLink
          text={t('auth.alreadyHaveAccount')}
          accentText={t('auth.login')}
          onPress={goToLogin}
          textStyle={{ fontSize: 13.5, fontWeight: '500', letterSpacing: 0, fontFamily: 'Montserrat' }}
        />
      </BlurView>
    </ParallaxScrollView>
  )
}
