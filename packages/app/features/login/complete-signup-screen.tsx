'use client'

import { Text, View, useWindowDimensions, ActivityIndicator } from 'react-native'
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
import { FormCheckbox } from 'app/components/form-checkbox'
import { useForm, Controller } from "react-hook-form"
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { useTranslation } from 'app/i18n'

import { sanitizeName } from 'app/utils/sanitization'

type CompleteSignupValues = {
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
  agreeMLH: boolean
  subscribeMailingList: boolean
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowStyle: {
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 2,      
      },
      web: {
        filter: 'drop-shadow(0px 10px 8px rgba(0, 0, 0, 0.4))',
      }
    })
  },
  authError: {
    color: '#ff6554',
    textAlign: 'center',
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#D8B8FF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  }
})

export function CompleteSignupScreen() {
  const { t } = useTranslation()
  const { navigateTo } = useSmartNavigate()
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0)
  const [isWide, setIsWide] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const { width } = useWindowDimensions()
  const images = [rectoria, pavoreal, ciap, photo2024, skyview]

  const { control, handleSubmit, watch, formState: { errors } } = useForm<CompleteSignupValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      agreeMLH: false,
      subscribeMailingList: false,
    }
  })
  const password = watch("password")

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

  useEffect(() => {
    const parseUrlAndExchangeSession = async () => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        setIsInitializing(false)
        return
      }

      try {
        if (!isSupabaseConfigured) {
          setInvitedEmail('mock@example.com')
          setIsInitializing(false)
          return
        }

        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const hash = window.location.hash
        let hasSession = false

        // 1. Authorization Code Exchange
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          hasSession = true
        }

        // 2. Hash fragment access token exchange (e.g., #access_token=...&type=invite)
        if (!hasSession && hash) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (error) throw error
            hasSession = true
          }
        }

        // 3. Clean up the URL
        if (hasSession) {
          window.history.replaceState({}, document.title, window.location.pathname)
        }

        // 4. Asynchronous state verification
        let activeUser: any = null
        for (let i = 0; i < 6; i++) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            activeUser = user
            break
          }
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        if (activeUser?.email) {
          setInvitedEmail(activeUser.email)
        } else {
          setAuthError('No active invitation session found.')
        }
      } catch (err: any) {
        console.error('Failed to resolve session:', err)
        setAuthError(err.message || 'Invitation authorization failed.')
      } finally {
        setIsInitializing(false)
      }
    }

    parseUrlAndExchangeSession()
  }, [])

  const onSubmit = async (formData: CompleteSignupValues) => {
    if (!formData.agreeMLH) {
      setAuthError(t('auth.mlhRequired'))
      return
    }

    try {
      setIsSubmitting(true)
      setAuthError(null)

      if (!isSupabaseConfigured) {
        navigateTo('/')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAuthError('Authentication session not found. Please log in.')
        return
      }

      // 1. Update user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password
      })
      if (passwordError) throw passwordError

      // 2. Complete user profile updates
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: sanitizeName(formData.firstName),
          last_name: sanitizeName(formData.lastName),
          agree_mlh: formData.agreeMLH,
          subscribe_mailing_list: formData.subscribeMailingList,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      navigateTo('/')
    } catch (err: any) {
      console.error('Failed to complete onboarding signup:', err)
      setAuthError(err.message || 'Onboarding submission failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24
  const nameRowStyle = {
    flexDirection: isWide ? 'row' : 'column',
    gap: 12,
    width: '100%'
  } as const
  const nameFieldStyle = {
    flex: isWide ? 1 : undefined,
    width: '100%'
  } as const

  return (
    <ParallaxScrollView
      background={
        <Carrousel slideImages={images} mode="crossfade" />
      }
    >
      <View style={[styles.container, { paddingTop: topOffset }]}>
        <View style={styles.logoContainer}>
          {(() => {
            const logo = (
              <SolitoImage
                src={logoImage}
                width={120}
                height={120}
                alt="HackMTY Logo"
                style={styles.shadowStyle}
              />
            )
            return Platform.OS === 'web' ? (
              <LinearGradient
                colors={['#ff67f9', '#df4bf4', '#c2b75f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                {logo}
              </LinearGradient>
            ) : (
              logo
            )
          })()}
        </View>
      </View>

      {isInitializing ? (
        <View style={{ marginVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#c2b75f" />
          <Text style={{ color: '#D8B8FF', marginTop: 12 }}>{t('auth.establishingInviteSession')}</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', width: '80%', maxWidth: 600, gap: 16, paddingHorizontal: 20 }}>
          <View style={{ width: '100%', marginBottom: 8 }}>
            <Text style={styles.title}>{t('auth.acceptInvitation')}</Text>
            {invitedEmail ? (
              <Text style={styles.subtitle}>{t('auth.completeOnboarding', [invitedEmail])}</Text>
            ) : (
              <Text style={styles.subtitle}>{t('auth.enterProfileToJoin')}</Text>
            )}
          </View>

          <View style={nameRowStyle}>
            <View style={nameFieldStyle}>
              <Controller
                control={control}
                name="firstName"
                rules={{ required: t('auth.firstNameRequired') }}
                render={({ field: { onChange, value } }) => (
                  <StyledInput
                    label={t('auth.firstName')}
                    placeholder={t('auth.firstNamePlaceholder')}
                    textContentType="name"
                    additionalStyle={styles.shadowStyle}
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
                    label={t('auth.lastName')}
                    placeholder={t('auth.lastNamePlaceholder')}
                    textContentType="familyName"
                    additionalStyle={styles.shadowStyle}
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
            name="password"
            rules={{
              required: t('auth.passwordRequired'),
              minLength: {
                value: 6,
                message: t('auth.passwordMinLength'),
              },
            }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                label={t('auth.choosePassword')}
                placeholder={t('auth.passwordPlaceholder')}
                textContentType="password"
                additionalStyle={styles.shadowStyle}
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
              required: t('auth.confirmPasswordRequired'),
              validate: (value) => value === password || t('auth.passwordsDoNotMatch')
            }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                label={t('auth.confirmPassword')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                textContentType="password"
                additionalStyle={styles.shadowStyle}
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
                value={value}
                onValueChange={onChange}
                label={t('auth.mlhAgreement') + t('auth.mlhCodeOfConduct')}
                additionalStyle={styles.shadowStyle}
                error={errors.agreeMLH?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="subscribeMailingList"
            render={({ field: { onChange, value } }) => (
              <FormCheckbox
                value={value}
                onValueChange={onChange}
                label={t('auth.subscribeMailingList')}
                additionalStyle={styles.shadowStyle}
              />
            )}
          />

          {authError ? <Text style={styles.authError}>{authError}</Text> : null}

          <PillButton
            title={isSubmitting ? t('common.submitting') : t('auth.joinEvent')}
            onPress={handleSubmit(onSubmit)}
            additionalStyle={{ marginBottom: 10, opacity: isSubmitting ? 0.7 : 1 }}
          />

          <SimpleTextLink text={t('auth.backToLogin')} onPress={() => navigateTo('/login')} />
        </View>
      )}
    </ParallaxScrollView>
  )
}
