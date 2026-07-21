'use client'

import { TextLink } from 'solito/link'
import { Text, View, useWindowDimensions } from 'react-native'
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

import { sanitizeEmail, sanitizeName } from 'app/utils/sanitization'

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
  const { navigateTo } = useSmartNavigate();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width } = useWindowDimensions();
  const [authError, setAuthError] = useState<string | null>(null);
  const images = [rectoria, pavoreal, ciap, photo2024, skyview];
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
        setAuthError('Supabase is not configured for this environment.')
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
      navigateTo('/login')
    }
  }

  useEffect(() => {
    if (headerHeight > stableHeaderHeight) {
      setStableHeaderHeight(headerHeight);
    }
  }, [headerHeight, stableHeaderHeight]);

  useEffect(() => {
    if (width > 0) {
      setIsWide(width >= 520);
    }
  }, [width]);

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24;
  const nameRowStyle = {
    flexDirection: isWide ? 'row' : 'column',
    gap: 12,
    width: '100%'
  } as const;
  const nameFieldStyle = isWide ? { flex: 1 } : { width: '100%' as const };

  const goToLogin = () => navigateTo('/login')

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
          <View style={{ width: '100%', gap: 13, marginTop: 4 }}>
            <View style={nameRowStyle}>
              <View style={nameFieldStyle}>
                <Controller
                  control={control}
                  name="firstName"
                  rules={{ required: 'First name is required' }}
                  render={({ field: { onChange, value } }) => (
                    <StyledInput variant="glass" label="First Name" placeholder="Enter your first name" textContentType={"name"} onChangeText={onChange} value={value} error={errors.firstName?.message} onSubmitEditing={handleSubmit(onSubmit)}/>
                  )}
                />
              </View>
              <View style={nameFieldStyle}>
                <Controller
                  control={control}
                  name="lastName"
                  rules={{ required: 'Last name is required' }}
                  render={({ field: { onChange, value } }) => (
                    <StyledInput variant="glass" label="Last Name" placeholder="Enter your last name" textContentType={"familyName"} onChangeText={onChange} value={value} error={errors.lastName?.message} onSubmitEditing={handleSubmit(onSubmit)}/>
                  )}
                />
              </View>
            </View>
            <Controller
              control={control}
              name="email"
              rules={{ required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } }}
              render={({ field: { onChange, value } }) => (
                  <StyledInput variant="glass" label="Email Address" placeholder="Enter your email" textContentType={"emailAddress"} keyboardType="email-address" onChangeText={onChange} value={value} error={errors.email?.message} onSubmitEditing={handleSubmit(onSubmit)}/>
              )}
            />
            <Controller
              control={control}
              name="password"
              rules={{ required: 'Password is required' }}
              render={({ field: { onChange, value } }) => (
                  <StyledInput variant="glass" label="Password" placeholder="Enter your password" textContentType={"password"} onChangeText={onChange} value={value} error={errors.password?.message} onSubmitEditing={handleSubmit(onSubmit)}/>
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: 'Please confirm your password' ,
                validate: (value) => value === password || 'The passwords do not match'
              }}
              render={({ field: { onChange, value } }) => (
                  <StyledInput variant="glass" label="Confirm Password" placeholder="Confirm your password" textContentType={"password"} onChangeText={onChange} value={value} error={errors.confirmPassword?.message} onSubmitEditing={handleSubmit(onSubmit)}/>
              )}
            />
            <Controller
              control={control}
              name="agreeMLH"
              rules={{ required: 'You must agree to the MLH Code of Conduct' }}
              render={({ field: { onChange, value } }) => (
                <FormCheckbox
                  variant="glass"
                  value={value}
                  onValueChange={onChange}
                  label={
                    <Text style={styles.mlhLabel}>
                      I agree to the{' '}
                      <TextLink href="https://mlh.io/code-of-conduct" style={{ color: '#f0d9b0', textDecorationLine: 'underline' }}>
                        MLH Code of Conduct
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
                  label="Subscribe to our mailing list to receive information about our next event"
                />
              )}
            />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <PillButton
              variant="gradient"
              title={isSubmitting ? 'Registering...' : 'Register'}
              isLoading={isSubmitting}
              onPress={isSubmitting ? undefined : handleSubmit(onSubmit)}
              additionalStyle={{ opacity: isSubmitting ? 0.7 : 1 }}
            />
            <SimpleTextLink
              text="Already have an account? "
              accentText="Login"
              onPress={goToLogin}
              textStyle={{ fontSize: 13.5, fontWeight: '500', letterSpacing: 0, fontFamily: 'Montserrat' }}
            />
          </View>
        </View>
    </ParallaxScrollView>
  )
}
