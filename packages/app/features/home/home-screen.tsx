'use client'

import { Dimensions, Text, View, useWindowDimensions } from 'react-native'
import { SolitoImage } from 'solito/image'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { useEffect, useState } from 'react'
import { StyleSheet, Platform } from 'react-native'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import { PillButton } from 'app/components/pill-button'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import numbersbg from 'app/assets/images/numbers-bg.webp'
import { getApplicationTypes, getApplicantFieldsForRole, getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
import { formFieldColors, formFieldStyles } from 'app/components/form-field-styles'


const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 1000,
    gap: 16,
    marginVertical: 24,
    backgroundColor: "#f4f4f4",
    ...Platform.OS === 'web' ? { 
        paddingVertical: 40,
        paddingHorizontal: 40,
    } : {
      paddingHorizontal: 20,
      paddingVertical: 30, 
    },   
    borderRadius: 24,
  },
  heading: {
    color: formFieldColors.theme,
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 10,
  },
  roleList: {
    width: '100%',
    gap: 14,
    marginTop: 12,
  },
  shadow: {
     ...Platform.select({
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      },
      web: {
        textShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      }
    })
  },
  roleCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    ...Platform.select({
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      },
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  roleCardHeader: {
    gap: 6,
  },
  roleCardLabel: {
    color: '#28002d',
    fontSize: 24,
    fontWeight: '700',
  },
  roleCardMeta: {
    color: '#5b4d61',
    fontSize: 15,
    lineHeight: 22,
  },
  roleCardCount: {
    color: formFieldColors.theme,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  container: {
    overflow: 'visible', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleButton: {
    width: '100%',
  },
})

export function HomeScreen() {
  const { navigateTo } = useSmartNavigate();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [isHydrated, setIsHydrated] = useState(false);
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  const applicationTypes = getApplicationTypes()

  const handleApply = (role: string) => {
    navigateTo({
      pathname: '/application',
      query: { role },
    })
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
        paddingTop: insets.top+40,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        overflow: 'visible',
      }}
    >
        <View style={[styles.container, { width: '90%', maxWidth: 1000 }]}>
          <View style={styles.contentContainer}>
            <Text style={[styles.heading, styles.shadow]}>Application Types</Text>
            <Text style={formFieldStyles.label}>Choose the role that matches your profile and continue to the application for that track.</Text>

            <View style={styles.roleList}>
              {applicationTypes.map((applicationType) => {
                const fieldCount = getApplicantFieldsForRole(applicationType.id).length
                const applicantRoleLabel = getApplicantRoleLabel(applicationType.id)

                return (
                  <View key={applicationType.id} style={styles.roleCard}>
                    <View style={styles.roleCardHeader}>
                      <Text style={styles.roleCardCount}>{fieldCount} questions</Text>
                      <Text style={styles.roleCardLabel}>{applicationType.label}</Text>
                      <Text style={styles.roleCardMeta}>The application is tailored for {applicantRoleLabel.toLowerCase()} applicants.</Text>
                    </View>
                    <PillButton
                      title={`Apply as ${applicationType.label}`}
                      onPress={() => handleApply(applicationType.id)}
                      additionalStyle={styles.roleButton}
                    />
                  </View>
                )
              })}
            </View>
          </View>
        </View>          
    </ParallaxScrollView>
  )
}
