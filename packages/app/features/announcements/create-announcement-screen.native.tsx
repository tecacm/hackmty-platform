import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useAnnouncements } from 'app/hooks/use-announcements'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { formFieldColors } from 'app/components/form-field-styles'
import { pickMedia, SelectedMedia } from './pick-media'
import { AnnouncementMedia } from 'app/components/announcement-media'
import { PillButton } from 'app/components/pill-button'

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
  
  // Notification options
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

    setSelectedRoles(prev => {
      const next = prev.filter(r => r !== 'all')
      if (next.includes(roleId)) {
        const filtered = next.filter(r => r !== roleId)
        return filtered.length === 0 ? ['all'] : filtered
      } else {
        return [...filteredRoles(next), roleId]
      }
    })
  }

  const filteredRoles = (roles: string[]) => roles.filter(r => r !== 'all')

  const handlePickMedia = async () => {
    try {
      const result = await pickMedia()
      if (result) {
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

      navigateTo('/announcements')
    } catch (err: any) {
      console.error('Failed to post announcement:', err)
      setErrorMsg(err?.message || 'Failed to post announcement. Please try again.')
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
        <View style={styles.unauthorizedCard}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
          <Text style={styles.unauthorizedText}>
            You do not have permission to post announcements.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screenWrapper}>
      {/* Signature White Card Form Container - Native Stack Header handles Title and Back Button */}
      <View style={styles.contentContainer}>
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
              placeholder="e.g. 🚀 Opening Ceremony Starting Soon!"
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
              numberOfLines={5}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />
          </View>
        </View>

        {/* Role Tagging Selector (Flex Wrap) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Tag Specific Roles (Recipient Target)</Text>
          <View style={styles.roleChipsWrapContainer}>
            {AVAILABLE_ROLES.map(r => {
              const isSelected = selectedRoles.includes(r.id)
              return (
                <Pressable
                  key={r.id}
                  onPress={() => toggleRole(r.id)}
                  style={[
                    styles.roleChip,
                    isSelected && styles.roleChipSelected,
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
            <Pressable onPress={handlePickMedia} style={styles.mediaUploadBox}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Upload Image or Video</Text>
              <Text style={styles.uploadSubtext}>JPG, PNG, GIF, WEBP, or MP4 video</Text>
            </Pressable>
          )}
        </View>

        {/* Notification Channels Options (Custom Theme Purple Checkboxes) */}
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
                  Send instant mobile push alerts to users with tagged roles.
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
                  Send formatted HTML email updates to users with tagged roles.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionButtonsStack}>
          <PillButton
            title="🚀 Publish Announcement"
            onPress={handleSubmit}
            isLoading={submitting}
            disabled={submitting}
            variant="primary"
            additionalStyle={styles.submitPillButton}
          />
          <Pressable
            onPress={() => navigateTo('/announcements')}
            disabled={submitting}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screenWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  centerContainer: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 580,
    gap: 16,
    marginVertical: 8,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  subheading: {
    color: '#5b4d61',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.12)',
    marginVertical: 2,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#ffe5e5',
    borderWidth: 1,
    borderColor: '#ff6554',
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  fieldContainer: {
    width: '100%',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#28002d',
    fontFamily: 'Montserrat',
  },
  fieldHelper: {
    fontSize: 12,
    color: '#6b5c73',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    marginBottom: 2,
  },
  inputShell: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputText: {
    fontSize: 14,
    color: '#1d041f',
    fontFamily: 'Montserrat',
    width: '100%',
  },
  textAreaShell: {
    minHeight: 110,
  },
  textAreaText: {
    minHeight: 90,
  },
  roleChipsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    alignItems: 'center',
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e6e0ea',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    flexShrink: 0,
  },
  roleChipSelected: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a3b4c',
    fontFamily: 'Montserrat',
  },
  roleChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  mediaUploadBox: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(90, 0, 97, 0.25)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  uploadIcon: {
    fontSize: 28,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5a0061',
    fontFamily: 'Montserrat',
  },
  uploadSubtext: {
    fontSize: 11.5,
    color: '#8c7b8e',
    fontFamily: 'Montserrat',
  },
  mediaPreviewContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1d041f',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  removeMediaText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  notificationsOptionsBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    padding: 14,
    gap: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(90, 0, 97, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxSquareChecked: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: -2,
  },
  checkboxLabelGroup: {
    flex: 1,
    flexShrink: 1,
  },
  checkboxTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1d041f',
    fontFamily: 'Montserrat',
  },
  checkboxSubtext: {
    fontSize: 12,
    color: '#6b5c73',
    fontFamily: 'Montserrat',
    lineHeight: 16,
    marginTop: 2,
  },
  optionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
  },
  actionButtonsStack: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e6e0ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#5b4d61',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  submitPillButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
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
})
