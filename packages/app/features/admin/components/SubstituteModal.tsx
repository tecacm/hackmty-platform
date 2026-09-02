'use client'

import * as React from 'react'
import { View, Text, Modal, TextInput, Pressable, ScrollView, Platform } from 'react-native'
import { PillButton } from '../../../components/pill-button'
import { StyledSelect } from 'app/components/styled-select'
import { useTranslation } from 'app/i18n'

type TeamMember = { userId: string; name: string }
type DirectoryUser = { id: string; first_name: string | null; last_name: string | null; email: string }

interface SubstituteModalProps {
  visible: boolean
  onClose: () => void
  teamName: string
  members: TeamMember[]
  users: DirectoryUser[]
  submitting: boolean
  onConfirm: (outgoingId: string, incomingId: string) => void
}

export function SubstituteModal({ visible, onClose, teamName, members = [], users = [], submitting, onConfirm }: SubstituteModalProps) {
  const { t } = useTranslation()
  const [outgoingId, setOutgoingId] = React.useState('')
  const [incomingId, setIncomingId] = React.useState('')
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    if (visible) {
      setOutgoingId('')
      setIncomingId('')
      setSearch('')
    }
  }, [visible])

  const memberIds = React.useMemo(() => new Set(members.map((m) => m.userId)), [members])

  const results = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return users
      .filter((u) => {
        if (memberIds.has(u.id)) return false // already on this team
        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
        return name.includes(q) || (u.email || '').toLowerCase().includes(q)
      })
      .slice(0, 8)
  }, [search, users, memberIds])

  const selectedUser = React.useMemo(() => users.find((u) => u.id === incomingId) || null, [users, incomingId])
  const userLabel = (u: DirectoryUser) => `${`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email} · ${u.email}`

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 22, padding: 24, maxWidth: 520, width: '100%', maxHeight: '90%', gap: 14, ...Platform.select({ web: { boxShadow: '0 20px 50px rgba(0,0,0,0.2)' } }) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: '#0f172a' }}>{t('admin.subTitle')}</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{teamName}</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#94a3b8' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14 }}>
            <StyledSelect
              label={t('admin.subLeaving')}
              value={outgoingId}
              placeholder={t('admin.subLeavingPlaceholder')}
              options={[
                { label: t('admin.subLeavingPlaceholder'), value: '' },
                ...members.map((m) => ({ label: m.name, value: m.userId })),
              ]}
              onValueChange={setOutgoingId}
            />

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>{t('admin.subFind')}</Text>
              {selectedUser ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, padding: 10 }}>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#166534' }} numberOfLines={1}>{userLabel(selectedUser)}</Text>
                  <Pressable onPress={() => setIncomingId('')}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#dc2626' }}>{t('common.cancel')}</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('admin.subSearchPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: '#0f172a' }}
                  />
                  {search.trim() && results.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{t('admin.subNoResults')}</Text>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {results.map((u) => (
                        <Pressable
                          key={u.id}
                          onPress={() => { setIncomingId(u.id); setSearch('') }}
                          style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10 }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>{u.email}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '600', lineHeight: 17 }}>{t('admin.subNote')}</Text>
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onClose} style={{ flex: 1, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '700' }}>{t('common.close')}</Text>
            </Pressable>
            <PillButton
              variant="secondary"
              title={t('admin.subConfirm')}
              isLoading={submitting}
              onPress={outgoingId && incomingId ? () => onConfirm(outgoingId, incomingId) : undefined}
              additionalStyle={{ flex: 1, height: 46, opacity: outgoingId && incomingId ? 1 : 0.5 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
