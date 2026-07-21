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

        // 1. If code exists, exchange code for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          hasSession = true
        } 
        // 2. If access_token hash parameter exists, set session manually
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

        if (activeUser?.email) {
          setInvitedEmail(activeUser.email)
        } else {
          setAuthError('No active invitation session found.')
        }
      } catch (err: any) {
        console.error('Failed to resolve session:', err)
        setAuthError(err.message || 'Verification link is expired or invalid.')
      } finally {
        setIsInitializing(false)
      }
    }

    parseUrlAndExchangeSession()
  }, [])

  const onSubmit = async (formData: CompleteSignupValues) => {
    if (isSubmitting) return
    setAuthError(null)
    setIsSubmitting(true)

    try {
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
  const nameFieldStyle = isWide ? { flex: 1 } : { width: '100%' as const }

  const background = (
    <>
      <Carrousel slideImages={images} />
      <LinearGradient
        colors={['rgba(29, 4, 31, 0.5)', 'rgba(55, 27, 58, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </>
  )

  return (
    <ParallaxScrollView
      background={background}
      style={{ backgroundColor: '#1d041f' }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 16,
        paddingTop: topOffset,
        paddingBottom: insets.bottom + 40,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        overflow: 'visible',
      }}
    >
      <View style={styles.container}>
        <View style={styles.shadowStyle}>
          {(() => {
            const ImageComponent = SolitoImage as any
            return (
              <ImageComponent
                src={logoImage}
                height={200}
                width={130}
                alt="The HackMTY Logo"
                contentFit="contain"
                resizeMode="contain"
              />
            )
          })()}
        </View>
      </View>

      {isInitializing ? (
        <View style={{ marginVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#c2b75f" />
          <Text style={{ color: '#D8B8FF', marginTop: 12 }}>Establishing secure invite session...</Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', width: '80%', maxWidth: 600, gap: 16, paddingHorizontal: 20 }}>
          <View style={{ width: '100%', marginBottom: 8 }}>
            <Text style={styles.title}>Accept Invitation</Text>
            {invitedEmail ? (
              <Text style={styles.subtitle}>Complete onboarding signup for {invitedEmail}</Text>
            ) : (
              <Text style={styles.subtitle}>Enter your profile information to join the event.</Text>
            )}
          </View>

          <View style={nameRowStyle}>
            <View style={nameFieldStyle}>
              <Controller
                control={control}
                name="firstName"
                rules={{ required: 'First name is required' }}
                render={({ field: { onChange, value } }) => (
                  <StyledInput
                    label="First Name"
                    placeholder="First name"
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
                rules={{ required: 'Last name is required' }}
                render={({ field: { onChange, value } }) => (
                  <StyledInput
                    label="Last Name"
                    placeholder="Last name"
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
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters long',
              },
            }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                label="Choose Password"
                placeholder="Enter password"
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
              required: 'Please confirm your password',
              validate: (value) => value === password || 'The passwords do not match'
            }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                label="Confirm Password"
                placeholder="Confirm password"
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
            rules={{ required: 'You must agree to the MLH Code of Conduct' }}
            render={({ field: { onChange, value } }) => (
              <FormCheckbox
                value={value}
                onValueChange={onChange}
                label="I agree to the MLH Code of Conduct"
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
                label="Subscribe to our mailing list to receive information about our next event"
                additionalStyle={styles.shadowStyle}
              />
            )}
          />

          {authError ? <Text style={styles.authError}>{authError}</Text> : null}

          <PillButton
            title={isSubmitting ? 'Submitting...' : 'Join Event'}
            onPress={handleSubmit(onSubmit)}
            additionalStyle={{ marginBottom: 10, opacity: isSubmitting ? 0.7 : 1 }}
          />

          <SimpleTextLink text="Back to Login" onPress={() => navigateTo('/login')} />
        </View>
      )}
    </ParallaxScrollView>
  )
}
