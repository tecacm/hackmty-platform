import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { sanitizeString } from 'app/utils/sanitization'

export interface AnnouncementParams {
  title: string
  message: string
  badge?: string
  targetTeamIds?: string[]
  targetRole?: string
  targetUserIds?: string[]
  channel?: 'both' | 'push' | 'email'
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
  targetUserIds,
  channel = 'both'
}: AnnouncementParams) {
  if (!isSupabaseConfigured) return

  try {
    const { data, error } = await supabase.functions.invoke('dispatch-notification', {
      body: {
        category: 'announcement',
        title: sanitizeString(title),
        message: sanitizeString(message),
        badge: sanitizeString(badge),
        targetTeamIds,
        targetRole,
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
