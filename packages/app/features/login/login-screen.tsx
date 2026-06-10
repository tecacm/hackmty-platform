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

type LoginFormValues = {
  email: string
  password: string
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    padding: 10,
    overflow: 'visible',
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
    color: '#ffd3d3',
    textAlign: 'center',
    fontWeight: '600',
  },
})

export function LoginScreen() {
  const { navigateTo } = useSmartNavigate();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const images = [rectoria, pavoreal, ciap, photo2024, skyview];
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (headerHeight > stableHeaderHeight) {
      setStableHeaderHeight(headerHeight);
    }
  }, [headerHeight, stableHeaderHeight]);

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24;

  const goToRegister = () => navigateTo('/register')

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    if (isSubmitting) return

    setAuthError(null)
    setIsSubmitting(true)

    try {
      if (!isSupabaseConfigured) {
        setAuthError('Supabase is not configured for this environment.')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setAuthError(error.message || 'Invalid email or password.')
        return
      }

      navigateTo('/home')
    } catch {
      setAuthError('Unable to log in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
  );

  return (
    <ParallaxScrollView
      background={background}
      style={{ backgroundColor: '#1d041f' }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 16,
        paddingTop: topOffset,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        overflow: 'visible',
      }}
    >
        <View style={styles.container}>
          <View style={styles.shadowStyle}>
            <SolitoImage
              src={logoImage}
              height={300}
              width={200}
              alt={"The HackMTY Logo"}
              contentFit="contain"
              resizeMode="contain"
            />
          </View>
        </View>
        <View style={{ alignItems: 'center', width: '80%', maxWidth: 600, gap: 16, paddingTop: 12, paddingHorizontal: 20 }}>
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
              <StyledInput
                label="Email Address"
                placeholder="Enter your email"
                textContentType="emailAddress"
                keyboardType="email-address"
                additionalStyle={styles.shadowStyle}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field: { onChange, value } }) => (
              <StyledInput
                label="Password"
                placeholder="Enter your password"
                textContentType="password"
                additionalStyle={{ marginBottom: 10, ...styles.shadowStyle }}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />
          {authError ? <Text style={styles.authError}>{authError}</Text> : null}
          <PillButton
            title={isSubmitting ? 'Logging in...' : 'Login'}
            onPress={handleSubmit(onSubmit)}
            additionalStyle={{ marginBottom: 10, opacity: isSubmitting ? 0.7 : 1 }}
          />
          <SimpleTextLink text="Don't have an account? Sign Up" onPress={goToRegister}/>
          <SimpleTextLink text="Forgot your password?" onPress={() => {}}/>
        </View>
    </ParallaxScrollView>
  )
}
