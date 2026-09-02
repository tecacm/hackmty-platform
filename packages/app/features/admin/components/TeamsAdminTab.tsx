'use client'

import * as React from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { AppIcon } from '../../../components/app-icon'
import { StatusBadge } from './StatusBadge'
import { SubstituteModal } from './SubstituteModal'
import { AdminPaginationBar } from './AdminPaginationBar'
import { showAlert } from '../../../components/cross-alert'
import { useTranslation } from 'app/i18n'

type Member = { userId: string; name: string; email: string; status: string; isOwner: boolean }
type TeamGroup = { teamId: string; name: string; members: Member[] }

interface TeamsAdminTabProps {
  apps: any[]
  users: any[]
  loading: boolean
  onRemoveMember: (teamId: string, userId: string, name: string) => void
  onSubstitute: (teamId: string, outgoingId: string, incomingId: string) => Promise<void> | void
  onRenameTeam: (teamId: string, name: string) => void
}

export function TeamsAdminTab({ apps, users, loading, onRemoveMember, onSubstitute, onRenameTeam }: TeamsAdminTabProps) {
  const { t } = useTranslation()
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [subTeam, setSubTeam] = React.useState<TeamGroup | null>(null)
  const [subBusy, setSubBusy] = React.useState(false)
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState('')

  const saveRename = (teamId: string) => {
    const v = renameValue.trim()
    if (!v) return
    onRenameTeam(teamId, v)
    setRenamingId(null)
  }

  const handleSubConfirm = async (outgoingId: string, incomingId: string) => {
    if (!subTeam) return
    setSubBusy(true)
    try {
      await onSubstitute(subTeam.teamId, outgoingId, incomingId)
      setSubTeam(null)
    } catch {
      // keep the modal open on failure (the handler surfaces the error)
    } finally {
      setSubBusy(false)
    }
  }

  // Group the already-loaded applications by team (reuses the Submissions data — no extra fetch).
  const groups = React.useMemo<TeamGroup[]>(() => {
    const m = new Map<string, { teamId: string; name: string; creatorId: string | null; members: Map<string, Member> }>()
    for (const a of apps) {
      const teamId = a.profiles?.team_id
      if (!teamId) continue
      const teamName = a.profiles?.teams?.name || t('admin.teamUnnamed')
      const creatorId = a.profiles?.teams?.creator_id ?? null
      let g = m.get(teamId)
      if (!g) {
        g = { teamId, name: teamName, creatorId, members: new Map() }
        m.set(teamId, g)
      }
      const uid = a.user_id
      if (!uid) continue
      const name =
        `${a.profiles?.first_name || a.answers?.firstName || ''} ${a.profiles?.last_name || a.answers?.lastName || ''}`.trim() ||
        a.answers?.email ||
        `${uid.slice(0, 8)}`
      const email = a.profiles?.email || a.answers?.email || ''
      let mem = g.members.get(uid)
      if (!mem) {
        // Team membership comes from any app row; status defaults to not_started until a
        // hacker application is found for them.
        mem = { userId: uid, name, email, status: 'not_started', isOwner: uid === creatorId }
        g.members.set(uid, mem)
      } else {
        if (!mem.email && email) mem.email = email
      }
      // Status reflects the member's HACKER application only (ignore other application types).
      if (a.application_type_id === 'hacker') {
        mem.status = a.status
      }
    }
    return Array.from(m.values())
      .map((g) => ({ teamId: g.teamId, name: g.name, members: Array.from(g.members.values()).sort((x, y) => (x.isOwner === y.isOwner ? x.name.localeCompare(y.name) : x.isOwner ? -1 : 1)) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [apps, t])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.members.some((mem) => mem.name.toLowerCase().includes(q) || (mem.email || '').toLowerCase().includes(q)))
  }, [groups, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = React.useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])
  React.useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [totalPages, page])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const confirmRemove = (teamId: string, mem: Member) => {
    showAlert(t('admin.teamRemoveConfirmTitle'), t('admin.teamRemoveConfirmBody', { name: mem.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('admin.teamRemoveConfirm'), style: 'destructive', onPress: () => onRemoveMember(teamId, mem.userId, mem.name) },
    ])
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5a0061" style={{ marginVertical: 40 }} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('admin.teamsTab')}</Text>
      <Text style={styles.hint}>{t('admin.teamsTabHint')}</Text>

      <TextInput
        value={search}
        onChangeText={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder={t('admin.teamsSearch')}
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />

      {filtered.length === 0 ? (
        <Text style={styles.hint}>{t('admin.teamsNone')}</Text>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {pageItems.map((g) => {
              const isOpen = expanded.has(g.teamId)
              return (
                <View key={g.teamId} style={styles.teamCard}>
                  <View style={styles.teamHeader}>
                    {renamingId === g.teamId ? (
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          value={renameValue}
                          onChangeText={setRenameValue}
                          style={styles.renameInput}
                          placeholder={t('admin.teamRenamePlaceholder')}
                          placeholderTextColor="#94a3b8"
                          autoFocus
                          onSubmitEditing={() => saveRename(g.teamId)}
                        />
                        <Pressable onPress={() => saveRename(g.teamId)} style={styles.renameSaveBtn}>
                          <Text style={styles.renameSaveBtnText}>{t('admin.teamRenameSave')}</Text>
                        </Pressable>
                        <Pressable onPress={() => setRenamingId(null)} hitSlop={6}>
                          <AppIcon name="xmark" size={14} color="#94a3b8" />
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Pressable onPress={() => toggle(g.teamId)} style={{ flex: 1, minWidth: 140 }}>
                          <Text style={styles.teamName} numberOfLines={1}>{g.name}</Text>
                          <Text style={styles.teamMeta}>{t('admin.teamsMemberCount', { count: g.members.length })}</Text>
                        </Pressable>
                        <Pressable onPress={() => { setRenamingId(g.teamId); setRenameValue(g.name) }} style={styles.iconBtn} hitSlop={6}>
                          <AppIcon name="pencil" size={15} color="#5a0061" />
                        </Pressable>
                        <Pressable onPress={() => toggle(g.teamId)} hitSlop={6}>
                          <AppIcon name={isOpen ? 'chevron.down' : 'chevron.right'} size={16} color="#64748b" />
                        </Pressable>
                      </>
                    )}
                  </View>

                  {isOpen ? (
                    <View style={styles.memberList}>
                      <Pressable onPress={() => setSubTeam(g)} style={styles.subBtn}>
                        <AppIcon name="plus.circle.fill" size={15} color="#5a0061" />
                        <Text style={styles.subBtnText}>{t('admin.subOpen')}</Text>
                      </Pressable>
                      {g.members.map((mem) => (
                        <View key={mem.userId} style={styles.memberRow}>
                          <View style={{ flex: 1, minWidth: 160, gap: 3 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <Text style={styles.memberName} numberOfLines={1}>{mem.name}</Text>
                              {mem.isOwner ? <Text style={styles.ownerTag}>{t('admin.teamOwner')}</Text> : null}
                            </View>
                            {mem.email ? <Text style={styles.memberEmail} numberOfLines={1}>{mem.email}</Text> : null}
                          </View>
                          <StatusBadge status={mem.status} />
                          <Pressable onPress={() => confirmRemove(g.teamId, mem)} style={styles.removeBtn} hitSlop={6}>
                            <AppIcon name="xmark" size={13} color="#dc2626" />
                            <Text style={styles.removeBtnText}>{t('admin.teamRemove')}</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
          <AdminPaginationBar
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
          />
        </>
      )}

      <SubstituteModal
        visible={!!subTeam}
        onClose={() => setSubTeam(null)}
        teamName={subTeam?.name || ''}
        members={(subTeam?.members || []).map((m) => ({ userId: m.userId, name: m.name }))}
        users={users}
        submitting={subBusy}
        onConfirm={handleSubConfirm}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  teamCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  iconBtn: { padding: 4 },
  renameInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  renameSaveBtn: { backgroundColor: '#5a0061', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  renameSaveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  teamName: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  teamMeta: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  memberList: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 16, paddingBottom: 8 },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#faf5fb',
    borderWidth: 1,
    borderColor: '#e9d5ee',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  subBtnText: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc', flexWrap: 'wrap' },
  memberName: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  memberEmail: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  ownerTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
})
