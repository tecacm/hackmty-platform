import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { useAnnouncements } from 'app/hooks/use-announcements'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { formFieldColors } from 'app/components/form-field-styles'
import { pickMedia, SelectedMedia } from './pick-media'
import { AnnouncementMedia } from 'app/components/announcement-media'
import { PillButton } from 'app/components/pill-button'

import { useTranslation } from 'app/i18n'

export function CreateAnnouncementScreen() {
  const { t } = useTranslation()
  const { createAnnouncement } = useAnnouncements()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { navigateTo } = useSmartNavigate()

  const availableRoles = React.useMemo(() => [
    { id: 'all', label: t('announcements.audienceEveryone') },
    { id: 'hacker', label: t('announcements.audienceHackers') },
    { id: 'mentor', label: t('announcements.audienceMentors') },
    { id: 'judge', label: t('announcements.audienceJudges') },
    { id: 'sponsor', label: t('announcements.audienceSponsors') },
    { id: 'organizer', label: t('announcements.audienceOrganizers') },
  ], [t])

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [titleEs, setTitleEs] = useState('')
  const [messageEs, setMessageEs] = useState('')
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'es'>('en')
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
    const primaryTitle = title.trim() || titleEs.trim()
    const primaryMessage = message.trim() || messageEs.trim()
    if (!primaryTitle) {
      setErrorMsg('Please enter an announcement title.')
      return
    }
    if (!primaryMessage) {
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
        title: title.trim() || titleEs.trim(),
        message: message.trim() || messageEs.trim(),
        title_es: titleEs.trim() || undefined,
        message_es: messageEs.trim() || undefined,
        targetRoles: selectedRoles,
        mediaFile: selectedMedia ? {
          uri: selectedMedia.uri,
          name: selectedMedia.name,
          type: selectedMedia.type,
        } : undefined,
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
          <Text style={styles.unauthorizedTitle}>{t('announcements.accessRestricted')}</Text>
          <Text style={styles.unauthorizedText}>
            {t('announcements.accessRestrictedDesc')}
          </Text>
          <Pressable onPress={() => navigateTo('/announcements')} style={styles.backButton}>
            <Text style={styles.backButtonText}>{t('announcements.backToAnnouncements')}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.contentContainer}>
        {/* Back Button */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigateTo('/announcements')} style={styles.backNavButton}>
            <Text style={styles.backNavIcon}>←</Text>
            <Text style={styles.backNavText}>{t('announcements.backToAnnouncements')}</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>{t('announcements.createAnnouncement')}</Text>
        <Text style={styles.subheading}>
          {t('announcements.createAnnouncementSubtitle')}
        </Text>

        <View style={styles.sectionDivider} />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        {/* Language Tabs */}
        <View style={styles.langTabsRow}>
          <Pressable
            onPress={() => setActiveLangTab('en')}
            style={[
              styles.langTabButton,
              activeLangTab === 'en' && styles.langTabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.langTabButtonText,
                activeLangTab === 'en' && styles.langTabButtonTextActive,
              ]}
            >
              {t('announcements.englishTab')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveLangTab('es')}
            style={[
              styles.langTabButton,
              activeLangTab === 'es' && styles.langTabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.langTabButtonText,
                activeLangTab === 'es' && styles.langTabButtonTextActive,
              ]}
            >
              {t('announcements.spanishTab')}
            </Text>
          </Pressable>
        </View>

        {activeLangTab === 'es' && (
          <View style={styles.translationHintBox}>
            <Text style={styles.translationHintText}>
              💡 {t('announcements.translationHint')}
            </Text>
          </View>
        )}

        {/* Title Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {activeLangTab === 'en' ? t('announcements.postTitle') : t('announcements.postTitleEs')} *
          </Text>
          <View style={styles.inputShell}>
            <TextInput
              style={styles.inputText}
              placeholder={activeLangTab === 'en' ? t('announcements.postTitlePlaceholder') : t('announcements.postTitleEsPlaceholder')}
              placeholderTextColor="#908098"
              value={activeLangTab === 'en' ? title : titleEs}
              onChangeText={activeLangTab === 'en' ? setTitle : setTitleEs}
            />
          </View>
        </View>

        {/* Message / Body Field */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>
            {activeLangTab === 'en' ? t('announcements.postMessage') : t('announcements.postMessageEs')} *
          </Text>
          <View style={[styles.inputShell, styles.textAreaShell]}>
            <TextInput
              style={[styles.inputText, styles.textAreaText]}
              placeholder={activeLangTab === 'en' ? t('announcements.postMessagePlaceholder') : t('announcements.postMessageEsPlaceholder')}
              placeholderTextColor="#908098"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={activeLangTab === 'en' ? message : messageEs}
              onChangeText={activeLangTab === 'en' ? setMessage : setMessageEs}
            />
          </View>
        </View>

        {/* Role Tagging Selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('announcements.targetAudience')}</Text>
          <View style={styles.roleChipsWrapContainer}>
            {availableRoles.map(r => {
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
          <Text style={styles.fieldLabel}>{t('announcements.mediaAttachment')}</Text>
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
              <Text style={styles.uploadTitle}>{t('announcements.mediaAttachment')}</Text>
              <Text style={styles.uploadSubtext}>JPG, PNG, GIF, WEBP, or MP4 video</Text>
            </Pressable>
          )}
        </View>

        {/* Notification Channels Options (Custom Theme Purple Checkboxes) */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{t('announcements.notificationOptions')}</Text>
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
                <Text style={styles.checkboxTitle}>📱 {t('announcements.sendPush')}</Text>
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
                <Text style={styles.checkboxTitle}>📧 {t('announcements.sendEmail')}</Text>
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
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </Pressable>

          <View style={styles.submitButtonContainer}>
            <PillButton
              title={`🚀 ${t('announcements.publish')}`}
              onPress={handleSubmit}
              isLoading={submitting}
              disabled={submitting}
              variant="primary"
              additionalStyle={styles.submitPillButton}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 8,
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
    maxWidth: Platform.OS === 'web' ? 820 : 580,
    gap: 16,
    marginVertical: 10,
    backgroundColor: '#f4f4f4',
    ...Platform.select({
      web: {
        paddingVertical: 32,
        paddingHorizontal: 32,
      },
      default: {
        paddingHorizontal: 16,
        paddingVertical: 20,
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
        elevation: 3,
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
    fontSize: Platform.OS === 'web' ? 28 : 22,
    fontWeight: '800',
    fontFamily: 'Montserrat',
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
  langTabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
    width: '100%',
  },
  langTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  langTabButtonActive: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  langTabButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#5b4d61',
    fontFamily: 'Montserrat',
  },
  langTabButtonTextActive: {
    color: '#ffffff',
  },
  translationHintBox: {
    backgroundColor: '#f8f4fb',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
  },
  translationHintText: {
    color: '#5a0061',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Montserrat',
    lineHeight: 18,
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
    minHeight: 120,
  },
  textAreaText: {
    minHeight: 100,
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
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  roleChipSelected: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  roleChipHovered: {
    backgroundColor: '#d8cfdd',
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
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  mediaUploadBoxHovered: {
    backgroundColor: '#f7f2f8',
    borderColor: '#5a0061',
  },
  uploadIcon: {
    fontSize: 32,
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
    height: 220,
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
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  removeMediaText: {
    color: '#ffffff',
    fontSize: 12,
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
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
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
  actionButtonsRow: {
    width: '100%',
    marginTop: 12,
    ...Platform.select({
      web: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
      },
      default: {
        flexDirection: 'column-reverse',
        gap: 10,
      },
    }),
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e6e0ea',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: { width: '100%' },
    }),
  },
  cancelButtonText: {
    color: '#5b4d61',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  submitButtonContainer: {
    ...Platform.select({
      web: { minWidth: 200 },
      default: { width: '100%' },
    }),
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
