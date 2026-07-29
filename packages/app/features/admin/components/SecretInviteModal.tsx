import * as React from 'react'
import { View, Text, Modal, TextInput, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native'
import { PillButton } from '../../../components/pill-button'

interface SecretInviteModalProps {
  visible: boolean
  onClose: () => void
  newInviteRole: string
  setNewInviteRole: (val: string) => void
  newInviteLabel: string
  setNewInviteLabel: (val: string) => void
  newInviteMaxUses: string
  setNewInviteMaxUses: (val: string) => void
  newInviteExpiresAt: string
  setNewInviteExpiresAt: (val: string) => void
  handleCreateInviteCode: () => void
  isCreatingInvite: boolean
  inviteCodesLoading: boolean
  inviteCodesList: any[]
  copiedCodeId: string | null
  copyInviteLink: (code: string, role: string, id: string) => void
  handleToggleInviteActive: (id: string, active: boolean) => void
  handleDeleteInvite: (id: string) => void
}

export function SecretInviteModal({
  visible,
  onClose,
  newInviteRole,
  setNewInviteRole,
  newInviteLabel,
  setNewInviteLabel,
  newInviteMaxUses,
  setNewInviteMaxUses,
  newInviteExpiresAt,
  setNewInviteExpiresAt,
  handleCreateInviteCode,
  isCreatingInvite,
  inviteCodesLoading,
  inviteCodesList,
  copiedCodeId,
  copyInviteLink,
  handleToggleInviteActive,
  handleDeleteInvite,
}: SecretInviteModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 26, maxWidth: 600, width: '100%', maxHeight: '90%', gap: 16, borderWidth: 1, borderColor: '#e2e8f0', ...Platform.select({ web: { boxShadow: '0 20px 50px rgba(0,0,0,0.2)' } }) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 }}>Secret Invite Link Generator</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Generate single-use or restricted invite links for private application roles</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#94a3b8' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 14 }}>
            {/* Create New Link Card */}
            <View style={{ backgroundColor: '#faf5ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3e8ff', gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#6d28d9' }}>Create New Invite Code</Text>
              
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160, gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>TARGET ROLE</Text>
                  <TextInput
                    style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a' }}
                    value={newInviteRole}
                    onChangeText={setNewInviteRole}
                    placeholder="sponsor, judge, mentor"
                  />
                </View>

                <View style={{ flex: 1, minWidth: 160, gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>LABEL (OPTIONAL)</Text>
                  <TextInput
                    style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a' }}
                    value={newInviteLabel}
                    onChangeText={setNewInviteLabel}
                    placeholder="e.g. Gold Sponsor Link"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <View style={{ flex: 1, minWidth: 140, gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>MAX USES (BLANK = UNLIMITED)</Text>
                  <TextInput
                    style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#0f172a' }}
                    value={newInviteMaxUses}
                    onChangeText={setNewInviteMaxUses}
                    placeholder="1, 5, 10..."
                    keyboardType="number-pad"
                  />
                </View>

                <View style={{ alignSelf: 'flex-end' }}>
                  <PillButton
                    title="+ Generate Code"
                    onPress={handleCreateInviteCode}
                    isLoading={isCreatingInvite}
                    additionalStyle={{ height: 38, width: 'auto', paddingHorizontal: 18, backgroundColor: '#6d28d9' }}
                    fontSize={12}
                  />
                </View>
              </View>
            </View>

            {/* Active Links List */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Existing Invite Codes</Text>

              {inviteCodesLoading ? (
                <ActivityIndicator size="small" color="#7c3aed" />
              ) : inviteCodesList.length === 0 ? (
                <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No invite codes created yet.</Text>
              ) : (
                inviteCodesList.map(item => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 200 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#6d28d9' }}>{item.code}</Text>
                        <View style={{ backgroundColor: '#ede9fe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#6d28d9' }}>{item.application_type_id.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Used: {item.use_count} / {item.max_uses ?? '∞'} | {item.is_active ? 'Active' : 'Disabled'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <PillButton
                        title={copiedCodeId === item.id ? '✓ Copied!' : 'Copy Link'}
                        onPress={() => copyInviteLink(item.code, item.application_type_id, item.id)}
                        additionalStyle={{ height: 32, paddingHorizontal: 12, width: 'auto' }}
                        fontSize={11}
                      />
                      <PillButton
                        title={item.is_active ? 'Disable' : 'Enable'}
                        onPress={() => handleToggleInviteActive(item.id, item.is_active)}
                        variant="outline-primary"
                        additionalStyle={{ height: 32, paddingHorizontal: 10, width: 'auto' }}
                        fontSize={11}
                      />
                      <PillButton
                        title="Delete"
                        onPress={() => handleDeleteInvite(item.id)}
                        variant="outline-danger"
                        additionalStyle={{ height: 32, paddingHorizontal: 10, width: 'auto' }}
                        fontSize={11}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 14 }}>
            <PillButton title="Done" onPress={onClose} additionalStyle={{ height: 40, width: 'auto', paddingHorizontal: 22, backgroundColor: '#6d28d9' }} />
          </View>
        </View>
      </View>
    </Modal>
  )
}
