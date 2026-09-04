import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { sendAnnouncement } from 'app/services/notification-service'
import { AppIcon } from 'app/components/app-icon'

type DirectMessageModalProps = {
  visible: boolean
  onClose: () => void
  targetType: 'team' | 'user'
  targetId: string
  targetName: string
  memberUserIds?: string[]
}

export function DirectMessageModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetName,
  memberUserIds = [],
}: DirectMessageModalProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState<'both' | 'push' | 'email'>('both')
  const [sending, setSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setErrMsg('Please enter both a title and message.')
      return
    }

    try {
      setSending(true)
      setErrMsg(null)
      setSuccessMsg(null)

      if (targetType === 'team') {
        // targetId is the team NAME here (grouping key), not a uuid — so target the
        // already-resolved member user IDs directly instead of a team_id lookup.
        if (memberUserIds.length === 0) {
          setErrMsg('No team members found to message.')
          setSending(false)
          return
        }
        await sendAnnouncement({
          title: title.trim(),
          message: message.trim(),
          badge: `Team Message: ${targetName}`,
          targetUserIds: memberUserIds,
          channel,
        })
      } else {
        await sendAnnouncement({
          title: title.trim(),
          message: message.trim(),
          badge: 'Direct Message',
          targetUserIds: [targetId],
          channel,
        })
      }

      setSuccessMsg(`Message sent successfully to ${targetName}!`)
      setTimeout(() => {
        setSuccessMsg(null)
        setTitle('')
        setMessage('')
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrMsg(err?.message || 'Failed to dispatch notification.')
    } finally {
      setSending(false)
    }
  }

  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name={targetType === 'team' ? 'message.fill' : 'mail'} size={20} color="#7c3aed" />
              <Text style={styles.headerTitle}>
                {targetType === 'team' ? 'Message Team' : 'Message User'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="xmark" size={16} color="#64748b" />
            </Pressable>
          </View>

          <Text style={styles.targetSubText}>
            Recipient: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{targetName}</Text>
          </Text>

          {successMsg ? (
            <View style={styles.successBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AppIcon name="checkmark" size={18} color="#15803d" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title / Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Important Update regarding your application"
                  placeholderTextColor="#94a3b8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message Content</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Type your message here..."
                  placeholderTextColor="#94a3b8"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notification Channels</Text>
                <View style={styles.channelRow}>
                  <Pressable
                    style={[styles.channelChip, channel === 'both' && styles.channelChipActive]}
                    onPress={() => setChannel('both')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="smartphone" size={13} color={channel === 'both' ? '#ffffff' : '#475569'} />
                      <AppIcon name="mail" size={13} color={channel === 'both' ? '#ffffff' : '#475569'} />
                      <Text style={[styles.channelChipText, channel === 'both' && styles.channelChipTextActive]}>
                        Push + Email
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.channelChip, channel === 'push' && styles.channelChipActive]}
                    onPress={() => setChannel('push')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="smartphone" size={13} color={channel === 'push' ? '#ffffff' : '#475569'} />
                      <Text style={[styles.channelChipText, channel === 'push' && styles.channelChipTextActive]}>
                        Push Only
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[styles.channelChip, channel === 'email' && styles.channelChipActive]}
                    onPress={() => setChannel('email')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="mail" size={13} color={channel === 'email' ? '#ffffff' : '#475569'} />
                      <Text style={[styles.channelChipText, channel === 'email' && styles.channelChipTextActive]}>
                        Email Only
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {errMsg && <Text style={styles.errorText}>{errMsg}</Text>}

              <View style={styles.actionsRow}>
                <Pressable style={styles.cancelBtn} onPress={onClose} disabled={sending}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable style={styles.sendBtn} onPress={handleSend} disabled={sending}>
                  {sending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send Message</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  targetSubText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 18,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  channelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  channelChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  channelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  channelChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  sendBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginVertical: 10,
  },
  successText: {
    color: '#15803d',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
})
