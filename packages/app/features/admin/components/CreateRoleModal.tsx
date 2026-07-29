import * as React from 'react'
import { View, Text, Modal, TextInput, Pressable, Platform } from 'react-native'
import { PillButton } from '../../../components/pill-button'

interface CreateRoleModalProps {
  visible: boolean
  onClose: () => void
  newRoleId: string
  setNewRoleId: (val: string) => void
  newRoleLabel: string
  setNewRoleLabel: (val: string) => void
  newRoleDesc: string
  setNewRoleDesc: (val: string) => void
  newRolePublic: boolean
  setNewRolePublic: (val: boolean) => void
  newRoleCloseAt: string
  setNewRoleCloseAt: (val: string) => void
  handleCreateRole: () => void
  isCreatingRole: boolean
}

export function CreateRoleModal({
  visible,
  onClose,
  newRoleId,
  setNewRoleId,
  newRoleLabel,
  setNewRoleLabel,
  newRoleDesc,
  setNewRoleDesc,
  newRolePublic,
  setNewRolePublic,
  newRoleCloseAt,
  setNewRoleCloseAt,
  handleCreateRole,
  isCreatingRole,
}: CreateRoleModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 26, maxWidth: 500, width: '100%', gap: 16, borderWidth: 1, borderColor: '#e2e8f0', ...Platform.select({ web: { boxShadow: '0 20px 50px rgba(0,0,0,0.2)' } }) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 }}>Create Application Role</Text>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#94a3b8' }}>✕</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>ROLE KEY / ID (slug)</Text>
              <TextInput
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a' }}
                placeholder="e.g. mentor, sponsor, VIP-hacker"
                value={newRoleId}
                onChangeText={setNewRoleId}
                autoCapitalize="none"
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>DISPLAY LABEL</Text>
              <TextInput
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a' }}
                placeholder="e.g. Mentor Application 2026"
                value={newRoleLabel}
                onChangeText={setNewRoleLabel}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>DESCRIPTION</Text>
              <TextInput
                style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a' }}
                placeholder="Brief role overview for applicants..."
                value={newRoleDesc}
                onChangeText={setNewRoleDesc}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Visibility Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>Public Role</Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>If disabled, applicants need a Secret Invite URL</Text>
              </View>
              <Pressable
                onPress={() => setNewRolePublic(!newRolePublic)}
                style={{
                  backgroundColor: newRolePublic ? '#16a34a' : '#cbd5e1',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>{newRolePublic ? 'PUBLIC' : 'HIDDEN'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 14 }}>
            <PillButton title="Cancel" onPress={onClose} variant="outline-primary" additionalStyle={{ height: 42, width: 'auto', paddingHorizontal: 18 }} />
            <PillButton
              title="Create Role"
              onPress={handleCreateRole}
              isLoading={isCreatingRole}
              additionalStyle={{ height: 42, width: 'auto', minWidth: 140, paddingHorizontal: 22, backgroundColor: '#6d28d9' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
