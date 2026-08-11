'use client'

import * as React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { QRCodeView } from 'app/components/qr-code-view'
import { AppIcon } from 'app/components/app-icon'
import { PersonSilhouette } from 'app/components/person-silhouette'
import { StyledSegmented } from 'app/components/styled-segmented'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { getLocalizedText, formatString, formatTime } from 'app/utils/i18n-helpers'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import hackmtyLogo from 'app/assets/images/hackmty-logo.webp'

interface CheckpointItem {
  id: string
  type_id: string
  title: any
  description?: any
  already_claimed_message_override?: any
  success_message_override?: any
  not_checked_in_message_override?: any
  requires_initial_checkin_override?: boolean
  start_time?: string
  end_time?: string
  location?: string
  is_active: boolean
  checkpoint_types?: {
    id: string
    name: any
    default_already_claimed_message: any
    default_success_message: any
    default_not_checked_in_message: any
    requires_initial_checkin: boolean
  }
}

interface CheckInRecord {
  id: string
  checkpoint_id: string
  checkpoint_type: string
  created_at: string
}

export function QRScreen() {
  const { navigateTo } = useSmartNavigate()
  const { role: userRole } = useUserPermissions()
  const { width } = useWindowDimensions()
  const isSmall = width < 600

  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<any>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [resolvedEmail, setResolvedEmail] = React.useState<string>('')
  const [resolvedName, setResolvedName] = React.useState<string>('HackMTY Participant')
  const [resolvedUniversity, setResolvedUniversity] = React.useState<string | null>(null)
  const [resolvedMajor, setResolvedMajor] = React.useState<string | null>(null)
  const [resolvedTshirt, setResolvedTshirt] = React.useState<string | null>(null)
  const [resolvedDiet, setResolvedDiet] = React.useState<string | null>(null)
  const [teamName, setTeamName] = React.useState<string | null>(null)
  const [avatarDisplayUrl, setAvatarDisplayUrl] = React.useState<string | null>(null)
  const [checkpoints, setCheckpoints] = React.useState<CheckpointItem[]>([])
  const [userCheckIns, setUserCheckIns] = React.useState<Record<string, CheckInRecord>>({})
  const [hasInitialCheckIn, setHasInitialCheckIn] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'pass' | 'activities'>('pass')

  const [userRolesList, setUserRolesList] = React.useState<string[]>([])
  const [appStatus, setAppStatus] = React.useState<{ status?: string; confirmedAt?: string | null } | null>(null)

  const loadData = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)
      setResolvedEmail(user.email || '')

      // 1. Load Profile & Team
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, teams(name)')
        .eq('id', user.id)
        .maybeSingle()

      if (prof) {
        setProfile(prof)
        if (prof.teams?.name) {
          setTeamName(prof.teams.name)
        }
      }

      // Resolve Avatar URL (Checks localStorage cache first, then prof.avatar_url, external HTTPS, or OAuth pictures)
      let resolvedAvatar: string | null = null
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(`user_profile_${user.id}`)
          if (cached) {
            const parsed = JSON.parse(cached)
            if (parsed.avatarUrl) {
              resolvedAvatar = parsed.avatarUrl
            }
          }
        } catch (e) {}
      }

      if (!resolvedAvatar) {
        const rawAvatar = prof?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        if (rawAvatar) {
          if (/^https?:\/\//i.test(rawAvatar)) {
            resolvedAvatar = rawAvatar
          } else {
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(rawAvatar)
            if (data?.publicUrl) {
              resolvedAvatar = data.publicUrl
            }
          }
        }
      }

      if (resolvedAvatar) {
        setAvatarDisplayUrl(resolvedAvatar)
      }

      // 1b. Load User Roles Array
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (rolesData && rolesData.length > 0) {
        setUserRolesList(rolesData.map((r) => r.role))
      } else {
        setUserRolesList(['user'])
      }

      // 1c. Load Application Status & fallback answers for name and details
      const { data: userApp } = await supabase
        .from('applications')
        .select('status, confirmed_at, answers')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userApp) {
        setAppStatus({ status: userApp.status, confirmedAt: userApp.confirmed_at })
      }

      const answers = userApp?.answers || {}

      // Compute multi-tier fallback name
      let fname = prof?.first_name || user.user_metadata?.first_name || user.user_metadata?.given_name || ''
      let lname = prof?.last_name || user.user_metadata?.last_name || user.user_metadata?.family_name || ''

      if (!fname && (user.user_metadata?.full_name || user.user_metadata?.name)) {
        const rawName = user.user_metadata?.full_name || user.user_metadata?.name
        const parts = String(rawName).trim().split(' ')
        fname = parts[0] || ''
        lname = parts.slice(1).join(' ') || ''
      }

      if (!fname && answers) {
        fname = answers.firstName || answers.first_name || ''
        lname = answers.lastName || answers.last_name || ''
      }

      const fullNameStr = [fname, lname].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'HackMTY Participant'
      setResolvedName(fullNameStr)

      // Resolve University, Major, T-Shirt, Diet
      setResolvedUniversity(prof?.university || answers.school || answers.university || user.user_metadata?.university || null)
      setResolvedMajor(prof?.major || answers.major || user.user_metadata?.major || null)
      setResolvedTshirt(prof?.tshirt_size || answers.tshirtSize || answers.tshirt || user.user_metadata?.tshirt || null)
      setResolvedDiet(prof?.dietary_restrictions || answers.dietaryRestrictions || answers.diet || user.user_metadata?.diet || null)

      // 2. Load Checkpoints with Type definitions
      const { data: checkpointsData } = await supabase
        .from('checkpoints')
        .select(`
          *,
          checkpoint_types (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (checkpointsData) {
        setCheckpoints(checkpointsData as any)
      }

      // 3. Load User Check-Ins
      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)

      if (checkInsData) {
        const checkInMap: Record<string, CheckInRecord> = {}
        let initialFound = false

        checkInsData.forEach((rec) => {
          checkInMap[rec.checkpoint_id] = rec
          if (rec.checkpoint_type === 'checkin') {
            initialFound = true
          }
        })

        setUserCheckIns(checkInMap)
        setHasInitialCheckIn(initialFound)
      }
    } catch (err) {
      console.error('Error loading QR Screen data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c2b75f" />
        <Text style={styles.loadingText}>Loading Official Pass...</Text>
      </View>
    )
  }

  const userId = currentUserId || profile?.id || 'guest'
  const qrPayload = `hackmty:2025:user:${userId}`

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Event Header with Centered Logo */}
      <View style={styles.headerBadge}>
        <Image source={hackmtyLogo} style={styles.eventLogo} resizeMode="contain" />
        <Text style={styles.headerSubtitle}>OFFICIAL EVENT PASS • HACKMTY 2025</Text>
      </View>

      {/* Main Glass Pass Card */}
      <View style={styles.passCard}>
        {/* Initial Arrival Status Banner */}
        {(() => {
          const isStaff = userRolesList.some((r) => ['admin', 'organizer', 'mentor', 'volunteer', 'judge', 'sponsor'].includes(r.toLowerCase()))
          const isConfirmed = appStatus && (appStatus.status === 'confirmed' || appStatus.confirmedAt !== null)
          const isAllowed = isConfirmed || isStaff

          return (
            <View
              style={[
                styles.statusBanner,
                hasInitialCheckIn
                  ? styles.statusBannerSuccess
                  : isAllowed
                  ? styles.statusBannerWarning
                  : styles.statusBannerDanger,
              ]}
            >
              <AppIcon
                name={
                  hasInitialCheckIn
                    ? 'checkmark.circle.fill'
                    : isAllowed
                    ? 'exclamationmark.triangle.fill'
                    : 'xmark.octagon.fill'
                }
                size={18}
                color={hasInitialCheckIn ? '#10B981' : isAllowed ? '#F59E0B' : '#EF4444'}
              />
              <Text style={styles.statusBannerText}>
                {hasInitialCheckIn
                  ? 'Checked In to Event • Badge Active'
                  : isAllowed
                  ? 'Initial Check-in Pending (Visit Registration Desk)'
                  : 'Attendance Not Confirmed • Confirmation required to check in'}
              </Text>
            </View>
          )
        })()}

        {/* Tab Toggle: Event Pass / Dynamic Activities */}
        <View style={{ width: '100%', marginBottom: 20 }}>
          <StyledSegmented
            label=""
            value={activeTab}
            options={[
              { label: 'My QR Badge', value: 'pass' },
              { label: `Meals & Dynamics (${checkpoints.length})`, value: 'activities' },
            ]}
            onValueChange={(val) => setActiveTab(val as 'pass' | 'activities')}
          />
        </View>

        {activeTab === 'pass' ? (
          <View style={styles.qrPassBody}>
            {/* Centered Multipurpose QR Code */}
            <View style={styles.qrWrapper}>
              <QRCodeView value={qrPayload} size={isSmall ? 200 : 230} color="#1d041f" />
            </View>

            {/* Participant Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {avatarDisplayUrl ? (
                  <Image
                    source={{ uri: avatarDisplayUrl }}
                    style={styles.avatarImage}
                    onError={() => setAvatarDisplayUrl(null)}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <PersonSilhouette size={52} />
                  </View>
                )}
              </View>

              <Text style={styles.participantName}>{resolvedName}</Text>

              {/* Roles Row */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
                {userRolesList.map((roleStr, idx) => (
                  <View key={`${roleStr}-${idx}`} style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{roleStr.toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              {/* Details Pills */}
              <View style={styles.pillsRow}>
                {resolvedEmail ? (
                  <View style={styles.infoPill}>
                    <AppIcon name="envelope.fill" size={12} color="#5a0061" />
                    <Text style={styles.infoPillText}>{resolvedEmail}</Text>
                  </View>
                ) : null}
                {teamName ? (
                  <View style={styles.infoPill}>
                    <AppIcon name="person.3.fill" size={12} color="#5a0061" />
                    <Text style={styles.infoPillText}>{teamName}</Text>
                  </View>
                ) : null}
                {resolvedUniversity ? (
                  <View style={styles.infoPill}>
                    <AppIcon name="building.columns.fill" size={12} color="#5a0061" />
                    <Text style={styles.infoPillText}>{resolvedUniversity}</Text>
                  </View>
                ) : null}
                {resolvedMajor ? (
                  <View style={styles.infoPill}>
                    <Text style={styles.infoPillLabel}>Major:</Text>
                    <Text style={styles.infoPillText}>{resolvedMajor}</Text>
                  </View>
                ) : null}
                {resolvedTshirt ? (
                  <View style={styles.infoPill}>
                    <Text style={styles.infoPillLabel}>Size:</Text>
                    <Text style={styles.infoPillText}>{resolvedTshirt.toUpperCase()}</Text>
                  </View>
                ) : null}
                {resolvedDiet && resolvedDiet !== 'none' ? (
                  <View style={[styles.infoPill, styles.dietPill]}>
                    <AppIcon name="leaf.fill" size={12} color="#10B981" />
                    <Text style={[styles.infoPillText, { color: '#10B981' }]}>
                      {resolvedDiet}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.qrInstructions}>
                Show this QR code at meal stations, check-in desks, and dynamic activity checkpoints.
              </Text>
            </View>
          </View>
        ) : (
          /* Dynamic Activity & Meal Timeline View */
          <View style={styles.timelineBody}>
            <Text style={styles.timelineSectionTitle}>Event Schedule & Checkpoint Status</Text>

            {checkpoints.length === 0 ? (
              <Text style={styles.emptyText}>No active checkpoints scheduled yet.</Text>
            ) : (
              checkpoints.map((cp) => {
                const typeObj = cp.checkpoint_types
                const requiresCheckin = cp.requires_initial_checkin_override ?? typeObj?.requires_initial_checkin ?? true
                const record = userCheckIns[cp.id]
                const isClaimed = !!record

                // Resolve Localized Messages
                const titleText = getLocalizedText(cp.title)
                const descText = getLocalizedText(cp.description)
                const claimedTemplate = getLocalizedText(
                  cp.already_claimed_message_override || typeObj?.default_already_claimed_message || 'Claimed at %s'
                )
                const successTemplate = getLocalizedText(
                  cp.success_message_override || typeObj?.default_success_message || 'Checked in at %s'
                )
                const notCheckedInTemplate = getLocalizedText(
                  cp.not_checked_in_message_override || typeObj?.default_not_checked_in_message || 'Initial check-in required'
                )

                let statusText = ''
                let statusColor = '#475569'

                if (!hasInitialCheckIn && requiresCheckin) {
                  statusText = notCheckedInTemplate
                  statusColor = '#dc2626'
                } else if (isClaimed) {
                  const claimTime = formatTime(record.created_at)
                  statusText = formatString(claimedTemplate, claimTime)
                  statusColor = '#059669'
                } else {
                  statusText = 'Available for Check-In'
                  statusColor = '#5a0061'
                }

                return (
                  <View key={cp.id} style={styles.checkpointCard}>
                    <View style={styles.checkpointCardHeader}>
                      <View style={styles.checkpointCategoryPill}>
                        <Text style={styles.checkpointCategoryText}>
                          {(cp.type_id || 'ACTIVITY').toUpperCase()}
                        </Text>
                      </View>
                      {cp.location && (
                        <Text style={styles.checkpointLocation}>📍 {cp.location}</Text>
                      )}
                    </View>

                    <Text style={styles.checkpointTitle}>{titleText}</Text>
                    {descText ? <Text style={styles.checkpointDesc}>{descText}</Text> : null}

                    {/* Status Badge */}
                    <View style={[styles.checkpointStatusBadge, { borderColor: statusColor }]}>
                      <AppIcon
                        name={isClaimed ? 'checkmark.circle.fill' : (!hasInitialCheckIn && requiresCheckin ? 'xmark.circle.fill' : 'clock.fill')}
                        size={14}
                        color={statusColor}
                      />
                      <Text style={[styles.checkpointStatusText, { color: statusColor }]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 24,
    minHeight: 300,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: '100%',
    ...Platform.select({
      web: {
        boxSizing: 'border-box',
        overflowX: 'hidden',
      } as any,
    }),
  },
  headerBadge: {
    alignItems: 'center',
    marginBottom: 20,
  },
  eventLogo: {
    height: 48,
    width: 200,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#c2b75f',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  passCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 4,
      },
      web: {
        boxShadow: '0 16px 36px rgba(34, 0, 44, 0.12)',
      } as any,
    }),
  },
  statusBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  statusBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBannerWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBannerDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusBannerText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#5a0061',
  },
  segmentText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  qrPassBody: {
    width: '100%',
    alignItems: 'center',
  },
  qrWrapper: {
    marginBottom: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileSection: {
    width: '100%',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#5a0061',
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  participantName: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  roleBadge: {
    backgroundColor: '#5a0061',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  roleBadgeText: {
    color: '#c2b75f',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dietPill: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  infoPillLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  infoPillText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  qrInstructions: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
  },
  timelineBody: {
    width: '100%',
  },
  timelineSectionTitle: {
    color: '#5a0061',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 20,
  },
  checkpointCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkpointCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkpointCategoryPill: {
    backgroundColor: '#5a0061',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkpointCategoryText: {
    color: '#c2b75f',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  checkpointLocation: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  checkpointTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  checkpointDesc: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  checkpointStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#f8fafc',
    alignSelf: 'flex-start',
  },
  checkpointStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
})
