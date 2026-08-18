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
  Animated,
} from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { QRCodeView } from 'app/components/qr-code-view'
import { AppIcon } from 'app/components/app-icon'
import { PersonSilhouette } from 'app/components/person-silhouette'
import { StyledSegmented } from 'app/components/styled-segmented'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { getLocalizedText, formatString, formatTime } from 'app/utils/i18n-helpers'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { EVENT_YEAR, checkEventPassUnlocked, selectActiveRoles, isOperatorRole } from 'app/utils/event-config'
import hackmtyLogo from 'app/assets/images/hackmty-logo.webp'
import { useTranslation } from 'app/i18n'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'

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
  unlocks_at?: string
  hide_until_unlocked?: boolean
  location?: string
  created_at?: string
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
  const { t, locale } = useTranslation()
  const { navigateTo, replaceTo } = useSmartNavigate()
  const { role: userRole } = useUserPermissions()
  const { width } = useWindowDimensions()
  const isSmall = width < 600

  const [hasMounted, setHasMounted] = React.useState(false)
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
  const [isPassUnlocked, setIsPassUnlocked] = React.useState(false)

  // Celebratory Check-In Modal State & Animations
  const [celebration, setCelebration] = React.useState<{
    title: string
    isEntrance: boolean
    timestamp: string
  } | null>(null)
  const overlayFade = React.useRef(new Animated.Value(0)).current
  const cardScale = React.useRef(new Animated.Value(0.7)).current
  const checkScale = React.useRef(new Animated.Value(0)).current
  const ringScale = React.useRef(new Animated.Value(0.8)).current
  const ringOpacity = React.useRef(new Animated.Value(0.8)).current
  const autoDismissTimer = React.useRef<any>(null)
  const knownCheckInIds = React.useRef<Set<string>>(new Set())

  const dismissCelebration = React.useCallback(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current)
      autoDismissTimer.current = null
    }
    Animated.parallel([
      Animated.timing(overlayFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.85,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCelebration(null)
    })
  }, [overlayFade, cardScale])

  const triggerCelebration = React.useCallback((title: string, isEntrance: boolean) => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current)
    }

    setCelebration({
      title,
      isEntrance,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })

    overlayFade.setValue(0)
    cardScale.setValue(0.7)
    checkScale.setValue(0)
    ringScale.setValue(0.8)
    ringOpacity.setValue(0.85)

    Animated.parallel([
      Animated.timing(overlayFade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(ringScale, {
            toValue: 1.45,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      ]).start()
    })

    autoDismissTimer.current = setTimeout(() => {
      dismissCelebration()
    }, 5000)
  }, [overlayFade, cardScale, checkScale, ringScale, ringOpacity, dismissCelebration])

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
        .select('*, teams!profiles_team_id_fkey(name)')
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

      // 1b. Load User Roles Array (active for the current event year only)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, event_year')
        .eq('user_id', user.id)

      const resolvedRolesList = selectActiveRoles(rolesData)
      setUserRolesList(resolvedRolesList)

      const unlocked = await checkEventPassUnlocked(resolvedRolesList)
      setIsPassUnlocked(unlocked)

      // 1c. Load Application Status & fallback answers for name and details
      const { data: userApps } = await supabase
        .from('applications')
        .select('status, confirmed_at, answers')
        .eq('user_id', user.id)

      const confirmedApp = Array.isArray(userApps)
        ? userApps.find((app) => app.status === 'confirmed' || app.confirmed_at !== null) || userApps[0]
        : null

      if (confirmedApp) {
        setAppStatus({ status: confirmedApp.status, confirmedAt: confirmedApp.confirmed_at })
      }

      const answers = confirmedApp?.answers || {}

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
          knownCheckInIds.current.add(rec.id)
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
    setHasMounted(true)
    loadData()
  }, [loadData])

  const processIncomingCheckIn = React.useCallback(
    (rec: CheckInRecord) => {
      if (!rec?.id || knownCheckInIds.current.has(rec.id)) return
      knownCheckInIds.current.add(rec.id)

      setUserCheckIns((prev) => ({
        ...prev,
        [rec.checkpoint_id]: rec,
      }))

      const isEntrance = rec.checkpoint_type === 'checkin'
      if (isEntrance) {
        setHasInitialCheckIn(true)
      }

      const cp = checkpoints.find((c) => c.id === rec.checkpoint_id)
      const title = cp ? getLocalizedText(cp.title) : isEntrance ? 'Event Entrance Check-In' : 'Station Check-In'

      triggerCelebration(title, isEntrance)
    },
    [checkpoints, triggerCelebration]
  )

  // Realtime & Active Polling Listener for Incoming Check-Ins
  React.useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId) return

    // 1. Supabase Realtime channel
    const channel = supabase
      .channel(`user-checkins-live-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
        },
        (payload: any) => {
          const newRecord = payload?.new
          if (newRecord && (newRecord.user_id === currentUserId || !newRecord.user_id)) {
            processIncomingCheckIn(newRecord)
          }
        }
      )
      .subscribe()

    // 2. Fallback Active Polling (every 2.5 seconds while on pass view)
    const pollTimer = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('check_ins')
          .select('*')
          .eq('user_id', currentUserId)

        if (Array.isArray(data)) {
          data.forEach((rec) => {
            if (!knownCheckInIds.current.has(rec.id)) {
              processIncomingCheckIn(rec)
            }
          })
        }
      } catch (e) {}
    }, 2500)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollTimer)
    }
  }, [currentUserId, processIncomingCheckIn])

  const visibleCheckpoints = React.useMemo(() => {
    return checkpoints
      .filter((cp) => {
        const isAdminOrOrganizer = userRolesList.some((r) => ['admin', 'organizer'].includes((r || '').toLowerCase()))
        if (isAdminOrOrganizer) return true

        if (cp.hide_until_unlocked) {
          const unlockTime = cp.unlocks_at || cp.start_time
          if (unlockTime) {
            const unlockDate = new Date(unlockTime)
            if (!isNaN(unlockDate.getTime()) && new Date() < unlockDate) {
              return false
            }
          }
        }
        return true
      })
      .sort((a, b) => {
        const getTimestamp = (val?: string | null) => {
          if (!val) return 0
          try {
            const t = new Date(val).getTime()
            return isNaN(t) ? 0 : t
          } catch {
            return 0
          }
        }

        const timeA = getTimestamp(a.unlocks_at || a.start_time)
        const timeB = getTimestamp(b.unlocks_at || b.start_time)

        if (timeA !== timeB) {
          if (timeA === 0) return 1
          if (timeB === 0) return -1
          return timeA - timeB
        }

        return getTimestamp(a.created_at) - getTimestamp(b.created_at)
      })
  }, [checkpoints, userRolesList])

  React.useEffect(() => {
    if (hasMounted && !loading && !currentUserId && !profile && isSupabaseConfigured) {
      replaceTo('/login')
    }
  }, [hasMounted, loading, currentUserId, profile, replaceTo])

  if (!hasMounted || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c2b75f" />
        <Text style={styles.loadingText}>{t('qr.loadingPass')}</Text>
      </View>
    )
  }

  const isOperator = isOperatorRole(userRolesList)
  const isConfirmed = Boolean(appStatus && (appStatus.status === 'confirmed' || appStatus.confirmedAt !== null))
  const isAllowed = (isConfirmed || isOperator) && isPassUnlocked

  const userId = currentUserId || profile?.id || 'guest'
  const qrPayload = `hackmty:${EVENT_YEAR}:user:${userId}`

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Header with Centered Logo */}
        <View style={styles.headerBadge}>
          <Image source={hackmtyLogo} style={styles.eventLogo} resizeMode="contain" />
          <Text style={styles.headerSubtitle}>
            {t('qr.officialEventPass', { year: EVENT_YEAR })}
          </Text>
        </View>

        {/* Main Glass Pass Card */}
        <View style={styles.passCard}>
          {/* Initial Arrival Status Banner */}
          {(() => {
            const isOperator = isOperatorRole(userRolesList)
            const isConfirmed = appStatus && (appStatus.status === 'confirmed' || appStatus.confirmedAt !== null)
            const isAllowed = isConfirmed || isOperator

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
                    ? t('qr.badgeActive')
                    : isAllowed
                    ? t('qr.initialCheckinPending')
                    : t('qr.attendanceNotConfirmed')}
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
                { label: t('qr.myBadge'), value: 'pass' },
                { label: `${t('qr.mealsDynamics')} (${checkpoints.length})`, value: 'activities' },
              ]}
              onValueChange={(val) => setActiveTab(val as 'pass' | 'activities')}
            />
          </View>

          {activeTab === 'pass' ? (
            <View style={styles.qrPassBody}>
              {/* Centered Multipurpose QR Code */}
              {(() => {
                if (!isAllowed) {
                  const lockReason = !isPassUnlocked
                    ? t('qr.passLockedReason')
                    : t('qr.passLockedPendingConfirmation')

                  return (
                    <View style={styles.lockedQrWrapper}>
                      <View style={styles.lockedIconCircle}>
                        <AppIcon name="lock.fill" size={34} color="#EF4444" />
                      </View>
                      <Text style={styles.lockedTitle}>{t('qr.passLocked')}</Text>
                      <Text style={styles.lockedSubtitle}>
                        {lockReason}
                      </Text>
                      {!isConfirmed && !isOperator && (
                        <Pressable style={styles.lockedButton} onPress={() => navigateTo('/applications')}>
                          <Text style={styles.lockedButtonText}>{t('qr.viewApplicationStatus')}</Text>
                        </Pressable>
                      )}
                    </View>
                  )
                }

                return (
                  <View style={styles.qrWrapper}>
                    <QRCodeView value={qrPayload} size={isSmall ? 200 : 230} color="#1d041f" />
                  </View>
                )
              })()}

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
                      <Text style={styles.roleBadgeText}>{getApplicantRoleLabel(roleStr, locale).toUpperCase()}</Text>
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
                      <Text style={styles.infoPillLabel}>{t('profile.major')}:</Text>
                      <Text style={styles.infoPillText}>{resolvedMajor}</Text>
                    </View>
                  ) : null}
                  {resolvedTshirt ? (
                    <View style={styles.infoPill}>
                      <Text style={styles.infoPillLabel}>{t('profile.tshirtSize')}:</Text>
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
                  {t('qr.qrInstructions')}
                </Text>
              </View>
            </View>
          ) : (
            /* Dynamic Activity & Meal Timeline View */
            <View style={styles.timelineBody}>
              <Text style={styles.timelineSectionTitle}>{t('qr.stationTimeline')}</Text>

              {visibleCheckpoints.length === 0 ? (
                <Text style={styles.emptyText}>{t('qr.noCheckpoints')}</Text>
              ) : (
                visibleCheckpoints.map((cp) => {
                  const typeObj = cp.checkpoint_types
                  const requiresCheckin = cp.requires_initial_checkin_override ?? typeObj?.requires_initial_checkin ?? true
                  const record = userCheckIns[cp.id]
                  const isClaimed = !!record

                  // Resolve Localized Messages
                  const titleText = getLocalizedText(cp.title, locale)
                  const descText = getLocalizedText(cp.description, locale)
                  const claimedTemplate = getLocalizedText(
                    cp.already_claimed_message_override || typeObj?.default_already_claimed_message || (locale === 'es' ? 'Reclamado a las %s' : 'Claimed at %s'),
                    locale
                  )
                  const successTemplate = getLocalizedText(
                    cp.success_message_override || typeObj?.default_success_message || (locale === 'es' ? 'Registrado a las %s' : 'Checked in at %s'),
                    locale
                  )
                  const notCheckedInTemplate = getLocalizedText(
                    cp.not_checked_in_message_override || typeObj?.default_not_checked_in_message || (locale === 'es' ? 'Check-in inicial requerido' : 'Initial check-in required'),
                    locale
                  )

                  let statusText = ''
                  let statusColor = '#475569'
                  let statusIcon: any = 'clock.fill'

                  const now = new Date()
                  const unlocksAt = cp.unlocks_at ? new Date(cp.unlocks_at) : cp.start_time ? new Date(cp.start_time) : null
                  const endTime = cp.end_time ? new Date(cp.end_time) : null

                  const isNotUnlockedYet = unlocksAt && now < unlocksAt
                  const isClosed = endTime && now > endTime

                  if (isClaimed) {
                    const claimTime = formatTime(record.created_at)
                    statusText = formatString(claimedTemplate, claimTime)
                    statusColor = '#059669'
                    statusIcon = 'checkmark.circle.fill'
                  } else if (isClosed) {
                    statusText = t('qr.stationClosed')
                    statusColor = '#dc2626'
                    statusIcon = 'xmark.circle.fill'
                  } else if (!hasInitialCheckIn && requiresCheckin) {
                    statusText = notCheckedInTemplate
                    statusColor = '#dc2626'
                    statusIcon = 'xmark.circle.fill'
                  } else if (isNotUnlockedYet && unlocksAt) {
                    const unlockFormatted = unlocksAt.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    statusText = `${t('qr.locked')} (${t('qr.unlocksAt', { time: unlockFormatted })})`
                    statusColor = '#d97706'
                    statusIcon = 'lock.fill'
                  } else {
                    statusText = t('qr.availableForCheckin')
                    statusColor = '#5a0061'
                    statusIcon = 'clock.fill'
                  }

                  return (
                    <View key={cp.id} style={styles.checkpointCard}>
                      <View style={styles.checkpointCardHeader}>
                        <View style={styles.checkpointCategoryPill}>
                          <Text style={styles.checkpointCategoryText}>
                            {(cp.type_id || 'ACTIVITY').toUpperCase()}
                          </Text>
                        </View>
                        {Boolean(cp.location) ? (
                          <View style={styles.checkpointLocationRow}>
                            <AppIcon name="mappin.and.ellipse" size={12} color="#64748b" />
                            <Text style={styles.checkpointLocation}>{cp.location}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.checkpointTitle}>{titleText}</Text>
                      {descText ? <Text style={styles.checkpointDesc}>{descText}</Text> : null}

                      {/* Status Badge */}
                      <View style={[styles.checkpointStatusBadge, { borderColor: statusColor }]}>
                        <AppIcon
                          name={statusIcon}
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

      {/* Realtime Animated Check-In Celebration Overlay */}
      {celebration ? (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            { opacity: overlayFade },
          ]}
        >
          <Pressable style={styles.celebrationBackdrop} onPress={dismissCelebration} />

          <Animated.View
            style={[
              styles.celebrationCard,
              { transform: [{ scale: cardScale }] },
            ]}
          >
            {/* Ripple Pulse Ring */}
            <Animated.View
              style={[
                styles.celebrationRing,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />

            {/* Glowing Circular Checkmark */}
            <Animated.View
              style={[
                styles.celebrationIconCircle,
                { transform: [{ scale: checkScale }] },
              ]}
            >
              <AppIcon name="checkmark" size={38} color="#ffffff" />
            </Animated.View>

            <View style={styles.celebrationTag}>
              <Text style={styles.celebrationTagText}>{t('qr.checkinVerified')}</Text>
            </View>

            <Text style={styles.celebrationTitle}>
              {celebration.isEntrance ? t('qr.welcomeTitle', { year: EVENT_YEAR }) : celebration.title}
            </Text>

            <Text style={styles.celebrationSubtitle}>
              {celebration.isEntrance
                ? t('qr.welcomeSubtitle')
                : t('qr.checkinRecorded', { time: celebration.timestamp })}
            </Text>

            <Pressable style={styles.celebrationButton} onPress={dismissCelebration}>
              <Text style={styles.celebrationButtonText}>{t('qr.celebrationDismiss')}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 3, 16, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
    ...Platform.select({
      web: {
        position: 'fixed',
        backdropFilter: 'blur(12px)',
      } as any,
    }),
  },
  celebrationBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
      },
      web: {
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(194, 183, 95, 0.3)',
      } as any,
    }),
  },
  celebrationRing: {
    position: 'absolute',
    top: 26,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  celebrationIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
      } as any,
    }),
  },
  celebrationTag: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 12,
  },
  celebrationTagText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  celebrationButton: {
    backgroundColor: '#5a0061',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  celebrationButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
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
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  checkpointLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkpointLocation: {
    color: '#475569',
    fontSize: 11,
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
  lockedQrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 24,
    marginVertical: 10,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  lockedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  lockedButton: {
    backgroundColor: '#5a0061',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  lockedButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
