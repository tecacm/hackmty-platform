'use client'

import { TextLink } from 'solito/link'
import { Button, Dimensions, Text, View, useWindowDimensions } from 'react-native'
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
import { ApplicantForm } from 'app/features/applicant/ApplicantForm'
import numbersbg from 'app/assets/images/numbers-bg.webp'

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
        filter: 'drop-shadow(0px 5px 8px rgba(0, 0, 0, 0.4))',
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
  const [height, setHeight] = useState(0);

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
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const update = () => {
          setHeight(window.innerHeight);
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        return () => {
          window.removeEventListener('resize', update);
          window.removeEventListener('orientationchange', update);
        };
      } else {
        const update = () => {
          const { width: w, height: h } = Dimensions.get('screen');
          setHeight(h);
        };
        update();
        const sub = Dimensions.addEventListener('change', update);
        return () => sub?.remove();
      }
  }, []);

  useEffect(() => {
    if (width > 0) {
      setIsWide(width >= 520);
    }
  }, [width]);

  const topOffset = Math.max(stableHeaderHeight, insets.top) + 24;
  const goToLogin = () => navigateTo('/login')

  const background = (
    <>
      <SolitoImage
          src={numbersbg}
          width={width}
          height={height}
          contentFit="cover"
          resizeMode="cover"
          transition={0}
          onLayout={() => {}}
          alt="Abstract numbers background"
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
        <View style={[styles.container, { width: '80%', maxWidth: 1000 }]}>
          <ApplicantForm
            role="sponsor"
            onSubmit={(data) => {
              console.log('Hacker application submitted', data)
            }}
          />
        </View>          
    </ParallaxScrollView>
  )
}
