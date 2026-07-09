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

type ResetPasswordValues = {
  password: string
  confirmPassword: string
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
    color: '#ffd3d3',
    textAlign: 'center',
    fontWeight: '600',
  },
  successMessage: {
    color: '#c5ffd3',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
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

export function ResetPasswordScreen() {
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

      // Supabase auto-authenticates the user when they click the email recovery link and redirect back to this page.
      // So calling updateUser directly updates their password on their active session.
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

      <View style={{ width: '80%', maxWidth: 600, paddingHorizontal: 20 }}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter and confirm your new account password.</Text>
      </View>

      <View style={{ alignItems: 'center', width: '80%', maxWidth: 600, gap: 16, paddingHorizontal: 20 }}>
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
              label="New Password"
              placeholder="Enter new password"
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
            validate: (value) => value === passwordVal || 'Passwords do not match',
          }}
          render={({ field: { onChange, value } }) => (
            <StyledInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              textContentType="password"
              additionalStyle={styles.shadowStyle}
              onChangeText={onChange}
              value={value}
              error={errors.confirmPassword?.message}
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />
        
        {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}
        {statusMessage ? <Text style={styles.successMessage}>{statusMessage}</Text> : null}

        <PillButton
          title={isSubmitting ? 'Saving...' : 'Save New Password'}
          onPress={handleSubmit(onSubmit)}
          additionalStyle={{ marginBottom: 10, opacity: isSubmitting ? 0.7 : 1 }}
        />
        
        <SimpleTextLink text="Back to Login" onPress={goToLogin}/>
      </View>
    </ParallaxScrollView>
  )
}
