'use client'

import { Dimensions, Text, View, useWindowDimensions, ActivityIndicator } from 'react-native'
import { WebNavbar } from 'app/components/web-navbar'
import { SolitoImage } from 'solito/image'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { useEffect, useState } from 'react'
import { StyleSheet, Platform } from 'react-native'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import { PillButton } from 'app/components/pill-button'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import numbersbg from 'app/assets/images/numbers-bg.webp'
import { getApplicationTypes, getApplicantFieldsForRole, getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
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
  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.12)',
    marginVertical: 32,
  },
  heading: {
    color: formFieldColors.theme,
    fontSize: 30,
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
    fontSize: 14,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})

export function HomeScreen() {
  const { navigateTo, replaceTo } = useSmartNavigate();
  const { hasPermission } = useUserPermissions();
  const insets = useSafeArea();
  const headerHeight = useHeaderHeightSafe();
  const [isHydrated, setIsHydrated] = useState(false);
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  
  const [rolesList, setRolesList] = useState<Array<{ id: string; label: string; fieldCount: number; closeAt: string | null }>>([])
  const [userApps, setUserApps] = useState<Array<{ application_type_id: string; status: string }>>([])
  const [isRolesLoading, setIsRolesLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const handleApply = (role: string) => {
    const isExisting = userApps.some(app => app.application_type_id === role)
    if (!isExisting && !hasPermission('applications', 'create')) {
      return
    }

    navigateTo({
      pathname: '/application',
      query: { role },
    })
  }

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function loadRoles() {
      setIsRolesLoading(true)
      
      if (!isSupabaseConfigured) {
        const staticTypes = getApplicationTypes()
        const items = staticTypes.map(t => ({
          id: t.id,
          label: t.label,
          fieldCount: getApplicantFieldsForRole(t.id).length,
          closeAt: t.close_at || null
        }))
        setRolesList(items)
        setIsRolesLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          replaceTo('/login')
          return
        }

        const { data: types, error: typesError } = await supabase
          .from('application_types')
          .select('id, label, close_at')
        
        if (typesError) throw typesError

        const { data: relations, error: relError } = await supabase
          .from('application_type_fields')
          .select('application_type_id, field_id')

        if (relError) throw relError

        const countsMap: Record<string, number> = {}
        relations?.forEach(r => {
          countsMap[r.application_type_id] = (countsMap[r.application_type_id] || 0) + 1
        })

        const getVal = (val: any) => {
          if (!val) return ''
          if (typeof val === 'object') return val.en || val
          return val
        }

        const items = (types || []).map(t => ({
          id: t.id,
          label: getVal(t.label),
          fieldCount: countsMap[t.id] || 0,
          closeAt: t.close_at || null
        }))
        setRolesList(items)

        // Query user's applications to show status (draft/submitted)
        const { data: apps } = await supabase
            .from('applications')
            .select('application_type_id, status')
            .eq('user_id', user.id)
        if (apps) {
          setUserApps(apps)
        }
      } catch (err) {
        console.error('Failed to load dynamic roles, falling back to static config:', err)
        const staticTypes = getApplicationTypes()
        const items = staticTypes.map(t => ({
          id: t.id,
          label: t.label,
          fieldCount: getApplicantFieldsForRole(t.id).length,
          closeAt: t.close_at || null
        }))
        setRolesList(items)
      } finally {
        setIsRolesLoading(false)
      }
    }

    loadRoles()
  }, [])

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
  const draftApps = userApps.filter(app => app.status === 'draft')
  const submittedApps = userApps.filter(app => app.status === 'submitted')
  const activeRoleIds = userApps.map(app => app.application_type_id)
  const availableRoles = rolesList.filter(role => !activeRoleIds.includes(role.id))

  const getRoleLabel = (roleId: string) => {
    const found = rolesList.find(r => r.id === roleId)
    return found ? found.label : roleId.charAt(0).toUpperCase() + roleId.slice(1)
  }

  const getRoleCloseAt = (roleId: string): string | null => {
    const found = rolesList.find(r => r.id === roleId)
    return found ? found.closeAt : null
  }

  const getCountdownText = (closeAtStr: string | null): { text: string; isClosed: boolean } => {
    if (!closeAtStr) return { text: '', isClosed: false }

    const deadline = new Date(closeAtStr).getTime()
    const now = Date.now()
    const diff = deadline - now

    if (diff <= 0) {
      return { text: 'Registration Closed', isClosed: true }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    const parts: string[] = []
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`)

    return {
      text: `Closes in ${parts.join(', ')}`,
      isClosed: false
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: '#f3e8ff' }
      case 'submitted':
        return { backgroundColor: '#ecfeff' }
      case 'accepted':
        return { backgroundColor: '#f0fdf4' }
      default:
        return { backgroundColor: '#f1f5f9' }
    }
  }

  const getStatusBadgeTextStyle = (status: string) => {
    switch (status) {
      case 'draft':
        return { color: '#7e22ce' }
      case 'submitted':
        return { color: '#0e7490' }
      case 'accepted':
        return { color: '#15803d' }
      default:
        return { color: '#475569' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'submitted':
        return 'Under Review'
      case 'accepted':
        return 'Accepted'
      default:
        return status
    }
  }

  return (
    <>
      <WebNavbar />
      <ParallaxScrollView
        background={background}
        style={{ backgroundColor: '#5a0061cc' }}
        contentContainerStyle={{
          alignItems: 'center',
          gap: 24,
          paddingTop: Platform.OS === 'web' ? 104 : insets.top,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          overflow: 'visible',
        }}
      >
        <View style={[styles.container, { width: '90%', maxWidth: 1000 }]}>
          <View style={styles.contentContainer}>
            
            {/* Drafts Section */}
            {draftApps.length > 0 && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.heading, styles.shadow]}>Drafts</Text>
                <Text style={formFieldStyles.label}>
                  You have started these applications. Click continue to finish them before the deadline.
                </Text>
                <View style={styles.roleList}>
                  {draftApps.map((app) => {
                    const applicantRoleLabel = getApplicantRoleLabel(app.application_type_id)
                    const closeAt = getRoleCloseAt(app.application_type_id)
                    const { text: countdownText, isClosed } = getCountdownText(closeAt)

                    return (
                      <View key={app.application_type_id} style={styles.roleCard}>
                        <View style={styles.roleCardHeader}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                            <Text style={styles.roleCardLabel}>{getRoleLabel(app.application_type_id)}</Text>
                            <View style={[styles.statusBadge, getStatusBadgeStyle(app.status)]}>
                              <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(app.status)]}>
                                {getStatusLabel(app.status)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.roleCardMeta}>The application is tailored for {applicantRoleLabel.toLowerCase()} applicants.</Text>
                          {countdownText !== '' && (
                            <Text style={{ color: isClosed ? '#ef4444' : '#936da8', fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                              {countdownText}
                            </Text>
                          )}
                        </View>
                        <PillButton
                          title={isClosed ? "Closed" : "Continue Application"}
                          onPress={isClosed ? undefined : () => handleApply(app.application_type_id)}
                          additionalStyle={[styles.roleButton, isClosed && { opacity: 0.5 }]}
                        />
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Divider if drafts and (submitted or available) exist */}
            {draftApps.length > 0 && (submittedApps.length > 0 || availableRoles.length > 0) && (
              <View style={styles.sectionDivider} />
            )}

            {/* My Applications Section */}
            {submittedApps.length > 0 && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.heading, styles.shadow]}>My Applications</Text>
                <Text style={formFieldStyles.label}>
                  You have successfully submitted these applications. You can view or update your details here.
                </Text>
                <View style={styles.roleList}>
                  {submittedApps.map((app) => {
                    const applicantRoleLabel = getApplicantRoleLabel(app.application_type_id)
                    const closeAt = getRoleCloseAt(app.application_type_id)
                    const { text: countdownText, isClosed } = getCountdownText(closeAt)

                    return (
                      <View key={app.application_type_id} style={styles.roleCard}>
                        <View style={styles.roleCardHeader}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                            <Text style={styles.roleCardLabel}>{getRoleLabel(app.application_type_id)}</Text>
                            <View style={[styles.statusBadge, getStatusBadgeStyle(app.status)]}>
                              <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(app.status)]}>
                                {getStatusLabel(app.status)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.roleCardMeta}>The application is tailored for {applicantRoleLabel.toLowerCase()} applicants.</Text>
                          {countdownText !== '' && (
                            <Text style={{ color: isClosed ? '#ef4444' : '#936da8', fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                              {countdownText}
                            </Text>
                          )}
                        </View>
                        <PillButton
                          title={isClosed ? "View Application" : "View / Edit Application"}
                          onPress={() => handleApply(app.application_type_id)}
                          additionalStyle={styles.roleButton}
                        />
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Divider if submitted and available exist */}
            {submittedApps.length > 0 && availableRoles.length > 0 && hasPermission('applications', 'create') && (
              <View style={styles.sectionDivider} />
            )}

            {/* Available Application Types */}
            {availableRoles.length > 0 && hasPermission('applications', 'create') && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.heading, styles.shadow]}>Applications</Text>
                <Text style={formFieldStyles.label}>Choose the role that matches your profile and continue to the application for that role.</Text>

                <View style={styles.roleList}>
                  {isRolesLoading ? (
                    <ActivityIndicator size="large" color="#5a0061" style={{ marginVertical: 30 }} />
                  ) : (
                    availableRoles.map((applicationType) => {
                      const applicantRoleLabel = getApplicantRoleLabel(applicationType.id)
                      const { text: countdownText, isClosed } = getCountdownText(applicationType.closeAt)

                      return (
                        <View key={applicationType.id} style={styles.roleCard}>
                          <View style={styles.roleCardHeader}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                              <Text style={styles.roleCardLabel}>{applicationType.label}</Text>
                              <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                                <Text style={[styles.statusBadgeText, { color: '#475569' }]}>
                                  {applicationType.fieldCount} questions
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.roleCardMeta}>The application is tailored for {applicantRoleLabel.toLowerCase()} applicants.</Text>
                            {countdownText !== '' && (
                              <Text style={{ color: isClosed ? '#ef4444' : '#936da8', fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                                {countdownText}
                              </Text>
                            )}
                          </View>
                          <PillButton
                            title={isClosed ? "Closed" : `Apply as ${applicationType.label}`}
                            onPress={isClosed ? undefined : () => handleApply(applicationType.id)}
                            additionalStyle={[styles.roleButton, isClosed && { opacity: 0.5 }]}
                          />
                        </View>
                      )
                    })
                  )}
                </View>
              </View>
            )}
          </View>
        </View>          
      </ParallaxScrollView>
    </>
  )
}
