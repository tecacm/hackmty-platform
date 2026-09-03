import * as React from 'react'
import { View, Text, ActivityIndicator, Platform, Pressable, TextInput, useWindowDimensions } from 'react-native'
import { AppIcon } from 'app/components/app-icon'
import { useTranslation } from 'app/i18n'

interface RolesAccessTabProps {
  rolesLoading: boolean
  rolesList: any[]
  permissionsList: any[]
  rolePermissionsMap: Record<string, string[]>
  handleUpdateRolePermissions: (role: string, permissionIds: string[]) => void
  fetchRolesList: () => void
  fetchInviteCodes: () => void
  setShowCreateRoleModal: (val: boolean) => void
  handleToggleRoleVisibility: (roleId: string, currentPublic: boolean) => void
  setNewInviteRole: (role: string) => void
  setShowInviteModal: (val: boolean) => void
  handleUpdateRoleDeadline: (roleId: string, closeAt: string | null) => void
  handleUpdateRoleConfirmDeadline: (roleId: string, closeAt: string | null) => void
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
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    // datetime-local expects LOCAL time; toISOString() would shift by the tz offset.
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function DeadlineRow({ label, value, emptyLabel, onSave }: { label: string; value: string | null; emptyLabel: string; onSave: (iso: string | null) => void }) {
  const { t } = useTranslation()
  const [editing, setEditing] = React.useState(false)
  const [dateValue, setDateValue] = React.useState(toDatetimeLocal(value))
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!editing) setDateValue(toDatetimeLocal(value))
  }, [value, editing])

  const save = () => {
    setSaving(true)
    onSave(dateValue ? new Date(dateValue).toISOString() : null)
    setSaving(false)
    setEditing(false)
  }
  const clear = () => {
    setDateValue('')
    onSave(null)
    setEditing(false)
  }

  return (
    <View style={{ gap: 10 }}>
      {!editing && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.4 }}>{label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: value ? '#dc2626' : '#16a34a' }}>
              {value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : emptyLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setEditing(true)} style={({ pressed }) => ({ height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: pressed ? 'rgba(90,0,97,0.12)' : 'rgba(90,0,97,0.07)', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#5a0061' }}>{value ? t('admin.editDeadline') : t('admin.setDeadline')}</Text>
            </Pressable>
            {value && (
              <Pressable onPress={clear} style={({ pressed }) => ({ height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: pressed ? 'rgba(220,38,38,0.14)' : 'rgba(220,38,38,0.08)', justifyContent: 'center', alignItems: 'center' })}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>{t('admin.clear')}</Text>
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
            <Pressable onPress={save} disabled={saving} style={({ pressed }) => ({ flex: 1, height: 36, borderRadius: 10, backgroundColor: pressed || saving ? '#3d0042' : '#5a0061', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{saving ? t('admin.saving') : t('admin.saveDeadline')}</Text>
            </Pressable>
            <Pressable onPress={() => { setEditing(false); setDateValue(toDatetimeLocal(value)) }} style={({ pressed }) => ({ height: 36, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', backgroundColor: pressed ? '#f5f5f5' : 'transparent', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#666' }}>{t('admin.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

function RoleCard({ role, handleToggleRoleVisibility, setNewInviteRole, setShowInviteModal, fetchInviteCodes, handleUpdateRoleDeadline, handleUpdateRoleConfirmDeadline, permissionsList, rolePermissions, handleUpdateRolePermissions }: { role: any; handleToggleRoleVisibility: (id: string, pub: boolean) => void; setNewInviteRole: (r: string) => void; setShowInviteModal: (v: boolean) => void; fetchInviteCodes: () => void; handleUpdateRoleDeadline: (id: string, closeAt: string | null) => void; handleUpdateRoleConfirmDeadline: (id: string, closeAt: string | null) => void; permissionsList: any[]; rolePermissions: string[]; handleUpdateRolePermissions: (role: string, permissions: string[]) => void }) {
  const { t } = useTranslation()
  const isPublic = role.is_public !== false
  const labelStr = formatText(role.label, (role.id || 'ROLE').toUpperCase())
  const descStr  = formatText(role.description, 'No description provided.')
  const [editingPermissions, setEditingPermissions] = React.useState(false)

  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', overflow: 'hidden' }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#22002c', letterSpacing: -0.2 }}>{labelStr}</Text>
              <View style={{ backgroundColor: isPublic ? '#f0fdf4' : '#fff7ed', borderColor: isPublic ? '#86efac' : '#fdba74', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: isPublic ? '#16a34a' : '#ea580c', letterSpacing: 0.4 }}>{isPublic ? t('admin.rolePublic') : t('admin.roleHidden')}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>{descStr}</Text>
            <Text style={{ fontSize: 10, color: '#aaa', fontWeight: '600' }}>ID: {role.id}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable onPress={() => handleToggleRoleVisibility(role.id, isPublic)} style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: isPublic ? '#fdba74' : '#86efac', backgroundColor: pressed ? (isPublic ? '#fff7ed' : '#f0fdf4') : 'transparent', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: isPublic ? '#ea580c' : '#16a34a' }}>{isPublic ? t('admin.makeHidden') : t('admin.makePublic')}</Text>
            </Pressable>
            <Pressable onPress={() => { setNewInviteRole(role.id); setShowInviteModal(true); fetchInviteCodes() }} style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', justifyContent: 'center', alignItems: 'center' })}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{t('admin.secretLink')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderColor: 'rgba(90,0,97,0.08)', backgroundColor: '#fafafa', padding: 16, gap: 10 }}>
        <View style={{ gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderColor: 'rgba(90,0,97,0.08)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.4 }}>{t('admin.permissions')}</Text><Pressable onPress={() => setEditingPermissions(!editingPermissions)}><Text style={{ fontSize: 12, fontWeight: '800', color: '#5a0061' }}>{editingPermissions ? t('admin.doneEditing') : t('admin.editPermissions')}</Text></Pressable></View>
          {editingPermissions ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{permissionsList.map((permission) => { const selected = rolePermissions.includes(permission.id); return <Pressable key={permission.id} onPress={() => handleUpdateRolePermissions(role.id, selected ? rolePermissions.filter((id) => id !== permission.id) : [...rolePermissions, permission.id])} style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: selected ? '#5a0061' : '#cbd5e1', backgroundColor: selected ? 'rgba(90,0,97,0.1)' : '#fff' }}><Text style={{ fontSize: 11, fontWeight: '700', color: selected ? '#5a0061' : '#475569' }}>{selected ? '✓ ' : ''}{permission.id}</Text></Pressable> })}</View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{rolePermissions.length ? rolePermissions.map((permission) => <View key={permission} style={{ backgroundColor: 'rgba(90,0,97,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ fontSize: 11, fontWeight: '700', color: '#5a0061' }}>{permission}</Text></View>) : <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{t('admin.noPermissionsAssigned')}</Text>}</View>}
        </View>
        <DeadlineRow
          label={t('admin.deadline')}
          value={role.close_at}
          emptyLabel={t('admin.noDeadlineSet')}
          onSave={(iso) => handleUpdateRoleDeadline(role.id, iso)}
        />
        <DeadlineRow
          label={t('admin.confirmDeadline')}
          value={role.confirm_close_at}
          emptyLabel={t('admin.noConfirmDeadlineSet')}
          onSave={(iso) => handleUpdateRoleConfirmDeadline(role.id, iso)}
        />
      </View>
    </View>
  )
}

export function RolesAccessTab({ rolesLoading, rolesList, permissionsList, rolePermissionsMap, handleUpdateRolePermissions, fetchRolesList, fetchInviteCodes, setShowCreateRoleModal, handleToggleRoleVisibility, setNewInviteRole, setShowInviteModal, handleUpdateRoleDeadline, handleUpdateRoleConfirmDeadline, inviteCodesList, copiedCodeId, copyInviteLink, styles }: RolesAccessTabProps) {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const isNarrow = width < 640
  return (
    <View style={{ width: '100%', gap: 20 }}>
      <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', flexDirection: isNarrow ? 'column' : 'row', justifyContent: 'space-between', alignItems: isNarrow ? 'stretch' : 'center', flexWrap: 'wrap', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#22002c', letterSpacing: -0.3 }}>{t('admin.rolesAccessTitle')}</Text>
          <Text style={{ fontSize: 13, color: '#666', marginTop: 2, lineHeight: 18 }}>{t('admin.rolesAccessSubtitle')}</Text>
        </View>
        <View style={[{ flexDirection: 'row', gap: 8 }, isNarrow && { width: '100%' }]}>
          <Pressable onPress={() => setShowCreateRoleModal(true)} style={({ pressed }) => ({ height: 40, paddingHorizontal: 18, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' })}>
            <AppIcon name="plus" size={14} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{t('admin.newRole')}</Text>
          </Pressable>
          <Pressable onPress={() => { fetchRolesList(); fetchInviteCodes() }} style={({ pressed }) => ({ height: 40, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.25)', backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : 'transparent', justifyContent: 'center', alignItems: 'center' })}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#5a0061' }}>{t('admin.refresh')}</Text>
          </Pressable>
        </View>
      </View>

      {rolesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c2b75f" />
          <Text style={styles.loadingText}>{t('admin.loadingRoles')}</Text>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {rolesList.map(role => (
            <RoleCard key={role.id} role={role} handleToggleRoleVisibility={handleToggleRoleVisibility} setNewInviteRole={setNewInviteRole} setShowInviteModal={setShowInviteModal} fetchInviteCodes={fetchInviteCodes} handleUpdateRoleDeadline={handleUpdateRoleDeadline} handleUpdateRoleConfirmDeadline={handleUpdateRoleConfirmDeadline} permissionsList={permissionsList} rolePermissions={rolePermissionsMap[role.id] || []} handleUpdateRolePermissions={handleUpdateRolePermissions} />
          ))}
        </View>
      )}

      <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#22002c', letterSpacing: -0.2 }}>{t('admin.secretInviteLinks')}</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{t('admin.secretInviteLinksSubtitle')}</Text>
          </View>
          <Pressable onPress={() => { setShowInviteModal(true); fetchInviteCodes() }} style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' })}>
            <AppIcon name="plus" size={13} color="#fff" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{t('admin.generateLink')}</Text>
          </Pressable>
        </View>
        {inviteCodesList.length === 0 ? (
          <Text style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic', paddingVertical: 10 }}>{t('admin.noInviteLinks')}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {inviteCodesList.map(invite => (
              <View key={invite.id} style={{ backgroundColor: '#faf6fd', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(90,0,97,0.1)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 200, flexShrink: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#5a0061' }}>{invite.code}</Text>
                    <View style={{ backgroundColor: 'rgba(90,0,97,0.1)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#5a0061', letterSpacing: 0.3 }}>{String(invite.application_type_id || 'role').toUpperCase()}</Text>
                    </View>
                    {invite.label && <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 12, color: '#666', flexShrink: 1 }}>— {invite.label}</Text>}
                  </View>
                  <Text style={{ fontSize: 11, color: '#888' }}>{t('admin.uses')}: {invite.use_count}/{invite.max_uses ?? '∞'} · {invite.is_active ? t('admin.active') : t('admin.inactive')}{invite.expires_at ? (new Date(invite.expires_at).getTime() < Date.now() ? ` · ${t('admin.inviteExpired')}` : ` · ${t('admin.inviteExpires')} ${new Date(invite.expires_at).toLocaleString()}`) : ''}</Text>
                </View>
                <Pressable onPress={() => copyInviteLink(invite.code, invite.application_type_id, invite.id)} style={({ pressed }) => ({ height: 32, paddingHorizontal: 14, borderRadius: 8, backgroundColor: copiedCodeId === invite.id ? '#16a34a' : pressed ? 'rgba(90,0,97,0.14)' : 'rgba(90,0,97,0.08)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 })}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: copiedCodeId === invite.id ? '#fff' : '#5a0061' }}>{copiedCodeId === invite.id ? t('admin.copied') : t('admin.copyLink')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
