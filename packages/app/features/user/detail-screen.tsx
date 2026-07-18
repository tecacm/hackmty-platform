import { useState, useEffect, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Linking,
  useWindowDimensions
} from 'react-native'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { useParams, useSearchParams } from 'solito/navigation'
import { PillButton } from 'app/components/pill-button'
import { WebNavbar } from 'app/components/web-navbar'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { SolitoImage } from 'solito/image'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'
import numbersbg from 'app/assets/images/numbers-bg.webp'

interface Application {
  id: string
  status: string
  admin_feedback: any
  application_type_id: string
  answers: any
  user_id: string
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    team_id: string | null
  } | null
}

export function UserDetailScreen() {
  const params = useParams()
  const searchParams = useSearchParams()
  const userId = params?.userId || params?.id
  const appId = searchParams?.get('appId')
  const { navigateTo } = useSmartNavigate()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const hasViewOthersPermission = !permissionsLoading && hasPermission('applications', 'view_others')
  const hasReviewPermission = !permissionsLoading && hasPermission('applications', 'review')

  const [userApps, setUserApps] = useState<Application[]>([])
  const [activeAppIndex, setActiveAppIndex] = useState(0)
  const app = userApps[activeAppIndex] || null

  const [teamName, setTeamName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Request Changes Modal
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [updatingApp, setUpdatingApp] = useState(false)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [loadingResume, setLoadingResume] = useState(false)

  // Layout sizing
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()
  const { width, height: screenHeight } = useWindowDimensions()
  const [stableHeaderHeight, setStableHeaderHeight] = useState(0)

  useEffect(() => {
    if (headerHeight > stableHeaderHeight) {
      setStableHeaderHeight(headerHeight)
    }
  }, [headerHeight, stableHeaderHeight])

  const topOffset = Math.max(stableHeaderHeight, insets.top)

  useEffect(() => {
    setIsReady(true)
  }, [])

  // Load application details (Fetch all application roles for this user)
  const fetchApplicationDetails = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      if (!isSupabaseConfigured) {
        // Fallback Mock detail data
        const mocks = mockDetailApplications.filter(a => a.user_id === userId)
        if (mocks.length > 0) {
          setUserApps(mocks)
          let startIndex = 0
          if (appId) {
            const found = mocks.findIndex(a => a.id === appId)
            if (found !== -1) startIndex = found
          }
          setActiveAppIndex(startIndex)
        } else {
          setError('Application details not found in sandbox mock list.')
        }
        setLoading(false)
        return
      }

      // Fetch all applications for the candidate
      const { data, error: fetchErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          admin_feedback,
          application_type_id,
          answers,
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            team_id
          )
        `)
        .eq('user_id', userId)

      if (fetchErr) throw fetchErr

      if (!data || data.length === 0) {
        setError('No application found for this user.')
        setLoading(false)
        return
      }

      // Format applications
      const formattedApps: Application[] = data.map((appItem: any) => {
        const rawProfile = Array.isArray(appItem.profiles)
          ? appItem.profiles[0]
          : (appItem.profiles as any)
        return {
          ...appItem,
          profiles: rawProfile ? {
            id: rawProfile.id,
            first_name: rawProfile.first_name,
            last_name: rawProfile.last_name,
            team_id: rawProfile.team_id,
            email: appItem.answers?.email || 'No email provided'
          } : null
        }
      })

      setUserApps(formattedApps)

      // Start with selected appId or default to first
      let startIndex = 0
      if (appId) {
        const found = formattedApps.findIndex(a => a.id === appId)
        if (found !== -1) startIndex = found
      }
      setActiveAppIndex(startIndex)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasViewOthersPermission && isReady) {
      fetchApplicationDetails()
    }
  }, [userId, hasViewOthersPermission, isReady])

  // Load team name when active app changes
  useEffect(() => {
    const loadTeamName = async () => {
      setTeamName(null)
      if (app && app.application_type_id === 'hacker' && app.profiles?.team_id) {
        if (!isSupabaseConfigured) {
          setTeamName(app.profiles.team_id === 'team-enigma' ? 'Enigma Busters' : null)
          return
        }
        try {
          const { data: teamData } = await supabase
            .from('teams')
            .select('name')
            .eq('id', app.profiles.team_id)
            .maybeSingle()
          if (teamData) {
            setTeamName(teamData.name)
          }
        } catch (err) {
          console.error('Failed to load team name for active application:', err)
        }
      }
    }
    loadTeamName()
  }, [app])

  // Handle status update
  const handleUpdateStatus = async (status: 'accepted' | 'rejected' | 'changes_requested', feedback: string | null = null) => {
    if (!app) return

    try {
      setUpdatingApp(true)

      let updatedFeedback: any[] = []
      if (Array.isArray(app.admin_feedback)) {
        updatedFeedback = [...app.admin_feedback]
      } else if (typeof app.admin_feedback === 'string' && app.admin_feedback) {
        updatedFeedback = [{
          feedback: app.admin_feedback,
          requested_at: new Date().toISOString(),
          resolved_at: new Date().toISOString()
        }]
      }

      if (status === 'changes_requested' && feedback) {
        updatedFeedback.push({
          feedback,
          requested_at: new Date().toISOString(),
          resolved_at: null
        })
      } else if (status !== 'changes_requested') {
        updatedFeedback = updatedFeedback.map(f => !f.resolved_at ? { ...f, resolved_at: new Date().toISOString() } : f)
      }

      if (isSupabaseConfigured) {
        const { error: updateErr } = await supabase
          .from('applications')
          .update({
            status,
            admin_feedback: updatedFeedback,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id)

        if (updateErr) throw updateErr
      }

      // Update local state array
      setUserApps(prev => prev.map(a => {
        if (a.id === app.id) {
          return { ...a, status, admin_feedback: updatedFeedback }
        }
        return a
      }))
    } catch (err: any) {
      alert(err.message || 'Failed to update status.')
    } finally {
      setUpdatingApp(false)
    }
  }

  // Submit request changes
  const submitRequestChanges = async () => {
    if (!requestReason.trim()) {
      alert('Please specify a reason for requesting changes.')
      return
    }

    setShowRequestChangesModal(false)
    await handleUpdateStatus('changes_requested', requestReason)
  }

  // Parse dynamic application fields configurations
  const groupedAnswersBySection = useMemo(() => {
    if (!app?.answers) return []

    let applicationFields: any
    try {
      applicationFields = require('app/data/application-fields.json')
    } catch (e) {
      console.warn('Failed to load application-fields.json schema:', e)
      return []
    }

    const sectionsMap = applicationFields.sections || {}
    const fieldsMap = applicationFields.fields || {}

    // Initialize containers for each configured section
    const sectionsData: Record<string, { label: string; order: number; items: { label: string; value: string; isLink?: boolean }[] }> = {}
    
    Object.entries(sectionsMap).forEach(([secKey, secValue]: [string, any]) => {
      sectionsData[secKey] = {
        label: secValue.label,
        order: secValue.order || 0,
        items: []
      }
    })

    // Process all answered fields
    Object.entries(app.answers).forEach(([fieldKey, fieldValue]) => {
      // Find matching field definition
      const fieldConfig = fieldsMap[fieldKey]
      if (!fieldConfig) return // Skip internal fields not defined in client schema

      const secKey = fieldConfig.section || 'PERSONAL_INFO'
      if (!sectionsData[secKey]) {
        sectionsData[secKey] = { label: secKey, order: 99, items: [] }
      }

      // Check if it's a link field (GitHub, devpost, etc.)
      const isLink = ['github', 'linkedin', 'devpost', 'personalSite'].includes(fieldKey)

      // Resolve options mapping if applicable
      let resolvedValue = String(fieldValue)
      if (fieldConfig.options && Array.isArray(fieldConfig.options)) {
        if (Array.isArray(fieldValue)) {
          resolvedValue = fieldValue.map(val => {
            const opt = fieldConfig.options.find((o: any) => o.value === val)
            return opt ? opt.label : String(val)
          }).join(', ')
        } else {
          const opt = fieldConfig.options.find((o: any) => o.value === fieldValue)
          resolvedValue = opt ? opt.label : String(fieldValue)
        }
      }

      sectionsData[secKey].items.push({
        label: fieldConfig.label || fieldKey,
        value: resolvedValue,
        isLink
      })
    })

    // Sort sections by configuration order and filter empty sections
    return Object.values(sectionsData)
      .filter(sec => sec.items.length > 0)
      .sort((a, b) => a.order - b.order)
  }, [app])

  // Fetch secure signed URL for candidate CV from private resumes bucket
  useEffect(() => {
    const fetchResumeUrl = async () => {
      setResumeUrl(null)
      if (!app?.answers?.resume) return

      const path = app.answers.resume
      if (path.startsWith('http://') || path.startsWith('https://')) {
        setResumeUrl(path)
        return
      }

      if (!isSupabaseConfigured) {
        setResumeUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')
        return
      }

      try {
        setLoadingResume(true)
        const { data, error } = await supabase.storage
          .from('resumes')
          .createSignedUrl(path, 900) // Valid for 15 minutes

        if (error) throw error

        if (data?.signedUrl) {
          setResumeUrl(data.signedUrl)
        }
      } catch (err) {
        console.error('Failed to create signed URL for resume:', err)
        // Fallback to public URL in case local DB does not support sign policies
        const publicUrl = supabase.storage.from('resumes').getPublicUrl(path).data.publicUrl
        setResumeUrl(publicUrl)
      } finally {
        setLoadingResume(false)
      }
    }

    fetchResumeUrl()
  }, [app])

  if (!isReady) {
    return (
      <View style={[styles.container, { backgroundColor: '#1d041f' }]} />
    )
  }

  if (permissionsLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#1d041f' }]}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  if (!hasViewOthersPermission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#1d041f' }]}>
        <View style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You do not have administrative permissions to review application documents.
          </Text>
          <PillButton
            title="Return Home"
            onPress={() => navigateTo('/home')}
            additionalStyle={{ width: 200, height: 50, marginTop: 10 }}
          />
        </View>
      </View>
    )
  }

  const backgroundProps: any = {
    src: numbersbg,
    width,
    height: Math.max(screenHeight, 1000),
    contentFit: 'cover',
    resizeMode: 'cover',
    alt: 'Numbers Background',
  }

  const background = (
    <SolitoImage {...backgroundProps} />
  )

  const renderStatusBadge = (status: string) => {
    let bgColor = '#f1f5f9'
    let textColor = '#475569'
    let label = status.toUpperCase()

    if (status === 'accepted') {
      bgColor = '#f0fdf4'
      textColor = '#15803d'
      label = 'ACCEPTED'
    } else if (status === 'rejected') {
      bgColor = '#fef2f2'
      textColor = '#b91c1c'
      label = 'REJECTED'
    } else if (status === 'changes_requested') {
      bgColor = '#fffbeb'
      textColor = '#b45309'
      label = 'CHANGES REQ'
    } else if (status === 'submitted') {
      bgColor = '#ecfeff'
      textColor = '#0e7490'
      label = 'SUBMITTED'
    } else if (status === 'draft') {
      bgColor = '#f3e8ff'
      textColor = '#7e22ce'
      label = 'DRAFT'
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
      </View>
    )
  }

  return (
    <>
      <WebNavbar />
      <ParallaxScrollView
        background={background}
        style={{ backgroundColor: '#1d041f' }}
        contentContainerStyle={{
          alignItems: 'center',
          gap: 16,
          paddingTop: Platform.OS === 'web' ? 104 : topOffset,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          overflow: 'visible',
        }}
      >
        <View style={styles.contentWrapper}>
          {Platform.OS === 'web' ? (
            <View style={styles.detailHeaderActionsRow}>
              <Pressable onPress={() => navigateTo('/admin')} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back to Admin Dashboard</Text>
              </Pressable>
              <PillButton
                title="↻ Refresh Data"
                onPress={fetchApplicationDetails}
                isLoading={loading}
                additionalStyle={styles.detailRefreshBtn}
              />
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 12 }}>
              <PillButton
                title="Refresh"
                onPress={fetchApplicationDetails}
                isLoading={loading}
                additionalStyle={{ width: 100, height: 36 }}
              />
            </View>
          )}

          {/* Role Switcher if user has multiple applications */}
          {!loading && userApps.length > 1 && (
            <View style={styles.roleSwitcherContainer}>
              <Text style={styles.roleSwitcherLabel}>Candidate has multiple applications. Select role review:</Text>
              <View style={styles.roleSwitcherTabs}>
                {userApps.map((userApp, idx) => {
                  const isActive = idx === activeAppIndex
                  return (
                    <Pressable
                      key={userApp.id}
                      onPress={() => setActiveAppIndex(idx)}
                      style={[styles.roleTab, isActive && styles.roleTabActive]}
                    >
                      <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>
                        {userApp.application_type_id.toUpperCase()} ({userApp.status.replace('_', ' ')})
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#c2b75f" />
              <Text style={styles.loadingText}>Fetching application data...</Text>
            </View>
          ) : error || !app ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error || 'No application loaded.'}</Text>
            </View>
          ) : (
            <View style={styles.detailLayoutGrid}>
              
              {/* Left Panel: Application Details */}
              <View style={styles.detailPanelLeft}>
                
                {/* Header Information Card */}
                <View style={styles.profileHeaderCard}>
                  <View style={styles.profileMetaHeader}>
                    <View>
                      <Text style={styles.profileName}>
                        {(app.profiles?.first_name || app.answers?.firstName || '') + ' ' + (app.profiles?.last_name || app.answers?.lastName || '')}
                      </Text>
                      <Text style={styles.profileEmail}>{app.answers?.email || 'No email provided'}</Text>
                    </View>
                    {renderStatusBadge(app.status)}
                  </View>

                  <View style={styles.profileRowDivider} />

                  <View style={styles.profileMetaGrid}>
                    <View style={styles.profileMetaCol}>
                      <Text style={styles.metaLabel}>Role Applied</Text>
                      <Text style={styles.metaValue}>{app.application_type_id.toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileMetaCol}>
                      <Text style={styles.metaLabel}>Country</Text>
                      <Text style={styles.metaValue}>{app.answers?.country || 'N/A'}</Text>
                    </View>
                    {app.application_type_id === 'hacker' && teamName && (
                      <View style={styles.profileMetaCol}>
                        <Text style={styles.metaLabel}>Team</Text>
                        <Text style={styles.metaValue}>{teamName}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Active Feedback Banner */}
                {(() => {
                  const activeFeedback = Array.isArray(app.admin_feedback)
                    ? app.admin_feedback.find((f: any) => !f.resolved_at)?.feedback
                    : app.admin_feedback
                  return activeFeedback ? (
                    <View style={styles.feedbackBanner}>
                      <Text style={styles.feedbackBannerTitle}>Active Change Request Feedback:</Text>
                      <Text style={styles.feedbackBannerText}>"{activeFeedback}"</Text>
                    </View>
                  ) : null
                })()}

                {/* Historical Requested Changes Log */}
                {(() => {
                  const feedbackHistory = Array.isArray(app.admin_feedback) ? app.admin_feedback : []
                  return feedbackHistory.length > 0 ? (
                    <View style={styles.historyCard}>
                      <Text style={styles.historyCardTitle}>Changes Request History</Text>
                      {feedbackHistory.map((item: any, idx: number) => {
                        const reqDate = item.requested_at ? new Date(item.requested_at).toLocaleString() : 'Unknown date'
                        const resDate = item.resolved_at ? new Date(item.resolved_at).toLocaleString() : 'Pending resolution'
                        return (
                          <View key={idx} style={[styles.historyRow, idx > 0 && styles.historyRowBorder]}>
                            <Text style={styles.historyText}>"{item.feedback}"</Text>
                            <View style={styles.historyMetaRow}>
                              <Text style={styles.historyMetaText}>Requested: {reqDate}</Text>
                              <Text style={[styles.historyMetaText, !item.resolved_at && styles.historyPendingText]}>
                                Resolved: {resDate}
                              </Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  ) : null
                })()}

                {/* Action Trigger Buttons */}
                {hasReviewPermission && (
                  <View style={styles.actionsCard}>
                    <Text style={styles.actionsCardTitle}>Organizer Actions</Text>
                    <View style={styles.actionsRow}>
                      {app.status !== 'accepted' && (
                        <PillButton
                          variant="secondary"
                          title="Approve"
                          isLoading={updatingApp}
                          onPress={() => handleUpdateStatus('accepted')}
                          additionalStyle={styles.actionBtn}
                        />
                      )}
                      {app.status !== 'rejected' && (
                        <PillButton
                          variant="outline-danger"
                          title="Reject"
                          isLoading={updatingApp}
                          onPress={() => handleUpdateStatus('rejected')}
                          additionalStyle={styles.actionBtn}
                        />
                      )}
                      {app.status !== 'changes_requested' && (
                        <PillButton
                          variant="outline-secondary"
                          title="Request Changes"
                          isLoading={updatingApp}
                          onPress={() => {
                            setRequestReason('')
                            setShowRequestChangesModal(true)
                          }}
                          additionalStyle={styles.actionBtn}
                        />
                      )}
                    </View>
                  </View>
                )}

                {/* Application Information Form Fields */}
                <View style={styles.fieldsCard}>
                  <Text style={styles.fieldsCardTitle}>Application Answers</Text>
                  <ScrollView style={styles.fieldsScroll}>
                    
                    {groupedAnswersBySection.map((section, secIdx) => (
                      <View key={secIdx} style={{ marginBottom: 16 }}>
                        <Text style={styles.sectionHeader}>{section.label}</Text>
                        {section.items.map((item, itemIdx) => {
                          if (item.isLink && item.value && item.value !== 'N/A') {
                            const url = item.value.startsWith('http') ? item.value : `https://${item.value}`
                            return (
                              <Pressable
                                key={itemIdx}
                                onPress={() => Linking.openURL(url)}
                                style={styles.fieldItem}
                              >
                                <Text style={styles.fieldLabel}>{item.label} ↗</Text>
                                <Text style={styles.linkText}>{item.value}</Text>
                              </Pressable>
                            )
                          }

                          return (
                            <View key={itemIdx} style={styles.fieldItem}>
                              <Text style={styles.fieldLabel}>{item.label}</Text>
                              <Text style={styles.fieldValue}>{item.value || 'N/A'}</Text>
                            </View>
                          )
                        })}
                      </View>
                    ))}

                  </ScrollView>
                </View>

              </View>

              {/* Right Panel: Embedded PDF Resume Viewer */}
              <View style={styles.detailPanelRight}>
                <View style={styles.resumeViewerCard}>
                  <Text style={styles.resumeCardTitle}>Candidate Resume / CV</Text>
                  {loadingResume ? (
                    <View style={styles.noResumeContainer}>
                      <ActivityIndicator size="large" color="#c2b75f" />
                      <Text style={[styles.noResumeText, { marginTop: 12 }]}>Generating secure access link...</Text>
                    </View>
                  ) : resumeUrl ? (
                    <View style={styles.resumeFrameContainer}>
                      {Platform.OS === 'web' ? (
                        <iframe
                          src={resumeUrl}
                          style={{
                            width: '100%',
                            height: '100%',
                            minHeight: 650,
                            border: 'none',
                            borderRadius: 12,
                          }}
                        />
                      ) : (
                        <View style={styles.nativeResumePlaceholder}>
                          <Text style={styles.nativeResumeText}>Inline PDF embedding is supported on Web browsers.</Text>
                          <PillButton
                            title="Open Resume PDF ↗"
                            onPress={() => Linking.openURL(resumeUrl)}
                            additionalStyle={{ width: 220, height: 48, marginTop: 16 }}
                          />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noResumeContainer}>
                      <Text style={styles.noResumeText}>No resume PDF file uploaded by the applicant.</Text>
                    </View>
                  )}
                </View>
              </View>

            </View>
          )}
        </View>
      </ParallaxScrollView>

      {/* Request Changes Reason Modal Dialog */}
      <Modal
        transparent={true}
        visible={showRequestChangesModal}
        animationType="fade"
        onRequestClose={() => setShowRequestChangesModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request Changes</Text>
            <Text style={styles.modalSubtitle}>
              Specify details about what the applicant needs to modify (e.g. invalid CV file, typo in registration fields).
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Type the changes requested here..."
              placeholderTextColor="#999999"
              value={requestReason}
              onChangeText={setRequestReason}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowRequestChangesModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>

              <PillButton
                variant="secondary"
                title="Send Request"
                onPress={submitRequestChanges}
                additionalStyle={{ flex: 1, height: 48 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

// Sandbox local mock data details
const mockDetailApplications: Application[] = [
  {
    id: 'mock-1',
    status: 'submitted',
    admin_feedback: null,
    application_type_id: 'hacker',
    answers: {
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan@turing.org',
      country: 'United Kingdom',
      university: 'University of Cambridge',
      major: 'Mathematics',
      year: '2026',
      tshirt: 'M',
      diet: 'Vegan',
      github: 'github.com/turing',
      linkedin: 'linkedin.com/in/turing',
      resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    user_id: 'user-turing',
    profiles: {
      id: 'user-turing',
      first_name: 'Alan',
      last_name: 'Turing',
      email: 'alan@turing.org',
      team_id: 'team-enigma'
    }
  },
  {
    id: 'mock-2',
    status: 'submitted',
    admin_feedback: null,
    application_type_id: 'hacker',
    answers: {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@hopper.edu',
      country: 'United States',
      university: 'Yale University',
      major: 'Computer Science',
      year: '2027',
      tshirt: 'S',
      diet: 'None',
      github: 'github.com/hopper',
      resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    user_id: 'user-hopper',
    profiles: {
      id: 'user-hopper',
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@hopper.edu',
      team_id: 'team-enigma'
    }
  },
  {
    id: 'mock-3',
    status: 'changes_requested',
    admin_feedback: 'Resume PDF link is broken, please re-upload.',
    application_type_id: 'hacker',
    answers: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@lovelace.com',
      country: 'United Kingdom',
      university: 'University of London',
      major: 'Analytical Systems',
      year: '2025',
      tshirt: 'S',
      diet: 'Gluten-Free',
      resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    user_id: 'user-ada',
    profiles: {
      id: 'user-ada',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@lovelace.com',
      team_id: null
    }
  }
]

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1d041f',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 40,
    alignItems: 'center',
    maxWidth: 450,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  accessDeniedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    color: '#22002c',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  accessDeniedSubtitle: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contentWrapper: {
    width: '90%',
    maxWidth: 1200,
    alignItems: 'flex-start',
  },
  backBtn: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 100,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginTop: 20,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  detailLayoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
  },
  detailPanelLeft: {
    flex: 1,
    minWidth: 320,
    gap: 20,
  },
  detailPanelRight: {
    flex: 1.2,
    minWidth: 320,
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  profileMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22002c',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
  },
  profileRowDivider: {
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    marginVertical: 16,
  },
  profileMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  profileMetaCol: {
    minWidth: 100,
  },
  metaLabel: {
    fontSize: 11,
    color: 'rgba(90, 0, 97, 0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: '#22002c',
    fontWeight: '600',
  },
  feedbackBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  feedbackBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 6,
  },
  feedbackBannerText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  actionsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    minWidth: 120,
    height: 44,
  },
  fieldsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 24,
    maxHeight: 600,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  fieldsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  fieldsScroll: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#5a0061',
    backgroundColor: 'rgba(90, 0, 97, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 12,
  },
  fieldItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(90, 0, 97, 0.05)',
  },
  fieldLabel: {
    fontSize: 11,
    color: 'rgba(90, 0, 97, 0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: '#22002c',
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#5a0061',
    fontWeight: '600',
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  resumeViewerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 24,
    height: '100%',
    minHeight: 700,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  resumeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  resumeFrameContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 0, 44, 0.08)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'stretch',
    minHeight: 650,
  },
  nativeResumePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nativeResumeText: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 14,
  },
  noResumeContainer: {
    flex: 1,
    backgroundColor: '#fbf9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  noResumeText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22002c',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#22002c',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.2)',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
  },
  roleSwitcherContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 16,
    marginBottom: 16,
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(34, 0, 44, 0.04)',
      },
    }),
  },
  roleSwitcherLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
    textTransform: 'uppercase',
  },
  roleSwitcherTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.08)',
  },
  roleTabActive: {
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    borderColor: '#5a0061',
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5b4d61',
  },
  roleTabTextActive: {
    color: '#5a0061',
  },
  detailHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    gap: 16,
  },
  detailRefreshBtn: {
    width: 140,
    height: 38,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 24,
    width: '100%',
    gap: 16,
    marginTop: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.04)',
      },
    }),
  },
  historyCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22002c',
  },
  historyRow: {
    paddingVertical: 12,
    gap: 8,
  },
  historyRowBorder: {
    borderTopWidth: 1,
    borderColor: 'rgba(34, 0, 44, 0.08)',
  },
  historyText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyMetaText: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '500',
  },
  historyPendingText: {
    color: '#d32f2f',
    fontWeight: '700',
  },
})
