import * as React from 'react'
import { View, Text, ActivityIndicator, Platform, Pressable, TextInput } from 'react-native'

interface RolesAccessTabProps {
  rolesLoading: boolean
  rolesList: any[]
  fetchRolesList: () => void
  fetchInviteCodes: () => void
  setShowCreateRoleModal: (val: boolean) => void
  handleToggleRoleVisibility: (roleId: string, currentPublic: boolean) => void
  setNewInviteRole: (role: string) => void
  setShowInviteModal: (val: boolean) => void
  handleUpdateRoleDeadline: (roleId: string, closeAt: string | null) => void
  inviteCodesList: any[]
  copiedCodeId: string | null
  copyInviteLink: (code: string, role: string, id: string) => void
  styles: any
}

const formatText = (val: any, fallback = '') => {
  if (!val) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'object') return val.en || val.es || Object.values(val)[0] || fallback
  return String(val)
}

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return ''
  try { return new Date(iso).toISOString().slice(0, 16) }
  catch { return '' }
}

function RoleCard({ role, handleToggleRoleVisibility, setNewInviteRole, setShowInviteModal, fetchInviteCodes, handleUpdateRoleDeadline }: { role: any; handleToggleRoleVisibility: (id: string, pub: boolean) => void; setNewInviteRole: (r: string) => void; setShowInviteModal: (v: boolean) => void; fetchInviteCodes: () => void; handleUpdateRoleDeadline: (id: string, closeAt: string | null) => void }) {
  const isPublic = role.is_public !== false
  const labelStr = formatText(role.label, (role.id || 'ROLE').toUpperCase())
  const descStr  = formatText(role.description, 'No description provided.')
  const [editing, setEditing] = React.useState(false)
  const [dateValue, setDateValue] = React.useState(toDatetimeLocal(role.close_at))
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!editing) setDateValue(toDatetimeLocal(role.close_at))
  }, [role.close_at, editing])

  const handleSave = () => {
    setSaving(true)
    const iso = dateValue ? new Date(dateValue).toISOString() : null
    handleUpdateRoleDeadline(role.id, iso)
    setSaving(false)
    setEditing(false)
  }

  const handleClear = () => {
    setDateValue('')
    handleUpdateRoleDeadline(role.id, null)
    setEditing(false)
  }

  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', overflow: 'hidden' }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#22002c', letterSpacing: -0.2 }}>{labelStr}</Text>
              <View style={{ backgroundColor: isPublic ? '#f0fdf4' : '#fff7ed', borderColor: isPublic ? '#86efac' : '#fdba74', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isPublic ? '#16a34a' : '#ea580c', letterSpacing: 0.4 }}>{isPublic ? 'PUBLIC' : 'HIDDEN'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>{descStr}</Text>
            <Text style={{ fontSize: 10, color: '#aaa', fontWeight: '600' }}>ID: {role.id}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable onPress={() => handleToggleRoleVisibility(role.id, isPublic)} style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: isPublic ? '#fdba74' : '#86efac', backgroundColor: pressed ? (isPublic ? '#fff7ed' : '#f0fdf4') : 'transparent', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: isPublic ? '#ea580c' : '#16a34a' }}>{isPublic ? 'Make Hidden' : 'Make Public'}</Text>
            </Pressable>
            <Pressable onPress={() => { setNewInviteRole(role.id); setShowInviteModal(true); fetchInviteCodes() }} style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Secret Link</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderColor: 'rgba(90,0,97,0.08)', backgroundColor: '#fafafa', padding: 16, gap: 10 }}>
        {!editing && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.4 }}>DEADLINE:</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: role.close_at ? '#dc2626' : '#16a34a' }}>
                {role.close_at ? new Date(role.close_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No deadline set'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setEditing(true)} style={({ pressed }) => ({ height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: pressed ? 'rgba(90,0,97,0.12)' : 'rgba(90,0,97,0.07)', justifyContent: 'center', alignItems: 'center' })}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#5a0061' }}>{role.close_at ? 'Edit Deadline' : '+ Set Deadline'}</Text>
              </Pressable>
              {role.close_at && (
                <Pressable onPress={handleClear} style={({ pressed }) => ({ height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: pressed ? 'rgba(220,38,38,0.14)' : 'rgba(220,38,38,0.08)', justifyContent: 'center', alignItems: 'center' })}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        {editing && (
          <View style={{ gap: 10 }}>
            {Platform.OS === 'web' ? (
              <input type="datetime-local" value={dateValue} onChange={(e: any) => setDateValue(e.target.value)} style={{ border: '1.5px solid rgba(90,0,97,0.3)', borderRadius: 10, padding: '8px 12px', fontSize: 14, color: '#22002c', backgroundColor: '#fff', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none' } as any} />
            ) : (
              <TextInput value={dateValue} onChangeText={setDateValue} placeholder="YYYY-MM-DDTHH:MM" placeholderTextColor="#aaa" style={{ borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.3)', borderRadius: 10, padding: 10, fontSize: 14, color: '#22002c', backgroundColor: '#fff' }} />
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => ({ flex: 1, height: 36, borderRadius: 10, backgroundColor: pressed || saving ? '#3d0042' : '#5a0061', justifyContent: 'center', alignItems: 'center' })}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{saving ? 'Saving…' : 'Save Deadline'}</Text>
              </Pressable>
              <Pressable onPress={() => { setEditing(false); setDateValue(toDatetimeLocal(role.close_at)) }} style={({ pressed }) => ({ height: 36, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', backgroundColor: pressed ? '#f5f5f5' : 'transparent', justifyContent: 'center', alignItems: 'center' })}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#666' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

export function RolesAccessTab({ rolesLoading, rolesList, fetchRolesList, fetchInviteCodes, setShowCreateRoleModal, handleToggleRoleVisibility, setNewInviteRole, setShowInviteModal, handleUpdateRoleDeadline, inviteCodesList, copiedCodeId, copyInviteLink, styles }: RolesAccessTabProps) {
  return (
    <View style={{ width: '100%', gap: 20 }}>
      <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#22002c', letterSpacing: -0.3 }}>Roles &amp; Access</Text>
          <Text style={{ fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 }}>Manage visibility, deadlines, and secret invite links per role.</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setShowCreateRoleModal(true)} style={({ pressed }) => ({ height: 40, paddingHorizontal: 18, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', justifyContent: 'center', alignItems: 'center' })}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>+ New Role</Text>
          </Pressable>
          <Pressable onPress={() => { fetchRolesList(); fetchInviteCodes() }} style={({ pressed }) => ({ height: 40, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.25)', backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : 'transparent', justifyContent: 'center', alignItems: 'center' })}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#5a0061' }}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      {rolesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c2b75f" />
          <Text style={styles.loadingText}>Loading roles...</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {rolesList.map(role => (
            <RoleCard key={role.id} role={role} handleToggleRoleVisibility={handleToggleRoleVisibility} setNewInviteRole={setNewInviteRole} setShowInviteModal={setShowInviteModal} fetchInviteCodes={fetchInviteCodes} handleUpdateRoleDeadline={handleUpdateRoleDeadline} />
          ))}
        </View>
      )}

      <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#22002c', letterSpacing: -0.2 }}>Secret Invite Links</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Shareable URLs for hidden roles (sponsors, judges, etc.)</Text>
          </View>
          <Pressable onPress={() => { setShowInviteModal(true); fetchInviteCodes() }} style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', justifyContent: 'center', alignItems: 'center' })}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>+ Generate Link</Text>
          </Pressable>
        </View>
        {inviteCodesList.length === 0 ? (
          <Text style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic', paddingVertical: 10 }}>No invite links generated yet.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {inviteCodesList.map(invite => (
              <View key={invite.id} style={{ backgroundColor: '#faf6fd', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(90,0,97,0.1)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#5a0061' }}>{invite.code}</Text>
                    <View style={{ backgroundColor: 'rgba(90,0,97,0.1)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#5a0061', letterSpacing: 0.3 }}>{String(invite.application_type_id || 'role').toUpperCase()}</Text>
                    </View>
                    {invite.label && <Text style={{ fontSize: 12, color: '#666' }}>— {invite.label}</Text>}
                  </View>
                  <Text style={{ fontSize: 11, color: '#888' }}>Uses: {invite.use_count}/{invite.max_uses ?? '∞'} · {invite.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
                <Pressable onPress={() => copyInviteLink(invite.code, invite.application_type_id, invite.id)} style={({ pressed }) => ({ height: 32, paddingHorizontal: 14, borderRadius: 8, backgroundColor: copiedCodeId === invite.id ? '#16a34a' : pressed ? 'rgba(90,0,97,0.14)' : 'rgba(90,0,97,0.08)', justifyContent: 'center', alignItems: 'center' })}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: copiedCodeId === invite.id ? '#fff' : '#5a0061' }}>{copiedCodeId === invite.id ? 'Copied!' : 'Copy Link'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
