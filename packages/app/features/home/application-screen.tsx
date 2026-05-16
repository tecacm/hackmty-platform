'use client'

import { Dimensions, Text, View, useWindowDimensions } from 'react-native'
import { SolitoImage } from 'solito/image'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { useEffect, useState, useLayoutEffect } from 'react'
import { StyleSheet, Platform } from 'react-native'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import { useSearchParams } from 'solito/navigation'
import { ApplicantForm } from 'app/features/applicant/ApplicantForm'
import { ApplicantRole } from 'app/features/applicant/applicant-types'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
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

type ApplicationScreenProps = {
  navigation?: any
  role?: ApplicantRole
}

export function ApplicationScreen({ navigation, role }: ApplicationScreenProps = {}) {
  const params = useSearchParams()
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [isHydrated, setIsHydrated] = useState(false);
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const roleFromParams = role ?? params?.get('role')
  const applicantRole: ApplicantRole = roleFromParams ?? ''
  const applicantRoleLabel = getApplicantRoleLabel(applicantRole)

  const onSubmit = (data: unknown) => {
    console.log("Hackathon Registration Data:", data)
    // Send to Supabase/Firebase/Auth0
  }

  useEffect(() => {
    setIsHydrated(true)
  }, [])

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

  const topOffset = Math.max(stableHeaderHeight, insets.top);
  useLayoutEffect(() => {
    if (navigation && typeof (navigation as any).setOptions === 'function') {
      ;(navigation as any).setOptions({ title: `Applying as ${applicantRoleLabel}` })
    }
  }, [navigation, applicantRoleLabel])

  const intrinsicWidth = (numbersbg as any)?.width ?? 1920
  const intrinsicHeight = (numbersbg as any)?.height ?? 1080
  const backgroundWidth = isHydrated && width > 0 ? width : intrinsicWidth
  const backgroundHeight = isHydrated && height > 0 ? height : intrinsicHeight
  const backgroundImageProps: any = {
    src: numbersbg,
    width: backgroundWidth,
    height: backgroundHeight,
    contentFit: 'cover',
    resizeMode: 'cover',
    transition: 0,
    onLayout: () => {},
    alt: 'Abstract numbers background',
  }

  const background = (
    <>
      <SolitoImage {...backgroundImageProps} />
    </>
  );

  return (
    <ParallaxScrollView
      background={background}
      style={{ backgroundColor: '#5a0061cc' }}
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
        <View style={[styles.container, { width: '90%', maxWidth: 1000 }]}>
          <ApplicantForm
            role={applicantRole}
            onSubmit={(data) => {
              console.log('Hacker application submitted', data)
            }}
          />
        </View>          
    </ParallaxScrollView>
  )
}
