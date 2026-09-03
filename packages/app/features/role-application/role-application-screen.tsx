'use client'

import { Text, View, useWindowDimensions, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { StyleSheet, Platform } from 'react-native'

import { PillButton } from 'app/components/pill-button'
import { Skeleton } from 'moti/skeleton'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'

import { getApplicationTypes, getApplicantFieldsForRole, getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { formFieldColors, formFieldStyles } from 'app/components/form-field-styles'
import { useTranslation } from 'app/i18n'


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
  deadlinePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  deadlinePillOpen: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  deadlinePillClosed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  deadlinePillText: { fontSize: 12, fontWeight: '800' },
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

export function RoleApplicationScreen() {
  const { t, locale } = useTranslation();
  const { navigateTo, replaceTo } = useSmartNavigate();
  const { hasPermission, role, loading: permissionsLoading } = useUserPermissions();
  const [isWide, setIsWide] = useState(false);
  const { width } = useWindowDimensions();
  
  const [rolesList, setRolesList] = useState<Array<{ id: string; label: string; fieldCount: number; closeAt: string | null; confirmCloseAt: string | null }>>([])
  const [userApps, setUserApps] = useState<Array<{ application_type_id: string; status: string }>>([])
  const [isRolesLoading, setIsRolesLoading] = useState(true)

  const isLoading = isRolesLoading || permissionsLoading
  const isSmallScreen = width < 640

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
    async function loadRoles() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ''))
          const type = params.get('type')
          if (type === 'recovery') {
            replaceTo('/reset-password')
            return
          }
        }
      }

      if (!isSupabaseConfigured) {
        const staticTypes = getApplicationTypes()
          .filter((type: any) => type.is_public !== false)
          .map(type => ({
            id: type.id,
            label: type.label,
            fieldCount: getApplicantFieldsForRole(type.id).length,
            closeAt: type.close_at || null,
            confirmCloseAt: (type as any).confirm_close_at || null,
          }))
        setRolesList(staticTypes)
        setIsRolesLoading(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        let user = session?.user
        if (!user) {
          const { data: userData } = await supabase.auth.getUser()
          user = userData?.user ?? undefined
        }
        if (!user) {
          await new Promise(r => setTimeout(r, 400))
          const { data: retrySession } = await supabase.auth.getSession()
          user = retrySession?.session?.user
        }
        if (!user) {
          replaceTo('/login')
          return
        }

        const [typesResult, userAppsResult] = await Promise.all([
          supabase
            .from('application_types')
            .select(`
              id,
              label,
              is_public,
              close_at,
              confirm_close_at,
              application_type_fields (
                field_id
              )
            `)
            .eq('is_public', true),
          supabase
            .from('applications')
            .select('application_type_id, status')
            .eq('user_id', user.id),
        ])

        if (userAppsResult.data) {
          const fetchedUserApps = userAppsResult.data.map((app: any) => ({
            application_type_id: app.application_type_id,
            status: app.status,
          }))
          setUserApps(fetchedUserApps)
        }

        if (typesResult.data) {
          const formatted = typesResult.data.map((type: any) => {
            const activeFields = (type.application_type_fields || [])

            const rawLabel = type.label
            let resolvedLabel = ''
            if (typeof rawLabel === 'object' && rawLabel !== null && rawLabel[locale]) {
              resolvedLabel = rawLabel[locale]
            } else {
              resolvedLabel = getApplicantRoleLabel(type.id, locale)
            }

            return {
              id: type.id,
              label: resolvedLabel,
              fieldCount: activeFields.length,
              closeAt: type.close_at || null,
              confirmCloseAt: type.confirm_close_at || null,
            }
          })
          setRolesList(formatted)
        } else {
          const staticTypes = getApplicationTypes()
            .filter((type: any) => type.is_public !== false)
            .map(type => ({
              id: type.id,
              label: getApplicantRoleLabel(type.id, locale),
              fieldCount: getApplicantFieldsForRole(type.id).length,
              closeAt: type.close_at || null,
              confirmCloseAt: (type as any).confirm_close_at || null,
            }))
          setRolesList(staticTypes)
        }
      } catch (err: any) {
        console.warn('Failed to load application roles from Supabase, using static fallback:', err)
        const staticTypes = getApplicationTypes()
          .filter((type: any) => type.is_public !== false)
          .map(type => ({
            id: type.id,
            label: getApplicantRoleLabel(type.id, locale),
            fieldCount: getApplicantFieldsForRole(type.id).length,
            closeAt: type.close_at || null,
            confirmCloseAt: (type as any).confirm_close_at || null,
          }))
        setRolesList(staticTypes)
      } finally {
        setIsRolesLoading(false)
      }
    }

    loadRoles()
    // Intentionally depend only on `locale`. `replaceTo` from useSmartNavigate is a new
    // function every render; including it here re-ran this effect on every render (each
    // setState re-render), spamming the application_types/applications requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  useEffect(() => {
    setIsWide(width >= 520)
  }, [width])


  const draftApps = userApps.filter(app => app.status === 'draft')
  const submittedApps = userApps.filter(app => app.status !== 'draft')
  const availableRoles = rolesList.filter(role => 
    !userApps.some(app => app.application_type_id === role.id)
  )

  const getRoleLabel = (roleId: string) => {
    const found = rolesList.find(r => r.id === roleId)
    return found ? found.label : getApplicantRoleLabel(roleId)
  }

  const getRoleCloseAt = (roleId: string): string | null => {
    const found = rolesList.find(r => r.id === roleId)
    if (found && found.closeAt) return found.closeAt
    const staticConfig = getApplicationTypes().find(t => t.id === roleId)
    return staticConfig?.close_at || null
  }

  const getRoleConfirmCloseAt = (roleId: string): string | null => {
    const found = rolesList.find(r => r.id === roleId)
    return found?.confirmCloseAt || null
  }

  const getCountdownText = (closeAt: string | null): { text: string; isClosed: boolean } => {
    if (!closeAt) return { text: '', isClosed: false }
    const deadline = new Date(closeAt).getTime()
    const now = Date.now()
    const diff = deadline - now

    if (diff <= 0) {
      return { text: t('applicant.closed'), isClosed: true }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes}m`)

    return {
      text: t('applicant.closesIn', { time: parts.join(' ') }),
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
      case 'confirmed':
        return { backgroundColor: '#f0fdf4' }
      case 'changes_requested':
        return { backgroundColor: '#fffbeb' }
      case 'rejected':
        return { backgroundColor: '#fef2f2' }
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
      case 'confirmed':
        return { color: '#15803d' }
      case 'changes_requested':
        return { color: '#b45309' }
      case 'rejected':
        return { color: '#b91c1c' }
      default:
        return { color: '#475569' }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t('applicant.statusDraft')
      case 'submitted':
        return t('applicant.statusUnderReview')
      case 'accepted':
        return t('applicant.statusAccepted')
      case 'confirmed':
        return t('applicant.attendanceConfirmed')
      case 'changes_requested':
        return t('applicant.statusChangesRequested')
      case 'rejected':
        return t('applicant.statusRejected')
      default:
        return status
    }
  }

  return (
    <>
        <View style={[styles.container, { width: '90%', maxWidth: 1000 }]}>
          <View style={styles.contentContainer}>
            
            {isLoading ? (
              <View style={{ width: '100%' }}>
                <View style={{ marginBottom: 10 }}>
                  <Skeleton colorMode="light" width={220} height={30} radius={6} />
                </View>
                <View style={styles.roleList}>
                  {[0, 1].map((i) => (
                    <View key={i} style={styles.roleCard}>
                      <View style={styles.roleCardHeader}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', width: '100%', marginBottom: 4, gap: 8 }}>
                          <Skeleton colorMode="light" width={200} height={24} radius={6} />
                          <Skeleton colorMode="light" width={90} height={26} radius={8} />
                        </View>
                        <Skeleton colorMode="light" width={'70%'} height={13} radius={4} />
                      </View>
                      <Skeleton colorMode="light" width={'100%'} height={48} radius={14} />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                {/* Drafts Section */}
                {draftApps.length > 0 && hasPermission('applications', 'create') && (
                  <View style={{ width: '100%' }}>
                    <Text style={[styles.heading, styles.shadow]}>{t('applicant.drafts')}</Text>
                    <Text style={formFieldStyles.label}>
                      {t('applicant.draftsSubtitle')}
                    </Text>
                    <View style={styles.roleList}>
                      {draftApps.map((app) => {
                        const applicantRoleLabel = getApplicantRoleLabel(app.application_type_id, locale)
                        const closeAt = getRoleCloseAt(app.application_type_id)
                        const { text: countdownText, isClosed } = getCountdownText(closeAt)

                        return (
                          <View key={app.application_type_id} style={styles.roleCard}>
                            <View style={styles.roleCardHeader}>
                              <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmallScreen ? 'flex-start' : 'center', width: '100%', marginBottom: 4, gap: isSmallScreen ? 6 : 0 }}>
                                <Text style={styles.roleCardLabel}>{getRoleLabel(app.application_type_id)}</Text>
                                <View style={[styles.statusBadge, getStatusBadgeStyle(app.status)]}>
                                  <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(app.status)]}>
                                    {getStatusLabel(app.status)}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.roleCardMeta}>{t('applicant.tailoredForRole', { role: applicantRoleLabel.toLowerCase() })}</Text>
                              {countdownText !== '' && (
                                <Text style={{ color: isClosed ? '#ef4444' : '#936da8', fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                                  {countdownText}
                                </Text>
                              )}
                            </View>
                            <PillButton
                              title={isClosed ? t('applicant.closed') : t('applicant.continueApplication')}
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
                {draftApps.length > 0 && hasPermission('applications', 'create') && (submittedApps.length > 0 || (availableRoles.length > 0 && hasPermission('applications', 'create'))) && (
                  <View style={styles.sectionDivider} />
                )}

                {/* My Applications Section */}
                {submittedApps.length > 0 && (
                  <View style={{ width: '100%' }}>
                    <Text style={[styles.heading, styles.shadow]}>{t('applicant.myApplications')}</Text>
                    <Text style={formFieldStyles.label}>
                      {t('applicant.myApplicationsSubtitle')}
                    </Text>
                    <View style={styles.roleList}>
                      {submittedApps.map((app) => {
                        const applicantRoleLabel = getApplicantRoleLabel(app.application_type_id, locale)
                        const closeAt = getRoleCloseAt(app.application_type_id)
                        const { isClosed } = getCountdownText(closeAt)

                        return (
                          <View key={app.application_type_id} style={styles.roleCard}>
                            <View style={styles.roleCardHeader}>
                              <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmallScreen ? 'flex-start' : 'center', width: '100%', marginBottom: 4, gap: isSmallScreen ? 6 : 0 }}>
                                <Text style={styles.roleCardLabel}>{getRoleLabel(app.application_type_id)}</Text>
                                <View style={[styles.statusBadge, getStatusBadgeStyle(app.status)]}>
                                  <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(app.status)]}>
                                    {getStatusLabel(app.status)}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.roleCardMeta}>{t('applicant.tailoredForRole', { role: applicantRoleLabel.toLowerCase() })}</Text>
                            </View>
                            {(() => {
                              const isAccepted = app.status === 'accepted'
                              const skip = app.status === 'confirmed' || app.status === 'rejected'
                              const deadline = isAccepted
                                ? getRoleConfirmCloseAt(app.application_type_id)
                                : skip
                                  ? null
                                  : getRoleCloseAt(app.application_type_id)
                              if (!deadline) return null
                              const passed = new Date(deadline).getTime() < Date.now()
                              const dateStr = new Date(deadline).toLocaleString(locale, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              const label = isAccepted
                                ? t(passed ? 'applicant.attendanceClosedOn' : 'applicant.attendanceClosesOn', { date: dateStr })
                                : t(passed ? 'applicant.submissionClosedOn' : 'applicant.submissionClosesOn', { date: dateStr })
                              return (
                                <View style={[styles.deadlinePill, passed ? styles.deadlinePillClosed : styles.deadlinePillOpen]}>
                                  <Text style={[styles.deadlinePillText, { color: passed ? '#b91c1c' : '#15803d' }]}>{label}</Text>
                                </View>
                              )
                            })()}
                            <PillButton
                              title={(isClosed || app.status === 'accepted' || app.status === 'confirmed' || app.status === 'rejected') ? t('applicant.viewApplication') : t('applicant.viewApplication')}
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
                    <Text style={[styles.heading, styles.shadow]}>{t('applicant.availableApplications')}</Text>
                    <Text style={formFieldStyles.label}>{t('applicant.availableApplicationsSubtitle')}</Text>

                    <View style={styles.roleList}>
                      {availableRoles.map((applicationType) => {
                        const applicantRoleLabel = getApplicantRoleLabel(applicationType.id, locale)
                        const { text: countdownText, isClosed } = getCountdownText(applicationType.closeAt)

                        return (
                          <View key={applicationType.id} style={styles.roleCard}>
                            <View style={styles.roleCardHeader}>
                              <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmallScreen ? 'flex-start' : 'center', width: '100%', marginBottom: 4, gap: isSmallScreen ? 6 : 0 }}>
                                <Text style={styles.roleCardLabel}>{applicationType.label}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                                  <Text style={[styles.statusBadgeText, { color: '#475569' }]}>
                                    {t('applicant.questionsCount', { count: applicationType.fieldCount })}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.roleCardMeta}>{t('applicant.tailoredForRole', { role: applicantRoleLabel.toLowerCase() })}</Text>
                              {countdownText !== '' && (
                                <Text style={{ color: isClosed ? '#ef4444' : '#936da8', fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                                  {countdownText}
                                </Text>
                              )}
                            </View>
                            <PillButton
                              title={isClosed ? t('applicant.closed') : t('applicant.applyAs', { role: applicationType.label })}
                              onPress={isClosed ? undefined : () => handleApply(applicationType.id)}
                              additionalStyle={[styles.roleButton, isClosed && { opacity: 0.5 }]}
                            />
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>          
    </>
  )
}
