import * as React from 'react'
import { View, Text, Modal, ScrollView, TextInput, Pressable, Platform } from 'react-native'
import { PillButton } from '../../../components/pill-button'
import { useTranslation } from 'app/i18n'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'

interface UserEditModalProps {
  visible: boolean
  onClose: () => void
  editingUser: any
  editFirstName: string
  setEditFirstName: (val: string) => void
  editLastName: string
  setEditLastName: (val: string) => void
  editEmail: string
  setEditEmail: (val: string) => void
  editRoles: string[]
  toggleEditRole: (role: string) => void
  handleSaveUserChanges: () => void
  isSavingUser: boolean
  allAvailableSystemRoles: string[]
}

export function UserEditModal({
  visible,
  onClose,
  editingUser,
  editFirstName,
  setEditFirstName,
  editLastName,
  setEditLastName,
  editEmail,
  setEditEmail,
  editRoles,
  toggleEditRole,
  handleSaveUserChanges,
  isSavingUser,
  allAvailableSystemRoles,
}: UserEditModalProps) {
  const { t, locale } = useTranslation()
  if (!editingUser) return null

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 26,
            maxWidth: 540,
            width: '100%',
            maxHeight: '90%',
            gap: 18,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            ...Platform.select({
              web: { boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }
            })
          }}
        >
          {/* Modal Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 }}>{t('admin.editUserTitle')}</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ID: {editingUser.id}</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#94a3b8' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14 }}>
            {/* First & Last Name Inputs */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t('admin.firstNameLabel')}</Text>
                <TextInput
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#0f172a',
                  }}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder={t('admin.firstNameLabel')}
                />
              </View>

              <View style={{ flex: 1, minWidth: 160, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t('admin.lastNameLabel')}</Text>
                <TextInput
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: '#0f172a',
                  }}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder={t('admin.lastNameLabel')}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t('admin.emailLabel')}</Text>
              <TextInput
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0f172a',
                }}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="user@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Multi-Select Roles */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{t('admin.systemRolesLabel')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {allAvailableSystemRoles.map(role => {
                  const isSelected = editRoles.includes(role)
                  return (
                    <Pressable
                      key={role}
                      onPress={() => toggleEditRole(role)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: isSelected ? '#6d28d9' : '#f1f5f9',
                        borderWidth: 1,
                        borderColor: isSelected ? '#7c3aed' : '#cbd5e1',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isSelected ? '#ffffff' : '#334155' }}>
                        {isSelected ? `✓ ${getApplicantRoleLabel(role, locale).toUpperCase()}` : getApplicantRoleLabel(role, locale).toUpperCase()}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 14 }}>
            <PillButton title={t('admin.cancel')} onPress={onClose} variant="outline-primary" additionalStyle={{ height: 42, width: 'auto', paddingHorizontal: 18 }} />
            <PillButton
              title={t('admin.saveChanges')}
              onPress={handleSaveUserChanges}
              isLoading={isSavingUser}
              additionalStyle={{ height: 42, width: 'auto', minWidth: 140, paddingHorizontal: 22, backgroundColor: '#6d28d9' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
