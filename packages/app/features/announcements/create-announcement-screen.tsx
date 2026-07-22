'use client'

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native'
import { useAnnouncements } from 'app/hooks/use-announcements'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { formFieldColors, formFieldStyles } from 'app/components/form-field-styles'
import { pickMedia, SelectedMedia } from './pick-media'
import { AnnouncementMedia } from 'app/components/announcement-media'

const AVAILABLE_ROLES = [
  { id: 'all', label: 'Everyone (@ALL)' },
  { id: 'hacker', label: 'Hackers (@HACKER)' },
  { id: 'mentor', label: 'Mentors (@MENTOR)' },
  { id: 'judge', label: 'Judges (@JUDGE)' },
  { id: 'sponsor', label: 'Sponsors (@SPONSOR)' },
  { id: 'organizer', label: 'Organizers (@ORGANIZER)' },
]

export function CreateAnnouncementScreen() {
  const { createAnnouncement } = useAnnouncements()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { navigateTo } = useSmartNavigate()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['all'])
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null)
  const [previewAspectRatio, setPreviewAspectRatio] = useState<number | null>(null)
  const [sendPushNotification, setSendPushNotification] = useState(true)
  const [sendEmailNotification, setSendEmailNotification] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canCreate = !permissionsLoading && hasPermission('announcements', 'create')

  const toggleRole = (roleId: string) => {
    if (roleId === 'all') {
      setSelectedRoles(['all'])
      return
    }

    let updated = selectedRoles.filter(r => r !== 'all')
    if (updated.includes(roleId)) {
      updated = updated.filter(r => r !== roleId)
    } else {
      updated.push(roleId)
    }

    if (updated.length === 0) {
      updated = ['all']
    }

    setSelectedRoles(updated)
  }

  const handlePickMedia = async () => {
    try {
      const result = await pickMedia()
      if (result) {
        setPreviewAspectRatio(null)
        setSelectedMedia(result)
      }
    } catch (err) {
      console.warn('Error selecting media:', err)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter an announcement title.')
      return
    }
    if (!message.trim()) {
      setErrorMsg('Please enter the announcement body message.')
      return
    }

    setErrorMsg(null)
    setSubmitting(true)

    let notificationChannel: 'both' | 'push' | 'email' | 'none' = 'none'
    if (sendPushNotification && sendEmailNotification) {
      notificationChannel = 'both'
    } else if (sendPushNotification) {
      notificationChannel = 'push'
    } else if (sendEmailNotification) {
      notificationChannel = 'email'
    }

    try {
      await createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        targetRoles: selectedRoles,
        mediaFile: selectedMedia,
        mediaType: selectedMedia?.mediaType || 'image',
        notificationChannel,
        sendNotifications: notificationChannel !== 'none',
      })

      // Navigate back to announcements timeline
      navigateTo('/announcements')
    } catch (err: any) {
      console.error('Failed to submit announcement:', err)
      setErrorMsg(err?.message || 'Failed to create announcement. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (permissionsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  if (!canCreate) {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.heading}>Create Announcement</Text>
        <View style={styles.unauthorizedCard}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>Permission Denied</Text>
          <Text style={styles.unauthorizedText}>
            You require the `announcements:create` permission to broadcast announcements.
          </Text>
          <Pressable onPress={() => navigateTo('/announcements')} style={styles.backButton}>
            <Text style={styles.backButtonText}>Return to Feed</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigateTo('/announcements')} style={styles.backNavButton}>
            <Text style={styles.backNavIcon}>←</Text>
            <Text style={styles.backNavText}>Back to Feed</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>New Announcement</Text>
        <Text style={styles.subheading}>
          Create an official post. It will appear on the timeline feed and notify tagged roles.
        </Text>

        <View style={styles.sectionDivider} />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        {/* Title Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Announcement Title *</Text>
          <View style={styles.inputShell}>
            <TextInput
              style={styles.inputText}
              placeholder="e.g. 🚀 HackMTY Opening Ceremony Starting Soon!"
              placeholderTextColor="#908098"
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        {/* Message / Body Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Announcement Message *</Text>
          <View style={[styles.inputShell, styles.textAreaShell]}>
            <TextInput
              style={[styles.inputText, styles.textAreaText]}
              placeholder="Enter announcement message details..."
              placeholderTextColor="#908098"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />
          </View>
        </View>

        {/* Role Tagging Selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Tag Specific Roles (Recipient Target)</Text>
          <Text style={styles.fieldHelper}>
            Select who should be notified and see role badges on this polaroid post.
          </Text>
          <View style={styles.roleChipsContainer}>
            {AVAILABLE_ROLES.map(r => {
              const isSelected = selectedRoles.includes(r.id)
              return (
                <Pressable
                  key={r.id}
                  onPress={() => toggleRole(r.id)}
                  style={({ hovered }: any) => [
                    styles.roleChip,
                    isSelected && styles.roleChipSelected,
                    hovered && styles.roleChipHovered,
                  ]}
                >
                  <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>
                    {r.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Media Upload Container */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Photo / Video Attachment (Optional)</Text>
          {selectedMedia ? (
            <View style={styles.mediaPreviewContainer}>
              <AnnouncementMedia
                url={selectedMedia.uri}
                mediaType={selectedMedia.mediaType}
                style={styles.mediaPreviewImage}
                resizeMode="cover"
                controls={true}
                autoPlay={false}
                muted={true}
              />
              <Pressable onPress={() => setSelectedMedia(null)} style={styles.removeMediaButton}>
                <Text style={styles.removeMediaText}>✕ Remove Attachment</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickMedia}
              style={({ hovered }: any) => [
                styles.mediaUploadBox,
                hovered && styles.mediaUploadBoxHovered,
              ]}
            >
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Upload Image or Video</Text>
              <Text style={styles.uploadSubtext}>JPG, PNG, GIF, WEBP, or MP4 video</Text>
            </Pressable>
          )}
        </View>

        {/* Notification Channels Options (Separate Push and Email) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Notification Channels</Text>
          <Text style={styles.fieldHelper}>
            Select which notification channels to send to users with tagged roles.
          </Text>

          <View style={styles.notificationsOptionsBox}>
            {/* Push Notifications Option */}
            <Pressable
              onPress={() => setSendPushNotification(!sendPushNotification)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkboxSquare, sendPushNotification && styles.checkboxSquareChecked]}>
                {sendPushNotification && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabelGroup}>
                <Text style={styles.checkboxTitle}>📱 Push Notifications</Text>
                <Text style={styles.checkboxSubtext}>
                  Send instant mobile and web push alerts to users with tagged roles.
                </Text>
              </View>
            </Pressable>

            <View style={styles.optionDivider} />

            {/* Email Notifications Option */}
            <Pressable
              onPress={() => setSendEmailNotification(!sendEmailNotification)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkboxSquare, sendEmailNotification && styles.checkboxSquareChecked]}>
                {sendEmailNotification && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkboxLabelGroup}>
                <Text style={styles.checkboxTitle}>📧 Email Notifications</Text>
                <Text style={styles.checkboxSubtext}>
                  Send formatted Mandrill HTML email updates to users with tagged roles.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Form Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            onPress={() => navigateTo('/announcements')}
            disabled={submitting}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ hovered }: any) => [
              styles.submitButton,
              hovered && styles.submitButtonHovered,
              submitting && styles.submitButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>🚀 Publish Announcement</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 850,
    gap: 16,
    marginVertical: 12,
    backgroundColor: '#f4f4f4',
    ...Platform.select({
      web: {
        paddingVertical: 36,
        paddingHorizontal: 36,
      },
      default: {
        paddingHorizontal: 18,
        paddingVertical: 24,
      },
    }),
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
  headerRow: {
    width: '100%',
    marginBottom: 4,
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  backNavIcon: {
    color: '#5a0061',
    fontSize: 16,
    fontWeight: '700',
  },
  backNavText: {
    color: '#5a0061',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  heading: {
    color: formFieldColors.theme,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Montserrat',
  },
  subheading: {
    color: '#5b4d61',
    fontSize: 13.5,
    fontWeight: '500',
    fontFamily: 'Montserrat',
  },
  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.12)',
    marginVertical: 4,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#ffe5e5',
    borderWidth: 1,
    borderColor: '#ff6554',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  fieldContainer: {
    width: '100%',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#28002d',
    fontFamily: 'Montserrat',
  },
  fieldHelper: {
    fontSize: 12,
    color: '#6b5c73',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  inputShell: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.18)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputText: {
    color: '#1d041f',
    fontSize: 15,
    fontFamily: 'Montserrat',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  textAreaShell: {
    minHeight: 120,
  },
  textAreaText: {
    minHeight: 100,
  },
  roleChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  roleChipHovered: {
    borderColor: '#5a0061',
  },
  roleChipSelected: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  roleChipText: {
    color: '#5a0061',
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  roleChipTextSelected: {
    color: '#ffffff',
  },
  mediaUploadBox: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(90, 0, 97, 0.25)',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  mediaUploadBoxHovered: {
    borderColor: '#5a0061',
    backgroundColor: '#faf3fc',
  },
  uploadIcon: {
    fontSize: 32,
  },
  uploadTitle: {
    color: '#1d041f',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  uploadSubtext: {
    color: '#8c75a1',
    fontSize: 12,
    fontFamily: 'Montserrat',
  },
  mediaPreviewContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.18)',
  },
  mediaPreviewImage: {
    width: '100%',
    aspectRatio: 1.25,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  videoPreviewBox: {
    width: '100%',
    height: 120,
    backgroundColor: '#1d041f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  videoIcon: {
    fontSize: 32,
  },
  videoName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  removeMediaButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeMediaText: {
    color: '#ff6554',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  notificationsOptionsBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.18)',
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  optionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#5a0061',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: '#5a0061',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxLabelGroup: {
    flex: 1,
  },
  checkboxTitle: {
    color: '#1d041f',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  checkboxSubtext: {
    color: '#6b5c73',
    fontSize: 12,
    fontFamily: 'Montserrat',
  },
  actionButtonsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e6e0ea',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cancelButtonText: {
    color: '#5b4d61',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  submitButton: {
    backgroundColor: '#5a0061',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  submitButtonHovered: {
    backgroundColor: '#7a0083',
    transform: [{ scale: 1.02 }],
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  unauthorizedCard: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  unauthorizedIcon: {
    fontSize: 36,
  },
  unauthorizedTitle: {
    color: '#1d041f',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  unauthorizedText: {
    color: '#6b5c73',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  backButton: {
    marginTop: 8,
    backgroundColor: '#5a0061',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
})
