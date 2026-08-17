import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { sanitizeString } from 'app/utils/sanitization'

export interface AnnouncementParams {
  title: string
  message: string
  badge?: string
  targetTeamIds?: string[]
  targetRole?: string
  targetRoles?: string[]
  targetUserIds?: string[]
  channel?: 'both' | 'push' | 'email' | 'none'
}

export interface ApplicationChangesParams {
  applicationId: string
  reason: string
}

export interface ApplicationStatusParams {
  applicationId: string
}

/**
 * Dispatch an announcement (activities, meals, schedule updates, workshops, alerts)
 * Supports targeting specific teams, user roles, or direct user IDs.
 */
export async function sendAnnouncement({
  title,
  message,
  badge = 'Announcement',
  targetTeamIds,
  targetRole,
  targetRoles,
  targetUserIds,
  channel = 'both'
}: AnnouncementParams) {
  if (!isSupabaseConfigured || channel === 'none') return

  const resolvedRole = targetRoles && targetRoles.length > 0 && targetRoles[0] !== 'all' 
    ? targetRoles[0] 
    : targetRole || 'all'

  try {
    const { data, error } = await supabase.functions.invoke('dispatch-notification', {
      body: {
        category: 'announcement',
        title: sanitizeString(title),
        message: sanitizeString(message),
        badge: sanitizeString(badge),
        targetTeamIds,
        targetRole: resolvedRole,
        targetUserIds,
        channel,
      }
    })

    if (error) {
      console.warn('Notification dispatch error:', error.message)
      throw error
    }

    return data
  } catch (err: any) {
    console.error('Failed to send announcement:', err)
    throw err
  }
}

/**
 * Trigger team accountability notifications when changes are requested on a candidate's application
 */
export async function notifyTeamOnChangesRequested({
  applicationId,
  reason
}: ApplicationChangesParams) {
  if (!isSupabaseConfigured) return

  try {
    const { data, error } = await supabase.functions.invoke('dispatch-notification', {
      body: {
        category: 'application_changes',
        applicationId,
        reason: sanitizeString(reason),
      }
    })

    if (error) {
      console.warn('Team notification dispatch warning (deploy Edge Function using `npx supabase functions deploy dispatch-notification`):', error.message)
      return null
    }

    return data
  } catch (err: any) {
    console.warn('Failed to notify team on changes requested:', err?.message || err)
  }
}

/**
 * Notify an applicant after an organizer accepts or rejects their application.
 * The Edge Function reads the persisted status, so it cannot be spoofed by the client.
 */
export async function notifyApplicantOnStatusChanged({
  applicationId,
}: ApplicationStatusParams) {
  if (!isSupabaseConfigured) return

  try {
    const { data, error } = await supabase.functions.invoke('dispatch-notification', {
      body: {
        category: 'application_status',
        applicationId,
      },
    })

    if (error) {
      console.warn('Application status notification dispatch warning:', error.message)
      return null
    }

    return data
  } catch (err: any) {
    console.warn('Failed to notify applicant about application status:', err?.message || err)
    return null
  }
}

export interface CheckInPushParams {
  userId: string
  stationTitle: string
  isEntrance?: boolean
}

/**
 * Dispatch a push notification to the attendee upon check-in (push-only, no email).
 */
export async function notifyUserOnCheckIn({
  userId,
  stationTitle,
  isEntrance = false,
}: CheckInPushParams) {
  if (!isSupabaseConfigured || !userId) return

  const title = isEntrance
    ? '🎉 Welcome to HackMTY 2026!'
    : `✅ Checked into ${stationTitle}`
  const message = isEntrance
    ? 'Your attendee badge is officially active. Enjoy the event!'
    : `Your check-in for ${stationTitle} was verified successfully.`

  try {
    const { data, error } = await supabase.functions.invoke('dispatch-notification', {
      body: {
        category: 'announcement',
        title: sanitizeString(title),
        message: sanitizeString(message),
        badge: 'Check-In',
        targetUserIds: [userId],
        channel: 'push', // strictly push notification only, no email
      },
    })

    if (error) {
      console.warn('[PushNotification] Check-in push dispatch warning:', error.message)
      return null
    }

    return data
  } catch (err: any) {
    console.warn('[PushNotification] Could not send check-in push notification:', err?.message || err)
    return null
  }
}
