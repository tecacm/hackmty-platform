import { useState, useEffect, useCallback } from 'react'
import { AppState, Platform } from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { sendAnnouncement } from 'app/services/notification-service'

export interface AnnouncementItem {
  id: string
  title: string | { en: string; es?: string } | any
  message: string | { en: string; es?: string } | any
  media_url?: string | null
  media_type?: 'image' | 'video' | null
  target_roles?: string[] | null
  author_id?: string | null
  author_name: string
  author_avatar_url?: string | null
  likes_count: number
  created_at: string
}

export interface CreateAnnouncementInput {
  title: string | { en: string; es?: string }
  message: string | { en: string; es?: string }
  title_es?: string
  message_es?: string
  targetRoles: string[]
  mediaFile?: any
  mediaType?: 'image' | 'video'
  sendNotifications?: boolean
  notificationChannel?: 'both' | 'push' | 'email' | 'none'
  removeMedia?: boolean
  existingMediaUrl?: string | null
}

const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'mock-1',
    title: {
      en: '🚀 Welcome to HackMTY 2026!',
      es: '🚀 ¡Bienvenidos a HackMTY 2026!',
    },
    message: {
      en: 'Hacking has officially begun! Check the schedule for workshop locations, mentor office hours, and meal times. Good luck to all teams!',
      es: '¡El hackathon ha comenzado oficialmente! Consulta el itinerario para talleres, asesorías de mentores y comidas. ¡Mucho éxito a todos los equipos!',
    },
    target_roles: ['all'],
    author_name: 'HackMTY Staff',
    likes_count: 42,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'mock-2',
    title: {
      en: '🍕 Dinner is Served in Main Cafeteria',
      es: '🍕 La cena está servida en la cafetería principal',
    },
    message: {
      en: 'Head over to the central dining hall for dinner. Vegetarian and gluten-free options are available at Station 3.',
      es: 'Pasa al comedor central para la cena. Opciones vegetarianas y sin gluten disponibles en la Estación 3.',
    },
    target_roles: ['all'],
    author_name: 'Logistics Team',
    likes_count: 29,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'mock-3',
    title: {
      en: '💡 Mentor Office Hours & Tech Support',
      es: '💡 Asesorías con Mentores y Soporte Técnico',
    },
    message: {
      en: 'Need help with AI models, cloud deployments, or DB connections? Mentors are available in Zone B. Request assistance via the platform mentor portal.',
      es: '¿Necesitas ayuda con modelos de IA, despliegue en la nube o bases de datos? Los mentores están listos en la Zona B.',
    },
    target_roles: ['hacker', 'mentor'],
    author_name: 'Mentorship Team',
    likes_count: 18,
    created_at: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
  },
]

import { useUserPermissions } from 'app/hooks/use-user-permissions'

export function useAnnouncements() {
  const { role, hasPermission } = useUserPermissions()
  const [rawAnnouncements, setRawAnnouncements] = useState<AnnouncementItem[]>([])
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncements = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setError(null)

    if (!isSupabaseConfigured) {
      setRawAnnouncements(MOCK_ANNOUNCEMENTS)
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      let data: any[] | null = null

      // Try relational query first (supported once DB migration is executed)
      const { data: relData, error: relErr } = await supabase
        .from('announcements')
        .select('*, profiles:author_id(avatar_url)')
        .order('created_at', { ascending: false })

      if (!relErr && relData) {
        data = relData
      } else {
        // Graceful fallback to flat query if foreign key migration hasn't been executed yet
        const { data: flatData, error: flatErr } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
        if (flatErr) throw flatErr
        data = flatData
      }

      const { data: { session } } = await supabase.auth.getSession()
      const currentUserId = session?.user?.id

      // Profiles are private outside a user's team. This RPC returns only the
      // author avatar paths for announcements the viewer is allowed to read.
      const { data: visibleAuthors, error: authorsError } = await supabase
        .rpc('get_visible_announcement_authors')
      if (authorsError) console.warn('Could not load announcement author avatars:', authorsError.message)
      const authorAvatarPaths = new Map<string, string>()
      visibleAuthors?.forEach((author: any) => {
        if (author.author_id && author.avatar_url) authorAvatarPaths.set(author.author_id, author.avatar_url)
      })

      let currentUserAvatarUrl: string | null = null
      if (currentUserId) {
        try {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', currentUserId)
            .maybeSingle()
          if (myProfile?.avatar_url) {
            currentUserAvatarUrl = supabase.storage
              .from('avatars')
              .getPublicUrl(myProfile.avatar_url).data.publicUrl
          }
        } catch (_) {}
      }

      const itemsWithAvatars = (data || []).map((item: any) => {
        let resolvedAvatar: string | null = item.author_avatar_url || null
        if (!resolvedAvatar && item.profiles?.avatar_url) {
          resolvedAvatar = supabase.storage
            .from('avatars')
            .getPublicUrl(item.profiles.avatar_url).data.publicUrl
        }
        if (!resolvedAvatar && item.author_id && authorAvatarPaths.has(item.author_id)) {
          const path = authorAvatarPaths.get(item.author_id)!
          resolvedAvatar = path.startsWith('http') ? path : supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
        }
        if (!resolvedAvatar && item.author_id === currentUserId && currentUserAvatarUrl) {
          resolvedAvatar = currentUserAvatarUrl
        }
        return {
          ...item,
          author_avatar_url: resolvedAvatar,
        }
      })

      setRawAnnouncements(itemsWithAvatars)

      if (currentUserId) {
        const { data: likesData } = await supabase
          .from('announcement_likes')
          .select('announcement_id')
          .eq('user_id', currentUserId)

        if (likesData) {
          setUserLikes(new Set(likesData.map((l: any) => l.announcement_id)))
        }
      }
    } catch (err: any) {
      console.warn('Failed to load announcements from DB:', err?.message || err)
      setRawAnnouncements(MOCK_ANNOUNCEMENTS)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()

    // 1. AppState event listener for Native & Web (refetch on foreground / tab active)
    const appStateSub = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchAnnouncements(true)
      }
    })

    // 2. Web browser window focus & network reconnection event listeners
    let handleWebFocus: (() => void) | null = null
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      handleWebFocus = () => fetchAnnouncements(true)
      window.addEventListener('focus', handleWebFocus)
      window.addEventListener('online', handleWebFocus)
    }

    // 3. Periodic 10-second background poll fallback
    const pollInterval = setInterval(() => {
      fetchAnnouncements(true)
    }, 10000)

    // 4. Supabase Realtime WebSockets for instant live updates
    let channel: any = null
    if (isSupabaseConfigured) {
      const channelId = `announcements_realtime_${Date.now()}_${Math.random().toString(36).substring(7)}`
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'announcements' },
          (payload: any) => {
            if (payload.new) {
              setRawAnnouncements(prev => [
                payload.new as AnnouncementItem,
                ...prev.filter(a => a.id !== payload.new.id),
              ])
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'announcements' },
          (payload: any) => {
            if (payload.new) {
              setRawAnnouncements(prev =>
                prev.map(item => (item.id === payload.new.id ? { ...item, ...payload.new } : item))
              )
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'announcements' },
          (payload: any) => {
            if (payload.old?.id) {
              setRawAnnouncements(prev => prev.filter(item => item.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    return () => {
      appStateSub.remove()
      clearInterval(pollInterval)
      if (channel) supabase.removeChannel(channel)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && handleWebFocus) {
        window.removeEventListener('focus', handleWebFocus)
        window.removeEventListener('online', handleWebFocus)
      }
    }
  }, [fetchAnnouncements])

  const refresh = useCallback(() => {
    setRefreshing(true)
    fetchAnnouncements(true)
  }, [fetchAnnouncements])

  const getMediaUploadUrl = useCallback(async (mediaFile: any, mediaType: 'image' | 'video') => {
    if (!mediaFile) return null

    if (!isSupabaseConfigured) {
      if (mediaFile.uri) return mediaFile.uri
      return null
    }

    try {
      const fileExt = mediaFile.name ? mediaFile.name.split('.').pop() : (mediaType === 'video' ? 'mp4' : 'jpg')
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `announcements/${fileName}`

      let fileData = mediaFile.file || mediaFile
      if (typeof mediaFile.uri === 'string' && !mediaFile.file) {
        if (mediaFile.uri.startsWith('file://') || mediaFile.uri.startsWith('blob:') || mediaFile.uri.startsWith('https://') || mediaFile.uri.startsWith('http://')) {
          const response = await fetch(mediaFile.uri)
          fileData = await response.blob()
        }
      }

      const { error: uploadErr } = await supabase.storage
        .from('announcements-media')
        .upload(filePath, fileData, {
          contentType: mediaFile.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          upsert: true,
        })

      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase.storage
        .from('announcements-media')
        .getPublicUrl(filePath)

      return publicUrlData.publicUrl
    } catch (err) {
      console.warn('Failed to upload media file:', err)
      throw err
    }
  }, [])

  const buildLocalizedJson = (value: string | { en?: string; es?: string } | null | undefined, secondaryValue?: string) => {
    const primary = typeof value === 'string' ? value.trim() : (typeof value === 'object' && value ? (value.en || '').trim() : '')
    const secondary = typeof value === 'object' && value ? (value.es || '').trim() : (secondaryValue || '').trim()
    const next: Record<string, string> = {}

    if (primary) next.en = primary
    if (secondary) next.es = secondary

    return Object.keys(next).length > 0 ? next : { en: '' }
  }

  const createAnnouncement = async (input: CreateAnnouncementInput) => {
    const { title, message, targetRoles, mediaFile, mediaType = 'image', sendNotifications = true } = input

    let uploadedMediaUrl: string | null = null
    if (mediaFile) {
      uploadedMediaUrl = await getMediaUploadUrl(mediaFile, mediaType)
    }

    // 2. Resolve author profile name & avatar URL
    let authorName = 'Organizing Team'
    let authorId: string | null = null
    let authorAvatarUrl: string | null = null
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          authorId = session.user.id
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profile) {
            authorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Organizing Team'
            if (profile.avatar_url) {
              authorAvatarUrl = supabase.storage
                .from('avatars')
                .getPublicUrl(profile.avatar_url).data.publicUrl
            }
          }
        }
      } catch (e) {}
    }

    const finalTitle = buildLocalizedJson(title, input.title_es)
    const finalMessage = buildLocalizedJson(message, input.message_es)

    const payload = {
      title: finalTitle,
      message: finalMessage,
      media_url: uploadedMediaUrl,
      media_type: uploadedMediaUrl ? mediaType : null,
      target_roles: targetRoles.length > 0 ? targetRoles : ['all'],
      author_id: authorId,
      author_name: authorName,
      author_avatar_url: authorAvatarUrl,
    }

    // 3. Save to database
    if (isSupabaseConfigured) {
      const { data, error: dbErr } = await supabase
        .from('announcements')
        .insert(payload)
        .select()

      if (dbErr) throw dbErr

      const inserted = Array.isArray(data) ? data[0] : data
      if (inserted) {
        setRawAnnouncements(prev => [inserted, ...prev])
      }
    } else {
      const mockItem: AnnouncementItem = {
        id: `mock-${Date.now()}`,
        ...payload,
        likes_count: 0,
        created_at: new Date().toISOString(),
      }
      setRawAnnouncements(prev => [mockItem, ...prev])
    }

    // 4. Dispatch email and push notifications if requested
    const resolvedChannel = input.notificationChannel || (sendNotifications ? 'both' : 'none')
    if (resolvedChannel !== 'none') {
      try {
        const notifTitle = typeof finalTitle === 'object' && finalTitle !== null
          ? (finalTitle.en || finalTitle.es || '')
          : String(finalTitle || '')
        const notifMsg = typeof finalMessage === 'object' && finalMessage !== null
          ? (finalMessage.en || finalMessage.es || '')
          : String(finalMessage || '')

        await sendAnnouncement({
          title: notifTitle,
          message: notifMsg,
          badge: 'HackMTY Announcement',
          targetRoles,
          channel: resolvedChannel,
        })
      } catch (err) {
        console.warn('Could not dispatch notifications:', err)
      }
    }

    return true
  }

  const updateAnnouncement = async (id: string, input: CreateAnnouncementInput) => {
    const { title, message, targetRoles, mediaFile, mediaType = 'image', sendNotifications = true, removeMedia = false, existingMediaUrl } = input

    let uploadedMediaUrl: string | null = existingMediaUrl ?? null

    if (removeMedia) {
      uploadedMediaUrl = null
    } else if (mediaFile) {
      uploadedMediaUrl = await getMediaUploadUrl(mediaFile, mediaType)
    }

    const finalTitle = buildLocalizedJson(title, input.title_es)
    const finalMessage = buildLocalizedJson(message, input.message_es)

    const payload = {
      title: finalTitle,
      message: finalMessage,
      media_url: uploadedMediaUrl,
      media_type: uploadedMediaUrl ? mediaType : null,
      target_roles: targetRoles.length > 0 ? targetRoles : ['all'],
      updated_at: new Date().toISOString(),
    }

    if (isSupabaseConfigured) {
      const { data, error: dbErr } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle()

      if (dbErr) throw dbErr

      if (!data) throw new Error('Announcement was not found or you no longer have permission to edit it.')

      const updated = data
      setRawAnnouncements(prev => prev.map(item => (item.id === id ? { ...item, ...updated } : item)))
      return updated
    }

    setRawAnnouncements(prev => prev.map(item => (item.id === id ? {
      ...item,
      ...payload,
      title: finalTitle,
      message: finalMessage,
      media_url: uploadedMediaUrl,
      media_type: uploadedMediaUrl ? mediaType : null,
    } : item)))

    if (removeMedia && !mediaFile && !isSupabaseConfigured) {
      setRawAnnouncements(prev => prev.map(item => (item.id === id ? { ...item, media_url: null, media_type: null } : item)))
    }

    // Editing an announcement should not re-notify users. Update requests only persist the
    // changed content and/or media and keep the audience experience quiet.
    return true
  }

  const toggleLike = async (id: string) => {
    const isCurrentlyLiked = userLikes.has(id)

    // Optimistic UI update
    setUserLikes(prev => {
      const next = new Set(prev)
      if (isCurrentlyLiked) next.delete(id)
      else next.add(id)
      return next
    })

    setRawAnnouncements(prev =>
      prev.map(item => {
        if (item.id === id) {
          const delta = isCurrentlyLiked ? -1 : 1
          return { ...item, likes_count: Math.max(0, item.likes_count + delta) }
        }
        return item
      })
    )

    if (!isSupabaseConfigured) return

    try {
      const { error: rpcErr } = await supabase.rpc('toggle_announcement_like', { p_announcement_id: id })

      if (rpcErr) {
        // Fallback to direct table query
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) return

        const currentItem = rawAnnouncements.find(a => a.id === id)
        const currentCount = currentItem ? currentItem.likes_count : 0

        if (isCurrentlyLiked) {
          await supabase.from('announcement_likes').delete().eq('announcement_id', id).eq('user_id', userId)
          await supabase.from('announcements').update({ likes_count: Math.max(0, currentCount - 1) }).eq('id', id)
        } else {
          await supabase.from('announcement_likes').insert({ announcement_id: id, user_id: userId })
          await supabase.from('announcements').update({ likes_count: currentCount + 1 }).eq('id', id)
        }
      }
    } catch (err) {
      console.warn('Failed to persist like toggle:', err)
    }
  }

  const userRoles = (role || 'user').split(',').map(r => r.trim().toLowerCase())
  const isAdminOrOrganizer = userRoles.includes('admin') || userRoles.includes('organizer') || hasPermission('announcements', 'create')

  const announcements = rawAnnouncements.filter(item => {
    if (isAdminOrOrganizer) return true
    const targets = (item.target_roles || ['all']).map(r => r.toLowerCase())
    if (targets.includes('all')) return true
    return targets.some(tr => userRoles.includes(tr))
  })

  return {
    announcements,
    userLikes,
    loading,
    refreshing,
    error,
    refresh,
    createAnnouncement,
    updateAnnouncement,
    toggleLike,
  }
}
