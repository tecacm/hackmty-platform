'use client'

import * as React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { supabase, isSupabaseConfigured, fetchAllRows } from 'app/lib/supabase'
import { AppIcon } from 'app/components/app-icon'
import { Skeleton } from 'moti/skeleton'
import { BadgeIcon } from 'app/components/badge-icon'
import { iconPublicUrl, localizeText, type Badge } from 'app/utils/badge-helpers'
import { PersonSilhouette } from 'app/components/person-silhouette'
import { QRCameraScanner } from 'app/components/qr-camera-scanner'
import { LinearGradient } from 'app/components/linear-gradient'
import {
  getLocalizedText,
  formatString,
  formatTime,
  Translation,
  jsonbToTranslations,
  translationsToJsonb,
} from 'app/utils/i18n-helpers'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { notifyUserOnCheckIn } from 'app/services/notification-service'
import { AdminPaginationBar } from './AdminPaginationBar'
import { useTranslation } from 'app/i18n'

export interface CheckInHistoryItem {
  id: string
  user_id: string
  checkpoint_id: string
  checkpoint_type: string
  created_at: string
  created_by?: string | null
  profiles?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    university: string | null
    avatar_url: string | null
    tshirt_size?: string | null
    dietary_restrictions?: string | null
  } | null
  operator?: {
    id: string
    first_name: string | null
    last_name: string | null
  } | null
}

const defaultDietOptions = [
  { label: { en: 'None', es: 'Ninguna' }, value: 'none' },
  { label: { en: 'Vegetarian', es: 'Vegetariano' }, value: 'vegetarian' },
  { label: { en: 'Vegan', es: 'Vegano' }, value: 'vegan' },
  { label: { en: 'No pork', es: 'Sin cerdo' }, value: 'no_pork' },
  { label: { en: 'Gluten-Free', es: 'Sin gluten' }, value: 'gluten_free' },
]

export function formatDietLabel(raw?: string | null): { label: string; isSpecial: boolean } {
  if (!raw) return { label: '', isSpecial: false }
  const clean = String(raw).trim()
  const lower = clean.toLowerCase()
  if (['none', 'no', 'n/a', 'standard', 'ninguna', 'ninguno', 'regular', ''].includes(lower)) {
    return { label: '', isSpecial: false }
  }

  const opt = defaultDietOptions.find((o) => o.value === lower || o.value === clean)
  if (opt) {
    return { label: getLocalizedText(opt.label) || opt.value, isSpecial: true }
  }

  return { label: clean, isSpecial: true }
}

export function formatShirtSize(raw?: string | null): string | null {
  if (!raw) return null
  const clean = String(raw).trim()
  if (['none', 'n/a', '', 'null', 'undefined'].includes(clean.toLowerCase())) return null
  const map: Record<string, string> = {
    small: 'S',
    medium: 'M',
    large: 'L',
    xlarge: 'XL',
    xxl: 'XXL',
  }
  return map[clean.toLowerCase()] || clean.toUpperCase()
}

interface Checkpoint {
  id: string
  type_id: string
  title: any
  description?: any
  already_claimed_message_override?: any
  success_message_override?: any
  not_checked_in_message_override?: any
  requires_initial_checkin_override?: boolean
  location?: string
  points?: number
  badge_id?: string | null
  start_time?: string
  end_time?: string
  unlocks_at?: string
  hide_until_unlocked?: boolean
  notify_roles?: string[] | null
  notify_lead_minutes?: number | null
  notified_at?: string | null
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

interface ScanResult {
  status: 'success' | 'already_claimed' | 'not_checked_in' | 'error'
  userProfile?: any
  avatarUrl?: string | null
  message: string
  timestamp?: string
}

export function CheckInScannerTab() {
  const { t, locale } = useTranslation()
  const { hasPermission } = useUserPermissions()
  const canManageStations = hasPermission('checkin', 'modify')
  const canManageStationsRef = React.useRef(canManageStations)
  React.useEffect(() => {
    canManageStationsRef.current = canManageStations
  }, [canManageStations])

  const { width } = useWindowDimensions()
  // Collapse the station-header action buttons to icons and stack the title on its
  // own row on narrow viewports (web + native).
  const isNarrowHeader = width > 0 && width < 720

  const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>([])
  const [selectedStationId, setSelectedStationId] = React.useState<string | null>(null)
  const [loadingStations, setLoadingStations] = React.useState(true)
  const [stationCheckInCount, setStationCheckInCount] = React.useState(0)

  // Station Menu Search & Filter State
  const [stationSearchQuery, setStationSearchQuery] = React.useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string>('all')

  // Station Delete Confirmation State
  const [stationToDelete, setStationToDelete] = React.useState<Checkpoint | null>(null)
  const [isDeletingStation, setIsDeletingStation] = React.useState(false)

  // Scanner & Search State
  const [scanInput, setScanInput] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<ScanResult | null>(null)

  // User Lookup Search Modal
  const [isLookupOpen, setIsLookupOpen] = React.useState(false)
  const [lookupQuery, setLookupQuery] = React.useState('')
  const [lookupResults, setLookupResults] = React.useState<any[]>([])
  const [isSearchingLookup, setIsSearchingLookup] = React.useState(false)

  // Dynamic Station Types List & Creator State (Fetched 100% dynamically from DB)
  const [checkpointTypes, setCheckpointTypes] = React.useState<any[]>([])

  const [isCreateTypeOpen, setIsCreateTypeOpen] = React.useState(false)
  const [newTypeIdKey, setNewTypeIdKey] = React.useState('')
  const [typeNameTranslations, setTypeNameTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
    { key: 'es', value: '' },
  ])
  const [typeClaimedTranslations, setTypeClaimedTranslations] = React.useState<Translation[]>([
    { key: 'en', value: 'Already processed at %s' },
  ])
  const [typeSuccessTranslations, setTypeSuccessTranslations] = React.useState<Translation[]>([
    { key: 'en', value: 'Check-in successful at %s' },
  ])
  const [typeNotCheckedInTranslations, setTypeNotCheckedInTranslations] = React.useState<Translation[]>([
    { key: 'en', value: 'User has not completed initial event check-in' },
  ])
  const [typeRequiresCheckin, setTypeRequiresCheckin] = React.useState(true)
  const [isSavingType, setIsSavingType] = React.useState(false)

  // Dynamic Checkpoint Manager Modal
  const [isManagerOpen, setIsManagerOpen] = React.useState(false)
  const [titleTranslations, setTitleTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
    { key: 'es', value: '' },
  ])
  const [descTranslations, setDescTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
  ])
  const [newTypeId, setNewTypeId] = React.useState('')
  const [newLocation, setNewLocation] = React.useState('')
  const [newPoints, setNewPoints] = React.useState('0')
  const [newBadgeId, setNewBadgeId] = React.useState<string | null>(null)
  const [badges, setBadges] = React.useState<Badge[]>([])
  const [newRequiresCheckin, setNewRequiresCheckin] = React.useState(true)
  const [claimedMsgTranslations, setClaimedMsgTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
  ])
  const [successMsgTranslations, setSuccessMsgTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
  ])
  const [notCheckedInMsgTranslations, setNotCheckedInMsgTranslations] = React.useState<Translation[]>([
    { key: 'en', value: '' },
  ])
  const [newStartTime, setNewStartTime] = React.useState('')
  const [newEndTime, setNewEndTime] = React.useState('')
  const [newUnlocksAt, setNewUnlocksAt] = React.useState('')
  const [newHideUntilUnlocked, setNewHideUntilUnlocked] = React.useState(false)
  const [newNotifyRoles, setNewNotifyRoles] = React.useState<string[]>([])
  const [newNotifyLead, setNewNotifyLead] = React.useState('0')
  const [notifyRoleOptions, setNotifyRoleOptions] = React.useState<string[]>([])
  const [editingStation, setEditingStation] = React.useState<Checkpoint | null>(null)
  const [isCreatingStation, setIsCreatingStation] = React.useState(false)

  React.useEffect(() => {
    if (!isSupabaseConfigured) return
    ;(async () => {
      try {
        const { data } = await supabase.from('role_permissions').select('role')
        const set = new Set<string>()
        ;(data || []).forEach((r: any) => { if (r.role) set.add(r.role) })
        setNotifyRoleOptions(Array.from(set).sort())
      } catch (e) {
        /* ignore */
      }
    })()
  }, [])

  // Fetch Checkpoint Types from Database
  const fetchCheckpointTypes = React.useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { data } = await supabase
        .from('checkpoint_types')
        .select('*')
        .order('id', { ascending: true })
      if (data && data.length > 0) {
        setCheckpointTypes(data as any)
        setNewTypeId((prev) => prev || data[0].id)
      }
    } catch (e) {
      console.error('Error fetching checkpoint_types:', e)
    }
  }, [])

  // Create New Checkpoint Type on the Fly
  const handleCreateType = async () => {
    const typeIdClean = newTypeIdKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!typeIdClean) {
      Alert.alert('Validation Error', 'Type ID key is required (e.g. swag, booth, game)')
      return
    }

    const nameObj = translationsToJsonb(typeNameTranslations)
    if (!nameObj || Object.keys(nameObj).length === 0 || !Object.values(nameObj).some(Boolean)) {
      Alert.alert('Validation Error', 'Type name is required in at least one language')
      return
    }

    setIsSavingType(true)
    try {
      const claimedObj = translationsToJsonb(typeClaimedTranslations)
      const successObj = translationsToJsonb(typeSuccessTranslations)
      const notCheckedObj = translationsToJsonb(typeNotCheckedInTranslations)

      const { data, error } = await supabase
        .from('checkpoint_types')
        .insert({
          id: typeIdClean,
          name: nameObj,
          default_already_claimed_message: claimedObj,
          default_success_message: successObj,
          default_not_checked_in_message: notCheckedObj,
          requires_initial_checkin: typeRequiresCheckin,
        })
        .select()
        .single()

      if (error) throw error

      await fetchCheckpointTypes()
      setNewTypeId(typeIdClean)
      setIsCreateTypeOpen(false)
      setNewTypeIdKey('')
      setTypeNameTranslations([{ key: 'en', value: '' }, { key: 'es', value: '' }])
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not create station category type')
    } finally {
      setIsSavingType(false)
    }
  }

  // Load Checkpoints
  const fetchCheckpoints = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoadingStations(false)
      return
    }

    try {
      const { data } = await supabase
        .from('checkpoints')
        .select(`
          *,
          checkpoint_types (*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (data) {
        setCheckpoints(data as any)
      }
    } catch (e) {
      console.error('Error loading checkpoints:', e)
    } finally {
      setLoadingStations(false)
    }
  }, [])

  // Count check-ins for active selected station
  const updateStationCount = React.useCallback(async (stationId: string) => {
    if (!isSupabaseConfigured || !stationId) return
    try {
      const { count } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('checkpoint_id', stationId)

      setStationCheckInCount(count || 0)
    } catch (e) {
      // ignore
    }
  }, [])

  // Check-In History & Revocation State
  const [historyList, setHistoryList] = React.useState<CheckInHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [historySearch, setHistorySearch] = React.useState('')
  const [historyPage, setHistoryPage] = React.useState(1)
  const [historyPageSize, setHistoryPageSize] = React.useState(10)
  const [revokingId, setRevokingId] = React.useState<string | null>(null)
  const [revokeModalTarget, setRevokeModalTarget] = React.useState<CheckInHistoryItem | null>(null)

  const fetchStationHistory = React.useCallback(async (stationId: string) => {
    if (!isSupabaseConfigured || !stationId) return
    setHistoryLoading(true)
    try {
      const data = await fetchAllRows((rangeFrom, rangeTo) =>
        supabase
          .from('check_ins')
          .select(`
          id,
          user_id,
          checkpoint_id,
          checkpoint_type,
          created_at,
          created_by,
          profiles:user_id (
            id,
            first_name,
            last_name,
            university,
            avatar_url,
            tshirt_size,
            dietary_restrictions
          ),
          operator:created_by (
            id,
            first_name,
            last_name
          )
        `)
          .eq('checkpoint_id', stationId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(rangeFrom, rangeTo)
      )

      // Enrich with auth directory emails if available
      const { data: directoryEmails } = await supabase.rpc('get_admin_directory_emails')
      const emailMap: Record<string, string> = {}
      directoryEmails?.forEach((entry: any) => {
        if (entry.user_id && entry.email) emailMap[entry.user_id] = entry.email
      })

      const resolveAvatarUrl = (raw: string | null | undefined): string | null => {
        if (!raw) return null
        if (raw.startsWith('http')) return raw
        const { data: pubUrlData } = supabase.storage.from('avatars').getPublicUrl(raw)
        return pubUrlData?.publicUrl || null
      }

      const enrichedData = ((data as any) || []).map((item: any) => ({
        ...item,
        profiles: item.profiles
          ? {
              ...item.profiles,
              avatar_url: resolveAvatarUrl(item.profiles.avatar_url),
              email: emailMap[item.user_id] || null,
            }
          : null,
      }))

      setHistoryList(enrichedData)
    } catch (e) {
      console.error('Error fetching station history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const handleRevokeCheckIn = React.useCallback(async (record: CheckInHistoryItem) => {
    if (!record || !record.id) return
    setRevokingId(record.id)
    try {
      const { error: delErr } = await supabase
        .from('check_ins')
        .delete()
        .eq('id', record.id)

      if (delErr) throw delErr

      setHistoryList((prev) => prev.filter((item) => item.id !== record.id))
      if (selectedStationId) {
        updateStationCount(selectedStationId)
      }
      setRevokeModalTarget(null)
    } catch (e: any) {
      Alert.alert('Revocation Error', e?.message || 'Could not revoke check-in record.')
    } finally {
      setRevokingId(null)
    }
  }, [selectedStationId, updateStationCount])

  React.useEffect(() => {
    fetchCheckpoints()
    fetchCheckpointTypes()
  }, [fetchCheckpoints, fetchCheckpointTypes])

  React.useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('badges').select('*').order('created_at', { ascending: true })
      if (!cancelled) setBadges((data as Badge[]) || [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (selectedStationId) {
      updateStationCount(selectedStationId)
      fetchStationHistory(selectedStationId)
      setHistoryPage(1)
      setHistorySearch('')
    } else {
      setHistoryList([])
    }
  }, [selectedStationId, updateStationCount, fetchStationHistory])

  const selectedStation = checkpoints.find((c) => c.id === selectedStationId)
  const selectedStationRef = React.useRef(selectedStation)
  React.useEffect(() => {
    selectedStationRef.current = selectedStation
  }, [selectedStation])

  const isProcessingRef = React.useRef(isProcessing)
  React.useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  const filteredHistory = React.useMemo(() => {
    const q = historySearch.toLowerCase().trim()
    if (!q) return historyList
    return historyList.filter((item) => {
      const fname = (item.profiles?.first_name || '').toLowerCase()
      const lname = (item.profiles?.last_name || '').toLowerCase()
      const name = `${fname} ${lname}`.trim()
      const email = (item.profiles?.email || '').toLowerCase()
      const uni = (item.profiles?.university || '').toLowerCase()
      const uid = (item.user_id || '').toLowerCase()
      return name.includes(q) || email.includes(q) || uni.includes(q) || uid.includes(q)
    })
  }, [historyList, historySearch])

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize))
  const displayedHistory = React.useMemo(() => {
    const start = (historyPage - 1) * historyPageSize
    return filteredHistory.slice(start, start + historyPageSize)
  }, [filteredHistory, historyPage, historyPageSize])

  // Handle Scanning or Processing User Check-In
  const handleProcessCheckIn = React.useCallback(async (rawUserIdOrPayload: string) => {
    const station = selectedStationRef.current
    if (!rawUserIdOrPayload || !station || isProcessingRef.current) return

    // Date/time lock: only admins/organizers may check people in before a station opens.
    if (!canManageStationsRef.current) {
      const openAt = station.unlocks_at || station.start_time
      if (openAt) {
        const openD = new Date(openAt)
        if (!isNaN(openD.getTime()) && new Date() < openD) {
          setLastResult({ status: 'error', message: t('admin.checkinStationLocked') })
          return
        }
      }
    }

    setIsProcessing(true)
    setLastResult(null)

    try {
      // Extract user ID from QR string (e.g. "hackmty:2026:user:<UUID>" or raw UUID)
      let targetUserId = rawUserIdOrPayload.trim()
      if (targetUserId.includes('hackmty:2026:user:')) {
        targetUserId = targetUserId.split('hackmty:2026:user:')[1] || targetUserId
      } else if (targetUserId.includes('hackmty:2025:user:')) {
        targetUserId = targetUserId.split('hackmty:2025:user:')[1] || targetUserId
      }

      // 1. Fetch User Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, teams!profiles_team_id_fkey(name)')
        .eq('id', targetUserId)
        .maybeSingle()

      if (!profile) {
        setLastResult({
          status: 'error',
          message: 'User profile not found for scanned code.',
        })
        setIsProcessing(false)
        return
      }

      // Resolve user avatar display URL if present
      let avatarDisplayUrl: string | null = null
      if (profile.avatar_url) {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(profile.avatar_url)
        avatarDisplayUrl = data?.publicUrl || null
      }

      // 2. Fetch User's Roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)

      const rolesList = userRoles && userRoles.length > 0 ? userRoles.map((r) => r.role) : ['user']

      // 3. Resolve Messages & Prerequisite rules
      const typeObj = station.checkpoint_types || null
      const requiresInitialCheckIn = station.requires_initial_checkin_override ?? typeObj?.requires_initial_checkin ?? true

      const claimedTemplate = getLocalizedText(
        station.already_claimed_message_override || typeObj?.default_already_claimed_message || 'Already processed at %s',
        locale,
      )
      const successTemplate = getLocalizedText(
        station.success_message_override || typeObj?.default_success_message || 'Check-in successful at %s',
        locale,
      )
      const notCheckedInTemplate = getLocalizedText(
        station.not_checked_in_message_override || typeObj?.default_not_checked_in_message || 'User has not completed initial event check-in',
        locale,
      )

      // 3b. Verify Application Status for Initial Entrance Check-in
      const isStaffRole = rolesList.some((r) => ['admin', 'organizer', 'mentor', 'volunteer', 'judge', 'sponsor'].includes(r.toLowerCase()))

      if (station.type_id === 'checkin' && !isStaffRole) {
        const { data: userApps } = await supabase
          .from('applications')
          .select('status, confirmed_at')
          .eq('user_id', targetUserId)

        const isConfirmed = Array.isArray(userApps) && userApps.some(
          (app) => app.status === 'confirmed' || app.confirmed_at !== null
        )

        if (!isConfirmed) {
          setLastResult({
            status: 'error',
            userProfile: { ...profile, roles: rolesList },
            avatarUrl: avatarDisplayUrl,
            message: 'Check-in blocked: Participant has not confirmed attendance for HackMTY 2026.',
          })
          setIsProcessing(false)
          return
        }
      }

      // 4. Check Initial Arrival Check-in (if required)
      if (requiresInitialCheckIn && station.type_id !== 'checkin') {
        const { data: checkInRows } = await supabase
          .from('check_ins')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('checkpoint_type', 'checkin')
          .limit(1)

        const initialCheckIn = Array.isArray(checkInRows) && checkInRows.length > 0

        if (!initialCheckIn) {
          setLastResult({
            status: 'not_checked_in',
            userProfile: { ...profile, roles: rolesList },
            avatarUrl: avatarDisplayUrl,
            message: notCheckedInTemplate,
          })
          setIsProcessing(false)
          return
        }
      }

      // 5. Check if user already claimed this specific station
      const { data: existingCheckIns } = await supabase
        .from('check_ins')
        .select('created_at')
        .eq('user_id', targetUserId)
        .eq('checkpoint_id', station.id)
        .limit(1)

      const existingCheckIn = Array.isArray(existingCheckIns) && existingCheckIns.length > 0 ? existingCheckIns[0] : null

      if (existingCheckIn) {
        const claimTime = formatTime(existingCheckIn.created_at)
        const formattedMsg = formatString(claimedTemplate, claimTime)

        setLastResult({
          status: 'already_claimed',
          userProfile: { ...profile, roles: rolesList },
          avatarUrl: avatarDisplayUrl,
          message: formattedMsg,
          timestamp: claimTime,
        })
        setIsProcessing(false)
        return
      }

      // 6. Record New Check-In
      const { data: currentUser } = await supabase.auth.getUser()
      const staffUserId = currentUser?.user?.id || null

      const { data: insertedRec, error: insertErr } = await supabase
        .from('check_ins')
        .insert({
          user_id: targetUserId,
          checkpoint_id: station.id,
          checkpoint_type: station.type_id,
          event_year: '2026',
          created_by: staffUserId,
        })
        .select('created_at')
        .single()

      if (insertErr) {
        throw insertErr
      }

      const nowTime = formatTime(insertedRec?.created_at || new Date())
      const formattedSuccessMsg = formatString(successTemplate, nowTime)

      setLastResult({
        status: 'success',
        userProfile: { ...profile, roles: rolesList },
        avatarUrl: avatarDisplayUrl,
        message: formattedSuccessMsg,
        timestamp: nowTime,
      })

      // Update count & clear input & refresh history
      updateStationCount(station.id)
      fetchStationHistory(station.id)
      setScanInput('')

      // Dispatch push notification to attendee (push only, no email)
      notifyUserOnCheckIn({
        userId: targetUserId,
        stationTitle: getLocalizedText(station.title, locale) || 'Event Check-In',
        isEntrance: station.type_id === 'checkin',
      }).catch((pushErr) => {
        console.warn('[CheckInScanner] Push notification error:', pushErr)
      })
    } catch (e: any) {
      console.error('[CheckInScanner] Check-in processing error:', e)
      setLastResult({
        status: 'error',
        message: e?.message || 'Error processing check-in',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [updateStationCount, fetchStationHistory])

  // Lookup Search (searches both name and email with live debouncing)
  const handleSearchLookup = React.useCallback(async (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : lookupQuery).trim()
    if (!q || !isSupabaseConfigured) {
      setLookupResults([])
      setIsSearchingLookup(false)
      return
    }
    setIsSearchingLookup(true)
    try {
      // 1. Load directory emails
      const { data: directoryEmails } = await supabase.rpc('get_admin_directory_emails')
      const emailMap: Record<string, string> = {}
      const matchingEmailUserIds: string[] = []

      directoryEmails?.forEach((entry: any) => {
        if (entry.user_id && entry.email) {
          emailMap[entry.user_id] = entry.email
          if (entry.email.toLowerCase().includes(q.toLowerCase())) {
            matchingEmailUserIds.push(entry.user_id)
          }
        }
      })

      // 2. Query profiles matching first_name, last_name, or user_id matching email
      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, tshirt_size, dietary_restrictions, university, teams!profiles_team_id_fkey(name)')

      if (matchingEmailUserIds.length > 0) {
        query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,id.in.(${matchingEmailUserIds.slice(0, 50).join(',')})`)
      } else {
        query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      }

      const { data, error } = await query.limit(20)
      if (error) throw error

      const resolveAvatarUrl = (raw: string | null | undefined): string | null => {
        if (!raw) return null
        if (raw.startsWith('http')) return raw
        const { data: pubUrlData } = supabase.storage.from('avatars').getPublicUrl(raw)
        return pubUrlData?.publicUrl || null
      }

      const enriched = (data || []).map((item: any) => ({
        ...item,
        avatar_url: resolveAvatarUrl(item.avatar_url),
        email: emailMap[item.id] || null,
      }))

      setLookupResults(enriched)
    } catch (e) {
      console.error('[SearchParticipant] Lookup error:', e)
    } finally {
      setIsSearchingLookup(false)
    }
  }, [lookupQuery])

  // Real-time live search debounce as user types
  React.useEffect(() => {
    if (!isLookupOpen) return
    const trimmed = lookupQuery.trim()
    if (!trimmed) {
      setLookupResults([])
      setIsSearchingLookup(false)
      return
    }

    const timer = setTimeout(() => {
      handleSearchLookup(trimmed)
    }, 250)

    return () => clearTimeout(timer)
  }, [lookupQuery, isLookupOpen, handleSearchLookup])

  const toDatetimeLocal = (isoStr?: string | null) => {
    if (!isoStr) return ''
    try {
      const d = new Date(isoStr)
      if (isNaN(d.getTime())) return ''
      const pad = (n: number) => (n < 10 ? '0' + n : n)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch (e) {
      return ''
    }
  }

  const handleOpenCreateModal = () => {
    if (!canManageStations) return
    setEditingStation(null)
    setTitleTranslations([{ key: 'en', value: '' }, { key: 'es', value: '' }])
    setDescTranslations([{ key: 'en', value: '' }])
    setNewTypeId(checkpointTypes[0]?.id || 'station')
    setNewLocation('')
    setNewPoints('0')
    setNewBadgeId(null)
    setNewRequiresCheckin(true)
    setNewStartTime('')
    setNewEndTime('')
    setNewUnlocksAt('')
    setNewHideUntilUnlocked(false)
    setNewNotifyRoles([])
    setNewNotifyLead('0')
    setClaimedMsgTranslations([{ key: 'en', value: '' }])
    setSuccessMsgTranslations([{ key: 'en', value: '' }])
    setNotCheckedInMsgTranslations([{ key: 'en', value: '' }])
    setIsManagerOpen(true)
  }

  const handleOpenEditModal = (station: Checkpoint) => {
    if (!canManageStations) return
    setEditingStation(station)
    setTitleTranslations(jsonbToTranslations(station.title))
    setDescTranslations(jsonbToTranslations(station.description))
    setNewTypeId(station.type_id)
    setNewLocation(station.location || '')
    setNewPoints(String(station.points ?? 0))
    setNewBadgeId(station.badge_id ?? null)
    setNewRequiresCheckin(station.requires_initial_checkin_override ?? station.checkpoint_types?.requires_initial_checkin ?? true)
    setNewStartTime(toDatetimeLocal(station.start_time))
    setNewEndTime(toDatetimeLocal(station.end_time))
    setNewUnlocksAt(toDatetimeLocal(station.unlocks_at))
    setNewHideUntilUnlocked(station.hide_until_unlocked ?? false)
    setNewNotifyRoles(station.notify_roles || [])
    setNewNotifyLead(String(station.notify_lead_minutes ?? 0))
    setClaimedMsgTranslations(jsonbToTranslations(station.already_claimed_message_override))
    setSuccessMsgTranslations(jsonbToTranslations(station.success_message_override))
    setNotCheckedInMsgTranslations(jsonbToTranslations(station.not_checked_in_message_override))
    setIsManagerOpen(true)
  }

  // Create or Update Dynamic Station
  const handleSaveStation = async () => {
    const titleObj = translationsToJsonb(titleTranslations)
    if (!titleObj || Object.keys(titleObj).length === 0 || !Object.values(titleObj).some(Boolean)) {
      Alert.alert('Validation Error', 'Station title is required in at least one language')
      return
    }

    setIsCreatingStation(true)
    try {
      const descObj = translationsToJsonb(descTranslations)
      const claimedObj = translationsToJsonb(claimedMsgTranslations)
      const successObj = translationsToJsonb(successMsgTranslations)
      const notCheckedObj = translationsToJsonb(notCheckedInMsgTranslations)

      const hasClaimed = Object.values(claimedObj).some(Boolean)
      const hasSuccess = Object.values(successObj).some(Boolean)
      const hasNotChecked = Object.values(notCheckedObj).some(Boolean)

      const payload: any = {
        type_id: newTypeId,
        title: titleObj,
        description: Object.values(descObj).some(Boolean) ? descObj : null,
        location: newLocation.trim() || 'Venue',
        points: Math.max(0, parseInt(newPoints, 10) || 0),
        badge_id: newBadgeId,
        requires_initial_checkin_override: newRequiresCheckin,
        already_claimed_message_override: hasClaimed ? claimedObj : null,
        success_message_override: hasSuccess ? successObj : null,
        not_checked_in_message_override: hasNotChecked ? notCheckedObj : null,
        start_time: newStartTime ? new Date(newStartTime).toISOString() : null,
        end_time: newEndTime ? new Date(newEndTime).toISOString() : null,
        unlocks_at: newUnlocksAt ? new Date(newUnlocksAt).toISOString() : (newStartTime ? new Date(newStartTime).toISOString() : null),
        hide_until_unlocked: newHideUntilUnlocked,
        notify_roles: newNotifyRoles.length > 0 ? newNotifyRoles : null,
        notify_lead_minutes: Math.max(0, parseInt(newNotifyLead, 10) || 0),
        notified_at: null,
        is_active: true,
        event_year: '2026',
      }

      if (editingStation) {
        const { error } = await supabase
          .from('checkpoints')
          .update(payload)
          .eq('id', editingStation.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('checkpoints')
          .insert(payload)
          .select()
          .single()

        if (error) throw error
        if (data) setSelectedStationId(data.id)
      }

      setIsManagerOpen(false)
      setEditingStation(null)
      fetchCheckpoints()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save station')
    } finally {
      setIsCreatingStation(false)
    }
  }

  const handleConfirmDeleteStation = async () => {
    if (!stationToDelete || !isSupabaseConfigured) return
    setIsDeletingStation(true)
    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ is_active: false })
        .eq('id', stationToDelete.id)

      if (error) throw error

      if (selectedStationId === stationToDelete.id) {
        setSelectedStationId(null)
        setLastResult(null)
      }
      if (isManagerOpen) {
        setIsManagerOpen(false)
        setEditingStation(null)
      }
      setStationToDelete(null)
      await fetchCheckpoints()
    } catch (e: any) {
      console.error('Error soft-deleting station:', e)
      Alert.alert('Error', e?.message || 'Could not delete station')
    } finally {
      setIsDeletingStation(false)
    }
  }

  const getTimestamp = (val?: string | null) => {
    if (!val) return 0
    try {
      const t = new Date(val).getTime()
      return isNaN(t) ? 0 : t
    } catch {
      return 0
    }
  }

  const filteredCheckpoints = React.useMemo(() => {
    return checkpoints
      .filter((cp) => {
        if (cp.is_active === false) return false
        const title = getLocalizedText(cp.title, locale).toLowerCase()
        const location = (cp.location || '').toLowerCase()
        const typeId = (cp.type_id || '').toLowerCase()
        const q = stationSearchQuery.trim().toLowerCase()

        const matchesQuery = !q || title.includes(q) || location.includes(q) || typeId.includes(q)
        const matchesCategory = selectedCategoryFilter === 'all' || typeId === selectedCategoryFilter.toLowerCase()

        return matchesQuery && matchesCategory
      })
      .sort((a, b) => {
        const timeA = getTimestamp(a.unlocks_at || a.start_time)
        const timeB = getTimestamp(b.unlocks_at || b.start_time)

        if (timeA !== timeB) {
          if (timeA === 0) return 1
          if (timeB === 0) return -1
          return timeA - timeB
        }

        return getTimestamp(a.created_at) - getTimestamp(b.created_at)
      })
  }, [checkpoints, locale, stationSearchQuery, selectedCategoryFilter])

  const formatStationSchedule = React.useCallback((cp: Checkpoint) => {
    const unlockTime = cp.unlocks_at || cp.start_time
    const endTime = cp.end_time

    if (!unlockTime) {
      return { dateDisplay: t('admin.checkinAlwaysAvailable'), isLockedNow: false }
    }

    try {
      const startD = new Date(unlockTime)
      if (isNaN(startD.getTime())) {
        return { dateDisplay: t('admin.checkinAlwaysAvailable'), isLockedNow: false }
      }

      const now = new Date()
      const isLockedNow = now < startD

      const startStr = startD.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

      if (endTime) {
        const endD = new Date(endTime)
        if (!isNaN(endD.getTime())) {
          const endStr = endD.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })
          return { dateDisplay: `${startStr} - ${endStr}`, isLockedNow }
        }
      }

      return { dateDisplay: `${t('admin.checkinOpens')} ${startStr}`, isLockedNow }
    } catch {
      return { dateDisplay: t('admin.checkinAlwaysAvailable'), isLockedNow: false }
    }
  }, [t])

  return (
    <View style={styles.container}>
      {!selectedStation ? (
        /* STEP 1: STATION MENU HUB VIEW */
        <View style={styles.hubContainer}>
          <View style={[styles.hubHeaderRow, isNarrowHeader && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flex: 1, minWidth: 260 }}>
              <Text style={styles.hubTitle}>{t('admin.checkinStationHubTitle')}</Text>
              <Text style={styles.hubSubtitle}>{t('admin.checkinStationHubSubtitle')}</Text>
            </View>

            {canManageStations && (
              <Pressable onPress={() => setIsManagerOpen(true)} style={styles.createStationPrimaryBtn}>
                <AppIcon name="plus" size={16} color="#ffffff" />
                <Text style={styles.createStationPrimaryBtnText}>{t('admin.checkinCreateNewStation')}</Text>
              </Pressable>
            )}
          </View>

          {/* Search & Category Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.searchBarRow}>
              <AppIcon name="magnifyingglass" size={16} color="#64748b" />
              <TextInput
                value={stationSearchQuery}
                onChangeText={setStationSearchQuery}
                placeholder={t('admin.checkinSearchPlaceholder')}
                placeholderTextColor="#94a3b8"
                style={styles.stationSearchInput}
              />
              {!!stationSearchQuery && (
                <Pressable onPress={() => setStationSearchQuery('')} style={{ padding: 4 }}>
                  <AppIcon name="xmark" size={16} color="#64748b" />
                </Pressable>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setSelectedCategoryFilter('all')}
                  style={[styles.filterChip, selectedCategoryFilter === 'all' && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, selectedCategoryFilter === 'all' && styles.filterChipTextActive]}>
                    {t('admin.checkinAllStations', [checkpoints.length])}
                  </Text>
                </Pressable>

                {checkpointTypes.map((t) => {
                  const typeName = getLocalizedText(t.name, locale) || t.id
                  const isSel = selectedCategoryFilter === t.id
                  const count = checkpoints.filter((c) => (c.type_id || '').toLowerCase() === t.id.toLowerCase()).length

                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedCategoryFilter(t.id)}
                      style={[styles.filterChip, isSel && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                        {typeName.toUpperCase()} ({count})
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </ScrollView>
          </View>

          {/* Station Cards Grid / List */}
          {loadingStations ? (
            <View style={styles.stationGrid}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.stationCard}>
                  <View style={styles.stationCardTopRow}>
                    <Skeleton colorMode="light" width={180} height={17} radius={4} />
                    <Skeleton colorMode="light" width={70} height={18} radius={6} />
                  </View>
                  <Skeleton colorMode="light" width={'80%'} height={12} radius={4} />
                  <View style={styles.stationCardMetaRow}>
                    {[0, 1, 2].map((j) => (
                      <View key={j} style={styles.metaItem}>
                        <Skeleton colorMode="light" width={60} height={9} radius={3} />
                        <View style={{ height: 4 }} />
                        <Skeleton colorMode="light" width={82} height={12} radius={4} />
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Skeleton colorMode="light" width={'100%'} height={44} radius={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredCheckpoints.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <AppIcon name="magnifyingglass" size={32} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyStateTitle}>
                {stationSearchQuery || selectedCategoryFilter !== 'all' ? t('admin.checkinNoMatchingStations') : t('admin.checkinNoStationsCreatedYet')}
              </Text>
              <Text style={styles.emptyStateSub}>
                {stationSearchQuery || selectedCategoryFilter !== 'all'
                  ? t('admin.checkinTryAdjustingFilters')
                  : t('admin.checkinCreateFirstStationHint')}
              </Text>
              {canManageStations && (
                <Pressable onPress={handleOpenCreateModal} style={styles.createStationPrimaryBtn}>
                  <Text style={styles.createStationPrimaryBtnText}>{t('admin.checkinCreateStation')}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.stationGrid}>
              {filteredCheckpoints.map((cp) => {
                const titleText = getLocalizedText(cp.title, locale)
                const descText = getLocalizedText(cp.description, locale)
                const requiresArrival = cp.requires_initial_checkin_override ?? cp.checkpoint_types?.requires_initial_checkin

                return (
                  <View key={cp.id} style={styles.stationCard}>
                    <View style={styles.stationCardTopRow}>
                      <Text style={styles.stationCardTitle}>{titleText}</Text>
                      <View style={styles.stationCategoryBadge}>
                        <Text style={styles.stationCategoryBadgeText}>{(cp.type_id || 'station').toUpperCase()}</Text>
                      </View>
                    </View>

                    {!!descText && <Text style={styles.stationCardDesc}>{descText}</Text>}

                    <View style={styles.stationCardMetaRow}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>{t('admin.checkinLocationLabel')}</Text>
                        <Text style={styles.metaValue}>{cp.location || t('admin.checkinVenueFallback')}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>{t('admin.checkinPrerequisiteLabel')}</Text>
                        <Text style={[styles.metaValue, { color: requiresArrival ? '#F59E0B' : '#10B981' }]}>
                          {requiresArrival ? t('admin.checkinArrivalRequired') : t('admin.checkinOpenAccess')}
                        </Text>
                      </View>
                      {(() => {
                        const { dateDisplay, isLockedNow } = formatStationSchedule(cp)
                        return (
                          <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>{t('admin.checkinScheduleLockLabel')}</Text>
                            <Text style={[styles.metaValue, { color: isLockedNow ? '#F59E0B' : '#0f172a' }]}>
                              {dateDisplay} {cp.hide_until_unlocked ? `(${t('admin.checkinHidden')})` : ''}
                            </Text>
                          </View>
                        )
                      })()}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <Pressable
                        onPress={() => {
                          setSelectedStationId(cp.id)
                          setLastResult(null)
                        }}
                        style={[styles.openStationBtn, { flex: 1 }]}
                      >
                        <Text style={styles.openStationBtnText}>{t('admin.checkinOpenScanner')}</Text>
                        <AppIcon name="chevron.right" size={14} color="#ffffff" />
                      </Pressable>

                      {canManageStations && (
                        <>
                          <Pressable
                            onPress={() => handleOpenEditModal(cp)}
                            style={styles.editStationBtn}
                          >
                            <AppIcon name="pencil" size={14} color="#475569" />
                            <Text style={styles.editStationBtnText}>{t('admin.checkinEdit')}</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => setStationToDelete(cp)}
                            style={styles.deleteStationBtn}
                          >
                            <AppIcon name="trash" size={14} color="#dc2626" />
                            <Text style={styles.deleteStationBtnText}>{t('admin.checkinDelete')}</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      ) : (
        /* STEP 2: ACTIVE STATION SCANNER VIEW */
        <View style={styles.activeScannerContainer}>
          {/* Header Bar with Back Button */}
          {isNarrowHeader ? (
            <View style={styles.activeHeaderBarNarrow}>
              {/* Controls row: icon-only actions */}
              <View style={styles.narrowHeaderControls}>
                <Pressable
                  onPress={() => {
                    setSelectedStationId(null)
                    setLastResult(null)
                  }}
                  style={styles.headerIconBtn}
                  accessibilityLabel={t('admin.checkinAllStationsShort')}
                >
                  <AppIcon name="chevron.left" size={18} color="#c2b75f" />
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.countBadge}>
                    <Text style={styles.countNumber}>{stationCheckInCount}</Text>
                    <Text style={styles.countLabel}>{t('admin.checkinScanned')}</Text>
                  </View>
                  {canManageStations && selectedStation && (
                    <>
                      <Pressable
                        onPress={() => handleOpenEditModal(selectedStation)}
                        style={styles.activeHeaderActionBtn}
                        accessibilityLabel={t('admin.checkinEdit')}
                      >
                        <AppIcon name="pencil" size={16} color="#475569" />
                      </Pressable>
                      <Pressable
                        onPress={() => setStationToDelete(selectedStation)}
                        style={styles.activeHeaderDeleteBtn}
                        accessibilityLabel={t('admin.checkinDelete')}
                      >
                        <AppIcon name="trash" size={16} color="#dc2626" />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>

              {/* Title + classification on their own row */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.activeStationTitle}>{getLocalizedText(selectedStation.title, locale)}</Text>
                  <View style={styles.stationCategoryBadge}>
                    <Text style={styles.stationCategoryBadgeText}>{(selectedStation.type_id || 'station').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.activeStationSub}>
                  {t('admin.checkinLocationDetail', [selectedStation.location || t('admin.checkinVenueFallback'), selectedStation.requires_initial_checkin_override ?? selectedStation.checkpoint_types?.requires_initial_checkin ? t('admin.checkinArrivalRequired') : t('admin.checkinOpenAccess')])}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.activeHeaderBar}>
              <Pressable
                onPress={() => {
                  setSelectedStationId(null)
                  setLastResult(null)
                }}
                style={styles.backToHubBtn}
              >
                <AppIcon name="chevron.left" size={16} color="#c2b75f" />
                <Text style={styles.backToHubBtnText}>{`← ${t('admin.checkinAllStationsShort')}`}</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={styles.activeStationTitle}>{getLocalizedText(selectedStation.title, locale)}</Text>
                  <View style={styles.stationCategoryBadge}>
                    <Text style={styles.stationCategoryBadgeText}>{(selectedStation.type_id || 'station').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.activeStationSub}>
                  {t('admin.checkinLocationDetail', [selectedStation.location || t('admin.checkinVenueFallback'), selectedStation.requires_initial_checkin_override ?? selectedStation.checkpoint_types?.requires_initial_checkin ? t('admin.checkinArrivalRequired') : t('admin.checkinOpenAccess')])}
                </Text>
              </View>

              {canManageStations && selectedStation && (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Pressable
                    onPress={() => handleOpenEditModal(selectedStation)}
                    style={styles.activeHeaderActionBtn}
                  >
                    <AppIcon name="pencil" size={14} color="#475569" />
                    <Text style={styles.activeHeaderActionBtnText}>{t('admin.checkinEdit')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setStationToDelete(selectedStation)}
                    style={styles.activeHeaderDeleteBtn}
                  >
                    <AppIcon name="trash" size={14} color="#dc2626" />
                    <Text style={styles.activeHeaderDeleteBtnText}>{t('admin.checkinDelete')}</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.countBadge}>
                <Text style={styles.countNumber}>{stationCheckInCount}</Text>
                <Text style={styles.countLabel}>{t('admin.checkinScanned')}</Text>
              </View>
            </View>
          )}

          {/* Scanner Controls */}
          <View style={styles.scanSection}>
            <QRCameraScanner onScan={handleProcessCheckIn} isProcessing={isProcessing} />

            <View style={styles.inputRow}>
              <TextInput
                value={scanInput}
                onChangeText={setScanInput}
                placeholder={t('admin.checkinScanPlaceholder')}
                placeholderTextColor="#94a3b8"
                style={styles.scanTextInput}
                onSubmitEditing={() => handleProcessCheckIn(scanInput)}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => handleProcessCheckIn(scanInput)}
                disabled={isProcessing || !scanInput.trim()}
                style={[styles.submitScanBtn, (!scanInput.trim() || isProcessing) && { opacity: 0.5 }]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitScanBtnText}>{t('admin.checkinCheckInButton')}</Text>
                )}
              </Pressable>
            </View>

            <Pressable onPress={() => setIsLookupOpen(true)} style={styles.lookupLink}>
              <AppIcon name="magnifyingglass" size={14} color="#5a0061" />
              <Text style={styles.lookupLinkText}>{t('admin.checkinLookupLink')}</Text>
            </Pressable>
          </View>

          {/* HIG Scan Result Feedback Card */}
          {lastResult && (
            <View
              style={[
                styles.resultCard,
                lastResult.status === 'success' && styles.resultCardSuccess,
                lastResult.status === 'already_claimed' && styles.resultCardWarning,
                (lastResult.status === 'not_checked_in' || lastResult.status === 'error') && styles.resultCardError,
              ]}
            >
              <View style={styles.resultHeader}>
                <AppIcon
                  name={
                    lastResult.status === 'success'
                      ? 'checkmark.circle.fill'
                      : lastResult.status === 'already_claimed'
                      ? 'exclamationmark.triangle.fill'
                      : 'xmark.octagon.fill'
                  }
                  size={28}
                  color={
                    lastResult.status === 'success'
                      ? '#10B981'
                      : lastResult.status === 'already_claimed'
                      ? '#F59E0B'
                      : '#EF4444'
                  }
                />
                <Text style={styles.resultMessageTitle}>
                  {lastResult.status === 'success'
                    ? t('admin.checkinResultSuccess')
                    : lastResult.status === 'already_claimed'
                    ? t('admin.checkinResultAlreadyClaimed')
                    : lastResult.status === 'not_checked_in'
                    ? t('admin.checkinResultInitialRequired')
                    : t('admin.checkinResultBlocked')}
                </Text>
              </View>

              <Text style={styles.resultMessageBody}>{lastResult.message}</Text>

              {/* Scanned Participant Profile Details */}
              {lastResult.userProfile && (
                <View style={styles.resultProfileBox}>
                  <View style={styles.resultAvatarWrapper}>
                    {lastResult.avatarUrl ? (
                      <Image source={{ uri: lastResult.avatarUrl }} style={styles.resultAvatarImage as any} />
                    ) : (
                      <PersonSilhouette size={36} color="#c2b75f" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultUserName}>
                      {lastResult.userProfile.first_name} {lastResult.userProfile.last_name}
                    </Text>
                    <Text style={styles.resultUserRole}>
                      {t('admin.checkinRolesPrefix')} {(lastResult.userProfile.roles || [lastResult.userProfile.role || 'Hacker']).map((r: string) => r.toUpperCase()).join(', ')}
                    </Text>

                    {/* HIG Meal & Dietary Highlights */}
                    <View style={styles.resultHighlightsRow}>
                      {lastResult.userProfile.tshirt_size && (
                        <View style={styles.resultPill}>
                          <Text style={styles.resultPillText}>{t('admin.checkinSizePrefix')} {lastResult.userProfile.tshirt_size.toUpperCase()}</Text>
                        </View>
                      )}
                      {lastResult.userProfile.dietary_restrictions && lastResult.userProfile.dietary_restrictions !== 'none' && (
                        <View style={[styles.resultPill, styles.dietHighlightPill]}>
                          <AppIcon name="leaf.fill" size={12} color="#10B981" />
                          <Text style={[styles.resultPillText, { color: '#10B981', fontWeight: '800' }]}>
                            {t('admin.checkinDietPrefix')} {lastResult.userProfile.dietary_restrictions.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Station Check-In History Log & Revocation Management */}
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.historyTitle}>{t('admin.checkinHistoryTitle')}</Text>
                  <View style={styles.historyCountBadge}>
                    <Text style={styles.historyCountText}>{filteredHistory.length}</Text>
                  </View>
                </View>
                <Text style={styles.historySubtitle}>{t('admin.checkinHistorySubtitle')}</Text>
              </View>

              <Pressable
                onPress={() => selectedStationId && fetchStationHistory(selectedStationId)}
                style={styles.historyRefreshBtn}
              >
                <Text style={styles.historyRefreshBtnText}>{`↻ ${t('admin.checkinRefresh')}`}</Text>
              </Pressable>
            </View>

            {/* Filter Search Input */}
            <View style={styles.historySearchRow}>
              <TextInput
                value={historySearch}
                onChangeText={(val) => {
                  setHistorySearch(val)
                  setHistoryPage(1)
                }}
                placeholder={t('admin.checkinHistorySearchPlaceholder')}
                placeholderTextColor="#94a3b8"
                style={styles.historySearchInput}
              />
            </View>

            {/* Attendees Log List */}
            {historyLoading && historyList.length === 0 ? (
              <View style={{ padding: 28, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#5a0061" />
                <Text style={{ color: '#64748b', marginTop: 8, fontSize: 13 }}>{t('admin.checkinLoadingHistory')}</Text>
              </View>
            ) : filteredHistory.length === 0 ? (
              <View style={styles.historyEmptyBox}>
                <Text style={styles.historyEmptyText}>
                  {historySearch ? t('admin.checkinNoHistorySearchMatch') : t('admin.checkinNoHistoryYet')}
                </Text>
              </View>
            ) : (
              <View style={styles.historyListContainer}>
                {displayedHistory.map((item, idx) => {
                  const globalIdx = filteredHistory.length - ((historyPage - 1) * historyPageSize + idx)
                  const fname = item.profiles?.first_name || ''
                  const lname = item.profiles?.last_name || ''
                  const fullName = `${fname} ${lname}`.trim() || item.profiles?.email?.split('@')[0] || `User #${item.user_id.slice(0, 8)}`
                  const timeFormatted = formatTime(item.created_at)
                  const opName = `${item.operator?.first_name || ''} ${item.operator?.last_name || ''}`.trim()

                  return (
                    <View key={item.id} style={styles.historyRow}>
                      <View style={styles.historyIndexBadge}>
                        <Text style={styles.historyIndexText}>#{globalIdx}</Text>
                      </View>

                      <View style={styles.historyAvatarCircle}>
                        {item.profiles?.avatar_url ? (
                          <Image source={{ uri: item.profiles.avatar_url }} style={styles.historyAvatarImg as any} />
                        ) : (
                          <PersonSilhouette size={20} color="#5a0061" />
                        )}
                      </View>

                      <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
                        <Text style={styles.historyItemName}>{fullName}</Text>
                        <Text style={styles.historyItemEmail}>{item.profiles?.email || item.user_id}</Text>
                        {item.profiles?.university ? (
                          <Text style={styles.historyItemUni}>{item.profiles.university}</Text>
                        ) : null}
                        {opName ? (
                          <Text style={styles.historyCheckedBy}>{t('admin.checkinCheckedBy', { name: opName })}</Text>
                        ) : null}

                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {(() => {
                            const dietInfo = formatDietLabel(item.profiles?.dietary_restrictions)
                            const shirt = formatShirtSize(item.profiles?.tshirt_size)
                            return (
                              <>
                                {dietInfo.isSpecial && (
                                  <View style={styles.dietPillBadge}>
                                    <Text style={styles.dietPillBadgeText}>{dietInfo.label}</Text>
                                  </View>
                                )}
                                {shirt ? (
                                  <View style={styles.shirtPillBadge}>
                                    <Text style={styles.shirtPillBadgeText}>Size: {shirt}</Text>
                                  </View>
                                ) : null}
                              </>
                            )
                          })()}
                        </View>
                      </View>

                      <View style={styles.historyTimeCol}>
                        <AppIcon name="clock.fill" size={12} color="#64748b" />
                        <Text style={styles.historyTimeText}>{timeFormatted}</Text>
                      </View>

                      {canManageStations ? (
                        <Pressable
                          onPress={() => setRevokeModalTarget(item)}
                          disabled={revokingId === item.id}
                          style={[styles.revokeBtn, revokingId === item.id && { opacity: 0.5 }]}
                        >
                          {revokingId === item.id ? (
                            <ActivityIndicator size="small" color="#dc2626" />
                          ) : (
                            <>
                              <AppIcon name="xmark" size={12} color="#dc2626" />
                              <Text style={styles.revokeBtnText}>{t('admin.checkinRevoke')}</Text>
                            </>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  )
                })}

                {/* Pagination */}
                <AdminPaginationBar
                  currentPage={historyPage}
                  totalPages={totalHistoryPages}
                  pageSize={historyPageSize}
                  onPageChange={setHistoryPage}
                  onPageSizeChange={(size) => {
                    setHistoryPageSize(size)
                    setHistoryPage(1)
                  }}
                  totalItems={filteredHistory.length}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Search Participant Lookup Modal */}
      <Modal visible={isLookupOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('admin.checkinSearchParticipant')}</Text>
              <Pressable onPress={() => setIsLookupOpen(false)}>
                <AppIcon name="xmark" size={20} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.modalSearchRow}>
              <View style={styles.modalSearchInputWrapper}>
                <AppIcon name="magnifyingglass" size={16} color="#64748b" />
                <TextInput
                  value={lookupQuery}
                  onChangeText={setLookupQuery}
                  placeholder={t('admin.checkinSearchParticipantPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  style={styles.modalSearchInput}
                  onSubmitEditing={() => handleSearchLookup()}
                  autoCapitalize="none"
                />
                {!!lookupQuery && (
                  <Pressable onPress={() => { setLookupQuery(''); setLookupResults([]); }} style={{ padding: 4 }}>
                    <AppIcon name="xmark" size={14} color="#64748b" />
                  </Pressable>
                )}
              </View>
              <Pressable onPress={() => handleSearchLookup()} style={styles.modalSearchBtn}>
                <Text style={styles.modalSearchBtnText}>{t('admin.checkinSearchButton')}</Text>
              </Pressable>
            </View>

            {isSearchingLookup ? (
              <ActivityIndicator size="small" color="#5a0061" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ position: 'relative', width: '100%', maxHeight: 340, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#ffffff', 'rgba(255, 255, 255, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    height: 16,
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                />
                <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, paddingHorizontal: 4 }} showsVerticalScrollIndicator={false}>
                  {lookupResults.length === 0 && !!lookupQuery && !isSearchingLookup && (
                    <Text style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 13 }}>
                      {t('admin.checkinNoParticipantsFound', [lookupQuery])}
                    </Text>
                  )}
                  {lookupResults.map((item) => {
                    const dietInfo = formatDietLabel(item.dietary_restrictions)
                    const shirt = formatShirtSize(item.tshirt_size)
                    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email?.split('@')[0] || `User #${item.id.slice(0, 8)}`

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setIsLookupOpen(false)
                          handleProcessCheckIn(item.id)
                        }}
                        style={styles.lookupItem}
                      >
                        <View style={styles.lookupAvatarCircle}>
                          {item.avatar_url ? (
                            <Image source={{ uri: item.avatar_url }} style={styles.lookupAvatarImg as any} />
                          ) : (
                            <PersonSilhouette size={20} color="#5a0061" />
                          )}
                        </View>

                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.lookupItemName}>{fullName}</Text>
                          {item.email ? (
                            <Text style={styles.lookupItemEmail}>{item.email}</Text>
                          ) : null}
                          {item.university ? (
                            <Text style={styles.lookupItemUni}>{item.university}</Text>
                          ) : null}

                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {dietInfo.isSpecial && (
                              <View style={styles.dietPillBadge}>
                                <Text style={styles.dietPillBadgeText}>{dietInfo.label}</Text>
                              </View>
                            )}
                            {shirt ? (
                              <View style={styles.shirtPillBadge}>
                                <Text style={styles.shirtPillBadgeText}>Size: {shirt}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.lookupCheckInAction}>
                          <Text style={styles.lookupCheckInActionText}>{t('admin.checkinSelect')}</Text>
                          <AppIcon name="chevron.right" size={12} color="#5a0061" />
                        </View>
                      </Pressable>
                    )
                  })}
                </ScrollView>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0)', '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 20,
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Dynamic Station Manager Modal */}
      <Modal visible={isManagerOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingStation ? t('admin.checkinEditStationModalTitle') : t('admin.checkinCreateStationModalTitle')}</Text>
              <Pressable onPress={() => setIsManagerOpen(false)}>
                <AppIcon name="xmark" size={20} color="#64748b" />
              </Pressable>
            </View>

            <View style={{ position: 'relative', width: '100%', maxHeight: 460, overflow: 'hidden' }}>
              {/* Top Vertical White Fade */}
              <LinearGradient
                colors={['#ffffff', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 18,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />

              <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 28, paddingHorizontal: 4 }} showsVerticalScrollIndicator={false}>
                <TranslationsEditor
                  title={t('admin.checkinTranslationStationTitle')}
                  translations={titleTranslations}
                  setTranslations={setTitleTranslations}
                  placeholder={t('admin.checkinStationTitlePlaceholder')}
                />

                <TranslationsEditor
                  title={t('admin.checkinTranslationDescription')}
                  translations={descTranslations}
                  setTranslations={setDescTranslations}
                  placeholder={t('admin.checkinDescriptionPlaceholder')}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
                  <Text style={styles.fieldLabel}>{t('admin.checkinCategoryTypeLabel')}</Text>
                  <Pressable onPress={() => setIsCreateTypeOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#5a0061', fontSize: 12, fontWeight: '800' }}>{t('admin.checkinCreateNewType')}</Text>
                  </Pressable>
                </View>

                <View style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
                  {/* Left White Fade */}
                  <LinearGradient
                    colors={['#ffffff', 'rgba(255, 255, 255, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 24,
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ width: '100%' }}
                    contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 6 }}
                  >
                    <View style={styles.typeSelectorRow}>
                      {checkpointTypes.map((t) => {
                        const typeName = getLocalizedText(t.name, locale) || t.id
                        const isSel = newTypeId === t.id
                        return (
                          <Pressable
                            key={t.id}
                            onPress={() => {
                              setNewTypeId(t.id)
                              if (t.requires_initial_checkin !== undefined) {
                                setNewRequiresCheckin(t.requires_initial_checkin)
                              }
                            }}
                            style={[styles.typeChip, isSel && styles.typeChipActive]}
                          >
                            <Text numberOfLines={1} style={[styles.typeChipText, isSel && styles.typeChipTextActive]}>
                              {typeName.toUpperCase()}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </ScrollView>

                  {/* Right White Fade */}
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0)', '#ffffff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 32,
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />
                </View>

                <Text style={styles.fieldLabel}>{t('admin.checkinLocationFieldLabel')}</Text>
                <TextInput
                  value={newLocation}
                  onChangeText={setNewLocation}
                  placeholder={t('admin.checkinLocationPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  style={styles.modalInput}
                />

                <Text style={styles.fieldLabel}>{t('admin.checkinPointsLabel')}</Text>
                <TextInput
                  value={newPoints}
                  onChangeText={(v) => setNewPoints(v.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  style={styles.modalInput}
                />

                <Text style={styles.fieldLabel}>{t('admin.checkinBadgeLabel')}</Text>
                {badges.length === 0 ? (
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                    {t('admin.awardNoBadges')}
                  </Text>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                    <Pressable
                      onPress={() => setNewBadgeId(null)}
                      style={[styles.badgePickTile, newBadgeId === null && styles.badgePickTileSelected]}
                    >
                      <Text style={styles.badgePickNone}>{t('admin.checkinBadgeNone')}</Text>
                    </Pressable>
                    {badges.map((b) => {
                      const isSel = newBadgeId === b.id
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setNewBadgeId(isSel ? null : b.id)}
                          style={[styles.badgePickTile, isSel && styles.badgePickTileSelected]}
                        >
                          <BadgeIcon svgUrl={iconPublicUrl(b.icon)} color={isSel ? b.color || '#c2b75f' : '#94a3b8'} size={28} />
                          <Text style={styles.badgePickText} numberOfLines={1}>{localizeText(b.name, locale) || b.id}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                )}

                <Text style={styles.fieldLabel}>{t('admin.checkinOpeningUnlockLabel')}</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="datetime-local"
                    value={newUnlocksAt}
                    onChange={(e: any) => setNewUnlocksAt(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: 14,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none',
                      marginBottom: 10,
                    } as any}
                  />
                ) : (
                  <TextInput
                    value={newUnlocksAt}
                    onChangeText={setNewUnlocksAt}
                    placeholder="YYYY-MM-DDTHH:mm"
                    placeholderTextColor="#94a3b8"
                    style={styles.modalInput}
                  />
                )}

                <Text style={styles.fieldLabel}>{t('admin.checkinClosingUnlockLabel')}</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="datetime-local"
                    value={newEndTime}
                    onChange={(e: any) => setNewEndTime(e.target.value)}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: 14,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none',
                      marginBottom: 10,
                    } as any}
                  />
                ) : (
                  <TextInput
                    value={newEndTime}
                    onChangeText={setNewEndTime}
                    placeholder="YYYY-MM-DDTHH:mm"
                    placeholderTextColor="#94a3b8"
                    style={styles.modalInput}
                  />
                )}

                <Pressable
                  onPress={() => setNewRequiresCheckin(!newRequiresCheckin)}
                  style={styles.checkinToggleRow}
                >
                  <AppIcon
                    name={newRequiresCheckin ? 'checkmark.square.fill' : 'square'}
                    size={20}
                    color="#5a0061"
                  />
                  <Text style={styles.checkinToggleText}>{t('admin.checkinRequiresInitialArrival')}</Text>
                </Pressable>

                <Pressable
                  onPress={() => setNewHideUntilUnlocked(!newHideUntilUnlocked)}
                  style={styles.checkinToggleRow}
                >
                  <AppIcon
                    name={newHideUntilUnlocked ? 'checkmark.square.fill' : 'square'}
                    size={20}
                    color="#5a0061"
                  />
                  <Text style={styles.checkinToggleText}>{t('admin.checkinHideUntilOpen')}</Text>
                </Pressable>

                {/* Scheduled "starting" push to specific roles */}
                <View style={{ gap: 6, marginTop: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t('admin.checkinNotifyRoles')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {notifyRoleOptions.map((r) => {
                      const sel = newNotifyRoles.includes(r)
                      return (
                        <Pressable
                          key={r}
                          onPress={() =>
                            setNewNotifyRoles((prev) =>
                              prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                            )
                          }
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: sel ? '#5a0061' : '#cbd5e1',
                            backgroundColor: sel ? '#ede9fe' : '#ffffff',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? '#5a0061' : '#475569' }}>
                            {r.toUpperCase()}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                  {newNotifyRoles.length > 0 ? (
                    <View style={{ gap: 4, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t('admin.checkinNotifyLead')}</Text>
                      <TextInput
                        value={newNotifyLead}
                        onChangeText={(v) => setNewNotifyLead(v.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        style={{
                          backgroundColor: '#ffffff',
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 13,
                          color: '#0f172a',
                        }}
                      />
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 11, color: '#64748b' }}>{t('admin.checkinNotifyHint')}</Text>
                </View>

                <TranslationsEditor
                  title={t('admin.checkinClaimedOverrideTitle')}
                  translations={claimedMsgTranslations}
                  setTranslations={setClaimedMsgTranslations}
                  placeholder={t('admin.checkinClaimedOverridePlaceholder')}
                />

                <TranslationsEditor
                  title={t('admin.checkinSuccessOverrideTitle')}
                  translations={successMsgTranslations}
                  setTranslations={setSuccessMsgTranslations}
                  placeholder={t('admin.checkinSuccessOverridePlaceholder')}
                />

                <TranslationsEditor
                  title={t('admin.checkinNotCheckedInOverrideTitle')}
                  translations={notCheckedInMsgTranslations}
                  setTranslations={setNotCheckedInMsgTranslations}
                  placeholder={t('admin.checkinNotCheckedInOverridePlaceholder')}
                />
              </ScrollView>

              {/* Bottom Vertical White Fade */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0)', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 24,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {editingStation && (
                <Pressable
                  onPress={() => setStationToDelete(editingStation)}
                  style={styles.deleteStationModalBtn}
                >
                  <AppIcon name="trash" size={16} color="#dc2626" />
                  <Text style={styles.deleteStationModalBtnText}>{t('admin.checkinDeleteStationBtn')}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleSaveStation}
                disabled={isCreatingStation}
                style={[styles.saveStationBtn, { flex: 1, marginTop: 0 }]}
              >
                {isCreatingStation ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveStationBtnText}>{editingStation ? t('admin.checkinSaveChanges') : t('admin.checkinCreateStationBtn')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create New Station Category Type Sub-Modal */}
      <Modal visible={isCreateTypeOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('admin.checkinCreateStationTypeTitle')}</Text>
              <Pressable onPress={() => setIsCreateTypeOpen(false)}>
                <AppIcon name="xmark" size={20} color="#64748b" />
              </Pressable>
            </View>

            <View style={{ position: 'relative', width: '100%', maxHeight: 420, overflow: 'hidden' }}>
              {/* Top Vertical White Fade */}
              <LinearGradient
                colors={['#ffffff', 'rgba(255, 255, 255, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 18,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />

              <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 28, paddingHorizontal: 4 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>{t('admin.checkinTypeIdLabel')}</Text>
                <TextInput
                  value={newTypeIdKey}
                  onChangeText={setNewTypeIdKey}
                  placeholder={t('admin.checkinTypeIdPlaceholder')}
                  placeholderTextColor="#94a3b8"
                  style={styles.modalInput}
                  autoCapitalize="none"
                />

                <TranslationsEditor
                  title={t('admin.checkinTypeNameTitle')}
                  translations={typeNameTranslations}
                  setTranslations={setTypeNameTranslations}
                  placeholder={t('admin.checkinTypeNamePlaceholder')}
                />

                <Pressable
                  onPress={() => setTypeRequiresCheckin(!typeRequiresCheckin)}
                  style={styles.checkinToggleRow}
                >
                  <AppIcon
                    name={typeRequiresCheckin ? 'checkmark.square.fill' : 'square'}
                    size={20}
                    color="#5a0061"
                  />
                  <Text style={styles.checkinToggleText}>{t('admin.checkinTypeRequiresInitialArrival')}</Text>
                </Pressable>

                <TranslationsEditor
                  title={t('admin.checkinTypeClaimedTitle')}
                  translations={typeClaimedTranslations}
                  setTranslations={setTypeClaimedTranslations}
                  placeholder={t('admin.checkinTypeClaimedPlaceholder')}
                />

                <TranslationsEditor
                  title={t('admin.checkinTypeSuccessTitle')}
                  translations={typeSuccessTranslations}
                  setTranslations={setTypeSuccessTranslations}
                  placeholder={t('admin.checkinTypeSuccessPlaceholder')}
                />

                <TranslationsEditor
                  title={t('admin.checkinTypeNotCheckedInTitle')}
                  translations={typeNotCheckedInTranslations}
                  setTranslations={setTypeNotCheckedInTranslations}
                  placeholder={t('admin.checkinTypeNotCheckedInPlaceholder')}
                />
              </ScrollView>

              {/* Bottom Vertical White Fade */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0)', '#ffffff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 24,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
            </View>

            <Pressable
              onPress={handleCreateType}
              disabled={isSavingType}
              style={styles.saveStationBtn}
            >
              {isSavingType ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveStationBtnText}>{t('admin.checkinSaveStationType')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Revoke Check-in Confirmation Modal */}
      {revokeModalTarget && (
        <Modal visible animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.revokeConfirmCard}>
              <View style={styles.revokeWarningIcon}>
                <AppIcon name="xmark.octagon.fill" size={32} color="#dc2626" />
              </View>
              <Text style={styles.revokeConfirmTitle}>{t('admin.checkinRevokeTitle')}</Text>
              <Text style={styles.revokeConfirmBody}>
                {t('admin.checkinRevokeBodyStart')}{' '}
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                  {`${revokeModalTarget.profiles?.first_name || ''} ${revokeModalTarget.profiles?.last_name || ''}`.trim() || revokeModalTarget.profiles?.email || t('admin.checkinThisAttendee')}
                </Text>
                ?
              </Text>
              <Text style={styles.revokeConfirmWarning}>{t('admin.checkinRevokeWarning')}</Text>

              <View style={styles.revokeModalActions}>
                <Pressable
                  onPress={() => setRevokeModalTarget(null)}
                  style={styles.revokeCancelBtn}
                >
                  <Text style={styles.revokeCancelBtnText}>{t('admin.checkinCancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRevokeCheckIn(revokeModalTarget)}
                  disabled={revokingId === revokeModalTarget.id}
                  style={styles.revokeSubmitBtn}
                >
                  {revokingId === revokeModalTarget.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.revokeSubmitBtnText}>{t('admin.checkinRevokeConfirmButton')}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete Checkpoint Station Confirmation Modal */}
      {stationToDelete && (
        <Modal visible animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.revokeConfirmCard}>
              <View style={styles.revokeWarningIcon}>
                <AppIcon name="trash" size={30} color="#dc2626" />
              </View>
              <Text style={styles.revokeConfirmTitle}>{t('admin.checkinDeleteStationTitle')}</Text>
              <Text style={styles.revokeConfirmBody}>
                {t('admin.checkinDeleteStationBodyStart')}{' '}
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                  "{getLocalizedText(stationToDelete.title, locale) || t('admin.checkinThisStation')}"
                </Text>
                ?
              </Text>
              <Text style={styles.revokeConfirmWarning}>{t('admin.checkinDeleteStationWarning')}</Text>

              <View style={styles.revokeModalActions}>
                <Pressable
                  onPress={() => !isDeletingStation && setStationToDelete(null)}
                  disabled={isDeletingStation}
                  style={styles.revokeCancelBtn}
                >
                  <Text style={styles.revokeCancelBtnText}>{t('admin.checkinCancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDeleteStation}
                  disabled={isDeletingStation}
                  style={styles.revokeSubmitBtn}
                >
                  {isDeletingStation ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.revokeSubmitBtnText}>{t('admin.checkinConfirmDeletion')}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // Check-In History Styles
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
    gap: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  historySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  historyRefreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyRefreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a0061',
  },
  historySearchRow: {
    width: '100%',
  },
  historySearchInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  historyEmptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  historyListContainer: {
    width: '100%',
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexWrap: 'wrap',
  },
  historyIndexBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  historyAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  historyAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  historyItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  historyItemEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  historyItemUni: {
    fontSize: 11,
    color: '#94a3b8',
  },
  historyCheckedBy: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5a0061',
    marginTop: 2,
  },
  historyTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyTimeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  revokeConfirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  revokeWarningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  revokeConfirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  revokeConfirmBody: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  revokeConfirmWarning: {
    fontSize: 13,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    width: '100%',
  },
  revokeModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  revokeCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  revokeCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  revokeSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  revokeSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  container: {
    width: '100%',
    gap: 16,
  },
  // Hub Styles
  // Hub Styles
  hubContainer: {
    gap: 16,
  },
  hubHeaderRow: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90,0,97,0.12)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  hubTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22002c',
    letterSpacing: -0.3,
  },
  hubSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    lineHeight: 18,
  },
  createStationPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5a0061',
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  createStationPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  stationSearchInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  filterChipActive: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  stationGrid: {
    gap: 12,
  },
  stationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stationCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  stationCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  stationCategoryBadge: {
    backgroundColor: 'rgba(90, 0, 97, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.2)',
  },
  stationCategoryBadgeText: {
    color: '#5a0061',
    fontSize: 10,
    fontWeight: '900',
  },
  stationCardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -4,
  },
  stationCardMetaRow: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  openStationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingVertical: 12,
  },
  openStationBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  editStationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  editStationBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteStationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteStationBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '800',
  },
  activeHeaderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  activeHeaderActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  activeHeaderDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  activeHeaderDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  deleteStationModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    justifyContent: 'center',
  },
  deleteStationModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 36,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 360,
  },
  // Active Scanner Styles
  activeScannerContainer: {
    gap: 16,
  },
  activeHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexWrap: 'wrap',
  },
  backToHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  activeHeaderBarNarrow: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  narrowHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerIconBtn: {
    backgroundColor: '#f1f5f9',
    padding: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToHubBtnText: {
    color: '#5a0061',
    fontSize: 12,
    fontWeight: '800',
  },
  activeStationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeStationTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  activeStationSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: '#fdf4ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.2)',
  },
  countNumber: {
    color: '#5a0061',
    fontSize: 18,
    fontWeight: '900',
  },
  countLabel: {
    color: '#701a75',
    fontSize: 9,
    fontWeight: '700',
  },
  prereqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  prereqText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  scanSection: {
    gap: 10,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scanTextInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    color: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  submitScanBtn: {
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitScanBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  lookupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  lookupLinkText: {
    color: '#5a0061',
    fontSize: 12,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  resultCardSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  resultCardWarning: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  resultCardError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  resultMessageTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultMessageBody: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  resultAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3d0042',
  },
  resultAvatarImage: {
    width: '100%',
    height: '100%',
  },
  resultUserName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  resultUserRole: {
    color: '#c2b75f',
    fontSize: 11,
    fontWeight: '700',
  },
  resultHighlightsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  resultPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dietHighlightPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Modal Styles (Platform Standard White Cards)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      } as any,
    }),
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '95%',
    maxWidth: 580,
    maxHeight: '90%',
    ...Platform.select({
      web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' } as any,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    height: 44,
  },
  modalSearchInputWrapper: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  modalSearchBtn: {
    height: 44,
    backgroundColor: '#5a0061',
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  lookupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  lookupAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lookupAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  lookupItemName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  lookupItemEmail: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  lookupItemUni: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  dietPillBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignSelf: 'flex-start',
  },
  dietPillBadgeText: {
    color: '#065f46',
    fontSize: 11,
    fontWeight: '800',
  },
  shirtPillBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignSelf: 'flex-start',
  },
  shirtPillBadgeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
  },
  lookupCheckInAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
  },
  lookupCheckInActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5a0061',
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    marginBottom: 6,
  },
  badgePickTile: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  badgePickTileSelected: { borderColor: '#5a0061', backgroundColor: '#faf5fb' },
  badgePickText: { fontSize: 11, fontWeight: '700', color: '#334155', textAlign: 'center' },
  badgePickNone: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  typeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  typeChipActive: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  typeChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  checkinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  checkinToggleText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  // Camera & Web Scanner Styles
  startCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.4)',
  },
  startCameraBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  webVideoContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#5a0061',
  },
  webVideoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveRecordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  liveCameraText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stopCameraBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cameraErrorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  cameraErrorText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
  saveStationBtn: {
    backgroundColor: '#5a0061',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveStationBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
})



function TranslationsEditor({
  title,
  translations,
  setTranslations,
  placeholder,
  compact = false,
}: {
  title: string
  translations: Translation[]
  setTranslations: (value: Translation[]) => void
  placeholder: string
  compact?: boolean
}) {
  const update = (index: number, key: keyof Translation, value: string) =>
    setTranslations(
      translations.map((translation, i) => (i === index ? { ...translation, [key]: value } : translation))
    )

  return (
    <View style={{ gap: 6, marginBottom: 12 }}>
      <Text style={{ fontSize: compact ? 11 : 12, fontWeight: '800', color: '#475569', letterSpacing: 0.5 }}>
        {title}
      </Text>
      {translations.map((translation, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TextInput
            style={[
              styles.modalInput,
              { width: 68, textAlign: 'center', fontWeight: '700' },
            ]}
            placeholder="key"
            placeholderTextColor="#94a3b8"
            value={translation.key}
            onChangeText={(value) => update(index, 'key', value)}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.modalInput, { flex: 1 }]}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            value={translation.value}
            onChangeText={(value) => update(index, 'value', value)}
          />
          {translations.length > 1 && (
            <Pressable
              onPress={() => setTranslations(translations.filter((_, i) => i !== index))}
              style={{ paddingHorizontal: 8 }}
            >
              <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '900' }}>×</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={() => setTranslations([...translations, { key: 'es', value: '' }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <AppIcon name="plus" size={12} color="#5a0061" />
        <Text style={{ fontSize: 12, color: '#5a0061', fontWeight: '800' }}>Add translation key</Text>
      </Pressable>
    </View>
  )
}
