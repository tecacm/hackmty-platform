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
} from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { AppIcon } from 'app/components/app-icon'
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
  } | null
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
  start_time?: string
  end_time?: string
  unlocks_at?: string
  hide_until_unlocked?: boolean
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
  const { role } = useUserPermissions()
  const canManageStations = ['admin', 'organizer'].includes((role || '').toLowerCase())

  const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>([])
  const [selectedStationId, setSelectedStationId] = React.useState<string | null>(null)
  const [loadingStations, setLoadingStations] = React.useState(true)
  const [stationCheckInCount, setStationCheckInCount] = React.useState(0)

  // Station Menu Search & Filter State
  const [stationSearchQuery, setStationSearchQuery] = React.useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string>('all')

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
  const [editingStation, setEditingStation] = React.useState<Checkpoint | null>(null)
  const [isCreatingStation, setIsCreatingStation] = React.useState(false)

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
      const { data, error } = await supabase
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
            avatar_url
          )
        `)
        .eq('checkpoint_id', stationId)
        .order('created_at', { ascending: false })

      if (error) throw error

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
        station.already_claimed_message_override || typeObj?.default_already_claimed_message || 'Already processed at %s'
      )
      const successTemplate = getLocalizedText(
        station.success_message_override || typeObj?.default_success_message || 'Check-in successful at %s'
      )
      const notCheckedInTemplate = getLocalizedText(
        station.not_checked_in_message_override || typeObj?.default_not_checked_in_message || 'User has not completed initial event check-in'
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
        stationTitle: getLocalizedText(station.title) || 'Event Check-In',
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

  // Lookup Search
  const handleSearchLookup = async () => {
    if (!lookupQuery.trim()) return
    setIsSearchingLookup(true)
    try {
      const q = lookupQuery.trim()
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, tshirt_size, dietary_restrictions, teams!profiles_team_id_fkey(name)')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(10)

      setLookupResults(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearchingLookup(false)
    }
  }

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
    setEditingStation(null)
    setTitleTranslations([{ key: 'en', value: '' }, { key: 'es', value: '' }])
    setDescTranslations([{ key: 'en', value: '' }])
    setNewTypeId(checkpointTypes[0]?.id || 'station')
    setNewLocation('')
    setNewRequiresCheckin(true)
    setNewStartTime('')
    setNewEndTime('')
    setNewUnlocksAt('')
    setNewHideUntilUnlocked(false)
    setClaimedMsgTranslations([{ key: 'en', value: '' }])
    setSuccessMsgTranslations([{ key: 'en', value: '' }])
    setNotCheckedInMsgTranslations([{ key: 'en', value: '' }])
    setIsManagerOpen(true)
  }

  const handleOpenEditModal = (station: Checkpoint) => {
    setEditingStation(station)
    setTitleTranslations(jsonbToTranslations(station.title))
    setDescTranslations(jsonbToTranslations(station.description))
    setNewTypeId(station.type_id)
    setNewLocation(station.location || '')
    setNewRequiresCheckin(station.requires_initial_checkin_override ?? station.checkpoint_types?.requires_initial_checkin ?? true)
    setNewStartTime(toDatetimeLocal(station.start_time))
    setNewEndTime(toDatetimeLocal(station.end_time))
    setNewUnlocksAt(toDatetimeLocal(station.unlocks_at))
    setNewHideUntilUnlocked(station.hide_until_unlocked ?? false)
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
        requires_initial_checkin_override: newRequiresCheckin,
        already_claimed_message_override: hasClaimed ? claimedObj : null,
        success_message_override: hasSuccess ? successObj : null,
        not_checked_in_message_override: hasNotChecked ? notCheckedObj : null,
        start_time: newStartTime ? new Date(newStartTime).toISOString() : null,
        end_time: newEndTime ? new Date(newEndTime).toISOString() : null,
        unlocks_at: newUnlocksAt ? new Date(newUnlocksAt).toISOString() : (newStartTime ? new Date(newStartTime).toISOString() : null),
        hide_until_unlocked: newHideUntilUnlocked,
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
        const title = getLocalizedText(cp.title).toLowerCase()
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
  }, [checkpoints, stationSearchQuery, selectedCategoryFilter])

  const formatStationSchedule = React.useCallback((cp: Checkpoint) => {
    const unlockTime = cp.unlocks_at || cp.start_time
    const endTime = cp.end_time

    if (!unlockTime) {
      return { dateDisplay: 'Always Available', isLockedNow: false }
    }

    try {
      const startD = new Date(unlockTime)
      if (isNaN(startD.getTime())) {
        return { dateDisplay: 'Always Available', isLockedNow: false }
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

      return { dateDisplay: `Opens ${startStr}`, isLockedNow }
    } catch {
      return { dateDisplay: 'Always Available', isLockedNow: false }
    }
  }, [])

  return (
    <View style={styles.container}>
      {!selectedStation ? (
        /* STEP 1: STATION MENU HUB VIEW */
        <View style={styles.hubContainer}>
          <View style={styles.hubHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hubTitle}>Checkpoint Station Hub</Text>
              <Text style={styles.hubSubtitle}>
                Select an active station to begin scanning attendee passes and processing check-ins.
              </Text>
            </View>

            {canManageStations && (
              <Pressable onPress={() => setIsManagerOpen(true)} style={styles.createStationPrimaryBtn}>
                <AppIcon name="plus.circle.fill" size={18} color="#ffffff" />
                <Text style={styles.createStationPrimaryBtnText}>+ Create New Station</Text>
              </Pressable>
            )}
          </View>

          {/* Search & Category Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.searchBarRow}>
              <AppIcon name="magnifyingglass" size={18} color="rgba(255, 255, 255, 0.5)" />
              <TextInput
                value={stationSearchQuery}
                onChangeText={setStationSearchQuery}
                placeholder="Search stations by name, location, or category..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                style={styles.stationSearchInput}
              />
              {!!stationSearchQuery && (
                <Pressable onPress={() => setStationSearchQuery('')} style={{ padding: 4 }}>
                  <AppIcon name="xmark" size={16} color="rgba(255, 255, 255, 0.5)" />
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
                    ALL STATIONS ({checkpoints.length})
                  </Text>
                </Pressable>

                {checkpointTypes.map((t) => {
                  const typeName = getLocalizedText(t.name) || t.id
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
            <ActivityIndicator size="large" color="#5a0061" style={{ marginVertical: 40 }} />
          ) : filteredCheckpoints.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <AppIcon name="magnifyingglass" size={32} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyStateTitle}>
                {stationSearchQuery || selectedCategoryFilter !== 'all' ? 'No Matching Stations Found' : 'No Checkpoint Stations Created Yet'}
              </Text>
              <Text style={styles.emptyStateSub}>
                {stationSearchQuery || selectedCategoryFilter !== 'all'
                  ? 'Try adjusting your search query or category filter.'
                  : 'Create your first checkpoint station to start scanning event passes.'}
              </Text>
              <Pressable onPress={handleOpenCreateModal} style={styles.createStationPrimaryBtn}>
                <Text style={styles.createStationPrimaryBtnText}>+ Create Station</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stationGrid}>
              {filteredCheckpoints.map((cp) => {
                const titleText = getLocalizedText(cp.title)
                const descText = getLocalizedText(cp.description)
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
                        <Text style={styles.metaLabel}>LOCATION:</Text>
                        <Text style={styles.metaValue}>{cp.location || 'Venue'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>PREREQUISITE:</Text>
                        <Text style={[styles.metaValue, { color: requiresArrival ? '#F59E0B' : '#10B981' }]}>
                          {requiresArrival ? 'Arrival Check-in Required' : 'Open Access'}
                        </Text>
                      </View>
                      {(() => {
                        const { dateDisplay, isLockedNow } = formatStationSchedule(cp)
                        return (
                          <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>SCHEDULE / LOCK:</Text>
                            <Text style={[styles.metaValue, { color: isLockedNow ? '#F59E0B' : '#0f172a' }]}>
                              {dateDisplay} {cp.hide_until_unlocked ? '(Hidden)' : ''}
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
                        <Text style={styles.openStationBtnText}>Open Scanner</Text>
                        <AppIcon name="chevron.right" size={14} color="#ffffff" />
                      </Pressable>

                      {canManageStations && (
                        <Pressable
                          onPress={() => handleOpenEditModal(cp)}
                          style={styles.editStationBtn}
                        >
                          <AppIcon name="pencil" size={14} color="#475569" />
                          <Text style={styles.editStationBtnText}>Edit</Text>
                        </Pressable>
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
          <View style={styles.activeHeaderBar}>
            <Pressable
              onPress={() => {
                setSelectedStationId(null)
                setLastResult(null)
              }}
              style={styles.backToHubBtn}
            >
              <AppIcon name="chevron.left" size={16} color="#c2b75f" />
              <Text style={styles.backToHubBtnText}>← All Stations</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.activeStationTitle}>{getLocalizedText(selectedStation.title)}</Text>
                <View style={styles.stationCategoryBadge}>
                  <Text style={styles.stationCategoryBadgeText}>{(selectedStation.type_id || 'station').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.activeStationSub}>
                Location: {selectedStation.location || 'Venue'} • {selectedStation.requires_initial_checkin_override ?? selectedStation.checkpoint_types?.requires_initial_checkin ? 'Arrival Check-in Required' : 'Open Access'}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>{stationCheckInCount}</Text>
              <Text style={styles.countLabel}>Scanned</Text>
            </View>
          </View>

          {/* Scanner Controls */}
          <View style={styles.scanSection}>
            <QRCameraScanner onScan={handleProcessCheckIn} isProcessing={isProcessing} />

            <View style={styles.inputRow}>
              <TextInput
                value={scanInput}
                onChangeText={setScanInput}
                placeholder="Scan QR Code or paste User ID (hackmty:2026:user:...)"
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
                  <Text style={styles.submitScanBtnText}>Check In</Text>
                )}
              </Pressable>
            </View>

            <Pressable onPress={() => setIsLookupOpen(true)} style={styles.lookupLink}>
              <AppIcon name="magnifyingglass" size={14} color="#5a0061" />
              <Text style={styles.lookupLinkText}>Search Participant by Name / Email</Text>
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
                    ? 'SUCCESSFUL CHECK-IN'
                    : lastResult.status === 'already_claimed'
                    ? 'ALREADY CLAIMED'
                    : lastResult.status === 'not_checked_in'
                    ? 'INITIAL CHECK-IN REQUIRED'
                    : 'CHECK-IN BLOCKED'}
                </Text>
              </View>

              <Text style={styles.resultMessageBody}>{lastResult.message}</Text>

              {/* Scanned Participant Profile Details */}
              {lastResult.userProfile && (
                <View style={styles.resultProfileBox}>
                  <View style={styles.resultAvatarWrapper}>
                    {lastResult.avatarUrl ? (
                      <Image source={{ uri: lastResult.avatarUrl }} style={styles.resultAvatarImage} />
                    ) : (
                      <PersonSilhouette size={36} color="#c2b75f" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultUserName}>
                      {lastResult.userProfile.first_name} {lastResult.userProfile.last_name}
                    </Text>
                    <Text style={styles.resultUserRole}>
                      Roles: {(lastResult.userProfile.roles || [lastResult.userProfile.role || 'Hacker']).map((r: string) => r.toUpperCase()).join(', ')}
                    </Text>

                    {/* HIG Meal & Dietary Highlights */}
                    <View style={styles.resultHighlightsRow}>
                      {lastResult.userProfile.tshirt_size && (
                        <View style={styles.resultPill}>
                          <Text style={styles.resultPillText}>Size: {lastResult.userProfile.tshirt_size.toUpperCase()}</Text>
                        </View>
                      )}
                      {lastResult.userProfile.dietary_restrictions && lastResult.userProfile.dietary_restrictions !== 'none' && (
                        <View style={[styles.resultPill, styles.dietHighlightPill]}>
                          <AppIcon name="leaf.fill" size={12} color="#10B981" />
                          <Text style={[styles.resultPillText, { color: '#10B981', fontWeight: '800' }]}>
                            DIET: {lastResult.userProfile.dietary_restrictions.toUpperCase()}
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
                  <Text style={styles.historyTitle}>Station Check-In Log</Text>
                  <View style={styles.historyCountBadge}>
                    <Text style={styles.historyCountText}>{filteredHistory.length}</Text>
                  </View>
                </View>
                <Text style={styles.historySubtitle}>
                  Attendees processed at this station in chronological order. Admins can revoke records if needed.
                </Text>
              </View>

              <Pressable
                onPress={() => selectedStationId && fetchStationHistory(selectedStationId)}
                style={styles.historyRefreshBtn}
              >
                <Text style={styles.historyRefreshBtnText}>↻ Refresh</Text>
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
                placeholder="Filter attendees by name, email, university..."
                placeholderTextColor="#94a3b8"
                style={styles.historySearchInput}
              />
            </View>

            {/* Attendees Log List */}
            {historyLoading && historyList.length === 0 ? (
              <View style={{ padding: 28, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#5a0061" />
                <Text style={{ color: '#64748b', marginTop: 8, fontSize: 13 }}>Loading check-in history...</Text>
              </View>
            ) : filteredHistory.length === 0 ? (
              <View style={styles.historyEmptyBox}>
                <Text style={styles.historyEmptyText}>
                  {historySearch ? 'No attendees match your search query.' : 'No attendees checked into this station yet.'}
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

                  return (
                    <View key={item.id} style={styles.historyRow}>
                      <View style={styles.historyIndexBadge}>
                        <Text style={styles.historyIndexText}>#{globalIdx}</Text>
                      </View>

                      <View style={styles.historyAvatarCircle}>
                        {item.profiles?.avatar_url ? (
                          <Image source={{ uri: item.profiles.avatar_url }} style={styles.historyAvatarImg} />
                        ) : (
                          <PersonSilhouette size={20} color="#5a0061" />
                        )}
                      </View>

                      <View style={{ flex: 1, minWidth: 160 }}>
                        <Text style={styles.historyItemName}>{fullName}</Text>
                        <Text style={styles.historyItemEmail}>{item.profiles?.email || item.user_id}</Text>
                        {item.profiles?.university ? (
                          <Text style={styles.historyItemUni}>{item.profiles.university}</Text>
                        ) : null}
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
                              <Text style={styles.revokeBtnText}>Revoke</Text>
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
              <Text style={styles.modalTitle}>Search Participant</Text>
              <Pressable onPress={() => setIsLookupOpen(false)}>
                <AppIcon name="xmark" size={20} color="#64748b" />
              </Pressable>
            </View>

            <View style={styles.modalSearchRow}>
              <TextInput
                value={lookupQuery}
                onChangeText={setLookupQuery}
                placeholder="Search first or last name..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                style={styles.modalSearchInput}
                onSubmitEditing={handleSearchLookup}
              />
              <Pressable onPress={handleSearchLookup} style={styles.modalSearchBtn}>
                <Text style={styles.modalSearchBtnText}>Search</Text>
              </Pressable>
            </View>

            {isSearchingLookup ? (
              <ActivityIndicator size="small" color="#c2b75f" style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ position: 'relative', width: '100%', maxHeight: 300, overflow: 'hidden' }}>
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
                <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, paddingHorizontal: 4 }} showsVerticalScrollIndicator={false}>
                  {lookupResults.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setIsLookupOpen(false)
                        handleProcessCheckIn(item.id)
                      }}
                      style={styles.lookupItem}
                    >
                      <Text style={styles.lookupItemName}>{item.first_name} {item.last_name}</Text>
                      {item.dietary_restrictions && item.dietary_restrictions !== 'none' && (
                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>
                          Diet: {item.dietary_restrictions}
                        </Text>
                      )}
                    </Pressable>
                  ))}
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
              <Text style={styles.modalTitle}>{editingStation ? 'Edit Checkpoint Station' : 'Create New Checkpoint Station'}</Text>
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
                  title="STATION TITLE"
                  translations={titleTranslations}
                  setTranslations={setTitleTranslations}
                  placeholder="e.g. Saturday Lunch"
                />

                <TranslationsEditor
                  title="DESCRIPTION (OPTIONAL)"
                  translations={descTranslations}
                  setTranslations={setDescTranslations}
                  placeholder="Helpful details or instructions for attendees"
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
                  <Text style={styles.fieldLabel}>Category Type:</Text>
                  <Pressable onPress={() => setIsCreateTypeOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#5a0061', fontSize: 12, fontWeight: '800' }}>+ Create New Type</Text>
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
                        const typeName = getLocalizedText(t.name) || t.id
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

                <Text style={styles.fieldLabel}>Location:</Text>
                <TextInput
                  value={newLocation}
                  onChangeText={setNewLocation}
                  placeholder="e.g. Central Cafeteria"
                  placeholderTextColor="#94a3b8"
                  style={styles.modalInput}
                />

                <Text style={styles.fieldLabel}>Opening / Unlock Date & Time (Optional):</Text>
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

                <Text style={styles.fieldLabel}>Closing / End Date & Time (Optional):</Text>
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
                  <Text style={styles.checkinToggleText}>Requires Initial Event Arrival Check-in</Text>
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
                  <Text style={styles.checkinToggleText}>Hide Station from Timeline Until Opening Time</Text>
                </Pressable>

                <TranslationsEditor
                  title="CUSTOM %s CLAIMED MESSAGE OVERRIDE (OPTIONAL)"
                  translations={claimedMsgTranslations}
                  setTranslations={setClaimedMsgTranslations}
                  placeholder="e.g. Meal already claimed at %s"
                />

                <TranslationsEditor
                  title="CUSTOM %s SUCCESS MESSAGE OVERRIDE (OPTIONAL)"
                  translations={successMsgTranslations}
                  setTranslations={setSuccessMsgTranslations}
                  placeholder="e.g. Meal granted successfully at %s"
                />

                <TranslationsEditor
                  title="CUSTOM %s NOT CHECKED IN MESSAGE OVERRIDE (OPTIONAL)"
                  translations={notCheckedInMsgTranslations}
                  setTranslations={setNotCheckedInMsgTranslations}
                  placeholder="e.g. User didn't check in to the event yet"
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
              onPress={handleSaveStation}
              disabled={isCreatingStation}
              style={styles.saveStationBtn}
            >
              {isCreatingStation ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveStationBtnText}>{editingStation ? 'Save Station Changes' : 'Create Station'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Create New Station Category Type Sub-Modal */}
      <Modal visible={isCreateTypeOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Station Type</Text>
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
                <Text style={styles.fieldLabel}>Type ID Key (Slug):</Text>
                <TextInput
                  value={newTypeIdKey}
                  onChangeText={setNewTypeIdKey}
                  placeholder="e.g. swag, booth, karaoke, game"
                  placeholderTextColor="#94a3b8"
                  style={styles.modalInput}
                  autoCapitalize="none"
                />

                <TranslationsEditor
                  title="TYPE NAME"
                  translations={typeNameTranslations}
                  setTranslations={setTypeNameTranslations}
                  placeholder="e.g. Swag Station"
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
                  <Text style={styles.checkinToggleText}>Requires Initial Event Arrival Check-in by Default</Text>
                </Pressable>

                <TranslationsEditor
                  title="DEFAULT %s CLAIMED MESSAGE"
                  translations={typeClaimedTranslations}
                  setTranslations={setTypeClaimedTranslations}
                  placeholder="e.g. Item already claimed at %s"
                />

                <TranslationsEditor
                  title="DEFAULT %s SUCCESS MESSAGE"
                  translations={typeSuccessTranslations}
                  setTranslations={setTypeSuccessTranslations}
                  placeholder="e.g. Item delivered successfully at %s"
                />

                <TranslationsEditor
                  title="DEFAULT %s NOT CHECKED IN MESSAGE"
                  translations={typeNotCheckedInTranslations}
                  setTranslations={setTypeNotCheckedInTranslations}
                  placeholder="e.g. User has not completed initial event check-in"
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
                <Text style={styles.saveStationBtnText}>Save Station Type</Text>
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
              <Text style={styles.revokeConfirmTitle}>Revoke Check-In?</Text>
              <Text style={styles.revokeConfirmBody}>
                Are you sure you want to revoke check-in for{' '}
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                  {`${revokeModalTarget.profiles?.first_name || ''} ${revokeModalTarget.profiles?.last_name || ''}`.trim() || revokeModalTarget.profiles?.email || 'this attendee'}
                </Text>
                ?
              </Text>
              <Text style={styles.revokeConfirmWarning}>
                This will delete their check-in record for this station and remove their event/station access.
              </Text>

              <View style={styles.revokeModalActions}>
                <Pressable
                  onPress={() => setRevokeModalTarget(null)}
                  style={styles.revokeCancelBtn}
                >
                  <Text style={styles.revokeCancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRevokeCheckIn(revokeModalTarget)}
                  disabled={revokingId === revokeModalTarget.id}
                  style={styles.revokeSubmitBtn}
                >
                  {revokingId === revokeModalTarget.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.revokeSubmitBtnText}>Yes, Revoke Check-In</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  hubTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#eaeaea',
  },
  hubSubtitle: {
    fontSize: 13,
    color: '#d2d3d5',
    marginTop: 2,
  },
  createStationPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  stationSearchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      },
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
      web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
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
    gap: 8,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    color: '#0f172a',
    height: 40,
  },
  modalSearchBtn: {
    backgroundColor: '#5a0061',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  modalSearchBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  lookupItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  lookupItemName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
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
      <Pressable onPress={() => setTranslations([...translations, { key: 'es', value: '' }])}>
        <Text style={{ fontSize: 12, color: '#5a0061', fontWeight: '800' }}>+ Add translation key</Text>
      </Pressable>
    </View>
  )
}
