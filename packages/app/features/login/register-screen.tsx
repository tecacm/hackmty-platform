'use client'

import { TextLink } from 'solito/link'
import { Text, View, useWindowDimensions, Modal } from 'react-native'
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
import { FormCheckbox } from 'app/components/form-checkbox'
import { useForm, Controller } from "react-hook-form"
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { ConfettiOverlay } from 'app/components/confetti-overlay'
import { sanitizeEmail, sanitizeName } from 'app/utils/sanitization'
import { useTranslation } from 'app/i18n'
import { BlurTargetView, BlurView } from 'expo-blur';

const styles = StyleSheet.create({
  glassCard: {
    position: 'relative',
    width: 760,
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
  fieldGroup: {
    width: '100%',
    gap: 6,
  },
  fieldGroupFirst: {
    marginTop: 4,
  },
  mlhLabel: {
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  authError: {
    color: '#ff6554',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
})

type RegisterFormValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  agreeMLH: boolean
  subscribeMailingList: boolean
}

export function RegisterScreen() {
  const { t } = useTranslation()
  const { navigateTo } = useSmartNavigate()
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0)
  const [isWide, setIsWide] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { width } = useWindowDimensions()
  const [authError, setAuthError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const images = [rectoria, pavoreal, ciap, photo2024, skyview]
  const targetRef = useRef<View | null>(null);
  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeMLH: false,
      subscribeMailingList: false,
    }
  })
  const password = watch("password")

  const onSubmit = async (formData: RegisterFormValues) => {
    if (isSubmitting) return

    setAuthError(null)
    setIsSubmitting(true)
    let shouldNavigate = false

    try {
      if (!isSupabaseConfigured) {
        setAuthError(t('auth.supabaseNotConfigured'))
        return
      }

      const cleanEmail = sanitizeEmail(formData.email)
      const cleanFirstName = sanitizeName(formData.firstName)
      const cleanLastName = sanitizeName(formData.lastName)

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            agree_mlh: formData.agreeMLH,
            subscribe_mailing_list: formData.subscribeMailingList,
          },
        },
      })

      if (error) {
        setAuthError(error.message || 'Invalid sign up data.')
        return
      }

      if (data.user?.identities?.length === 0) {
        setAuthError(t('auth.duplicateAccountError'))
        return
      }

      shouldNavigate = true
    } catch (err: any) {
      if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        return
      }
      console.error('Registration error:', err)
      setAuthError(err?.message || 'Unable to sign up. Please try again.')
    } finally {
      setIsSubmitting(false)
    }

    if (shouldNavigate) {
      setShowConfetti(true)
      setShowSuccessModal(true)
    }
  }

  useEffect(() => {
    if (headerHeight > stableHeaderHeight) {
      setStableHeaderHeight(headerHeight)
    }
  }, [headerHeight, stableHeaderHeight])

  useEffect(() => {
    if (width > 0) {
      setIsWide(width >= 520)
    }
  }, [width])

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24
  const nameRowStyle = {
    flexDirection: isWide ? 'row' : 'column',
    gap: 12,
    width: '100%'
  } as const
  const nameFieldStyle = isWide ? { flex: 1 } : { width: '100%' as const }

  const goToLogin = () => navigateTo('/login')

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
        <View style={{ width: '100%', gap: 13, marginTop: 4 }}>
          <View style={nameRowStyle}>
            <View style={nameFieldStyle}>
              <Controller
                control={control}
                name="firstName"
                rules={{ required: t('auth.firstNameRequired') }}
                render={({ field: { onChange, value } }) => (
                  <StyledInput
                    variant="glass"
                    label={t('auth.firstName')}
                    placeholder={t('auth.firstNamePlaceholder')}
                    textContentType="name"
                    onChangeText={onChange}
                    value={value}
                    error={errors.firstName?.message}
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
            </View>
            <View style={nameFieldStyle}>
              <Controller
                control={control}
                name="lastName"
                rules={{ required: t('auth.lastNameRequired') }}
                render={({ field: { onChange, value } }) => (
                  <StyledInput
                    variant="glass"
                    label={t('auth.lastName')}
                    placeholder={t('auth.lastNamePlaceholder')}
                    textContentType="familyName"
                    onChangeText={onChange}
                    value={value}
                    error={errors.lastName?.message}
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="email"
            rules={{
              required: t('auth.emailRequired'),
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
            }}
            render={({ field: { onChange, value } }) => (
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
            )}
          />
          <Controller
            control={control}
            name="password"
            rules={{
              required: t('auth.passwordRequired'),
              minLength: {
                value: 6,
                message: t('auth.passwordMinLength')
              }
            }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                variant="glass"
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                textContentType="password"
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: t('auth.passwordRequired'),
              validate: (value) => value === password || t('auth.passwordsDoNotMatch')
            }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                variant="glass"
                label={t('auth.confirmPassword')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                textContentType="password"
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
                onSubmitEditing={handleSubmit(onSubmit)}
              />
            )}
          />
          <Controller
            control={control}
            name="agreeMLH"
            rules={{ required: t('auth.mlhRequired') }}
            render={({ field: { onChange, value } }) => (
              <FormCheckbox
                variant="glass"
                value={value}
                onValueChange={onChange}
                label={
                  <Text style={styles.mlhLabel}>
                    {t('auth.mlhAgreement')}
                    <TextLink href="https://mlh.io/code-of-conduct" style={{ color: '#f0d9b0', textDecorationLine: 'underline' }}>
                      {t('auth.mlhCodeOfConduct')}
                    </TextLink>
                  </Text>
                }
                error={errors.agreeMLH?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="subscribeMailingList"
            render={({ field: { onChange, value } }) => (
              <FormCheckbox
                variant="glass"
                value={value}
                onValueChange={onChange}
                label={t('auth.subscribeMailingList')}
              />
            )}
          />
          {authError ? <Text style={styles.authError}>{authError}</Text> : null}
          <PillButton
            variant="gradient"
            title={isSubmitting ? t('auth.registering') : t('auth.register')}
            isLoading={isSubmitting}
            onPress={isSubmitting ? undefined : handleSubmit(onSubmit)}
            additionalStyle={{ opacity: isSubmitting ? 0.7 : 1 }}
          />
          <SimpleTextLink
            text={t('auth.alreadyHaveAccount')}
            accentText={t('auth.login')}
            onPress={goToLogin}
            textStyle={{ fontSize: 13.5, fontWeight: '500', letterSpacing: 0, fontFamily: 'Montserrat' }}
          />
        </View>
      </BlurView>

      <ConfettiOverlay active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Modal: Registration Confirmation Success Modal */}
      {showSuccessModal && (
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowSuccessModal(false)
            navigateTo('/login')
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{
              backgroundColor: '#1b0026',
              borderRadius: 28,
              borderWidth: 1.5,
              borderColor: 'rgba(194, 183, 95, 0.45)',
              padding: 30,
              width: '100%',
              maxWidth: 440,
              alignItems: 'center',
              gap: 16,
              ...Platform.select({
                web: {
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(90,0,97,0.3)',
                } as any,
              }),
            }}>
              <Text style={{ fontSize: 42 }}>🎉</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#ffffff', textAlign: 'center', letterSpacing: -0.3, fontFamily: 'Montserrat' }}>
                {t('auth.accountCreated')}
              </Text>
              <Text style={{ fontSize: 14, color: '#e2e8f0', textAlign: 'center', lineHeight: 22, fontFamily: 'Montserrat' }}>
                {t('auth.confirmEmailNotice')}
              </Text>
              <PillButton
                title={t('auth.okGoToLogin')}
                variant="gradient"
                onPress={() => {
                  setShowSuccessModal(false)
                  navigateTo('/login')
                }}
                additionalStyle={{ width: '100%', height: 46, marginTop: 8 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </ParallaxScrollView>
  )
}
