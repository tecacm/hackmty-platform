'use client'

import { TextLink } from 'solito/link'
import { Button, Text, View, useWindowDimensions } from 'react-native'
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
})

export function HomeScreen() {
  const { navigateTo } = useSmartNavigate();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const { width } = useWindowDimensions();
  const images = [rectoria, pavoreal, ciap, photo2024, skyview];
  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      confirmPassword: '',
      agreeMLH: false,
      subscribeMailingList: false,
    }
  })

  const onSubmit = (data) => {
    console.log("Hackathon Registration Data:", data)
    // Send to Supabase/Firebase/Auth0
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
      <LinearGradient
        colors={['rgba(29, 4, 31, 1.0)', 'rgba(55, 27, 58, 1.0)']}
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
            <Text style={{ color: '#FFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center' }}>
              Apply as Hacker
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', width: '80%', maxWidth: 1000, gap: 16, paddingTop: 12, paddingHorizontal: 20 }}>
          <View style={nameRowStyle}>
              <View style={nameFieldStyle}>
                <Controller
                  control={control}
                  name="firstName"
                  rules={{ required: 'First name is required' }}
                  render={({ field: { onChange, value } }) => (
                    <StyledInput label="First Name" placeholder="Enter your first name" textContentType={"name"} additionalStyle={styles.shadowStyle} onChangeText={onChange} value={value} error={errors.firstName?.message}/>
                  )}
                />
              </View>
              <View style={nameFieldStyle}>
                <Controller
                  control={control}
                  name="lastName"
                  rules={{ required: 'Last name is required' }}
                  render={({ field: { onChange, value } }) => (
                    <StyledInput label="Last Name" placeholder="Enter your last name" textContentType={"familyName"} additionalStyle={styles.shadowStyle} onChangeText={onChange} value={value} error={errors.lastName?.message}/>
                  )}
                />
              </View>
          </View>
          <View style={nameRowStyle}>
              <View style={nameFieldStyle}>
                 <Controller
                    control={control}
                    name="email"
                    rules={{ required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } }}
                    render={({ field: { onChange, value } }) => (
                        <StyledInput label="Email Address" placeholder="Enter your email" textContentType={"emailAddress"} additionalStyle={styles.shadowStyle} onChangeText={onChange} value={value} error={errors.email?.message}/>
                    )}
                  />
              </View>
              <View style={nameFieldStyle}>
                <Controller
                  control={control}
                  name="phone"
                  rules={{ required: 'Phone number is required' }}
                  render={({ field: { onChange, value } }) => (
                    <StyledInput
                      label="Phone Number"
                      placeholder="+########"
                      subtitle="Phone number must be entered in the format: +#########. Up to 15 digits allowed."
                      textContentType={"telephoneNumber"}
                      additionalStyle={styles.shadowStyle}                    
                      onChangeText={onChange}
                      value={value}
                      error={errors.phone?.message}
                    />
                  )}
                />
              </View>
          </View>                   
          <Controller
            control={control}
            name="agreeMLH"
            rules={{ required: 'You must agree to the MLH Code of Conduct' }}
            render={({ field: { onChange, value } }) => (
              <FormCheckbox 
                value={value} 
                onValueChange={onChange}
                label={
                  <Text style={{ color: '#FFF' }}>
                    I agree to the{' '}
                    <TextLink href="https://mlh.io/code-of-conduct" style={{ color: '#c2b75f', textDecorationLine: 'underline' }}>
                      MLH Code of Conduct
                    </TextLink>
                  </Text>
                } 
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
          <PillButton title="Register" onPress={handleSubmit(onSubmit)} additionalStyle={{marginBottom: '10'}} />
          <SimpleTextLink text="Already have an account? Login" onPress={goToLogin}/>
        </View>
    </ParallaxScrollView>
  )
}
