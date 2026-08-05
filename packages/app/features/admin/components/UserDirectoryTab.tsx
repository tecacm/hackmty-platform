import * as React from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native'
import { PillButton } from '../../../components/pill-button'

interface UserDirectoryTabProps {
  userSearchQuery: string
  setUserSearchQuery: (val: string) => void
  userRoleFilter: string
  setUserRoleFilter: (val: string) => void
  fetchUsersDirectory: () => void
  usersLoading: boolean
  filteredUsers: any[]
  displayedUsers: any[]
  resetEmailSentUser: string | null
  handleOpenEditUser: (user: any) => void
  handleSendPasswordReset: (email: string, id: string) => void
  renderPaginationBar: (
    currentPage: number,
    totalPages: number,
    pageSize: number,
    totalItems: number,
    onPageChange: (page: number) => void,
    onPageSizeChange: (size: number) => void
  ) => React.ReactNode
  userPage: number
  totalUserPages: number
  userPageSize: number
  setUserPage: (page: number) => void
  setUserPageSize: (size: number) => void
  styles: any
}

export function UserDirectoryTab({
  userSearchQuery,
  setUserSearchQuery,
  userRoleFilter,
  setUserRoleFilter,
  fetchUsersDirectory,
  usersLoading,
  filteredUsers,
  displayedUsers,
  resetEmailSentUser,
  handleOpenEditUser,
  handleSendPasswordReset,
  renderPaginationBar,
  userPage,
  totalUserPages,
  userPageSize,
  setUserPage,
  setUserPageSize,
  styles,
}: UserDirectoryTabProps) {
  return (
    <View style={{ width: '100%', gap: 18 }}>
      {/* User Search & Filter Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { flex: 2 }]}
            placeholder="Search users by name, email, university, or ID..."
            placeholderTextColor="rgba(34, 0, 44, 0.4)"
            value={userSearchQuery}
            onChangeText={setUserSearchQuery}
          />

          <View style={styles.dropdownContainer}>
            <Pressable
              onPress={() => {
                const roles = ['all', 'user', 'admin', 'organizer', 'volunteer', 'mentor', 'judge', 'sponsor']
                const nextIdx = (roles.indexOf(userRoleFilter) + 1) % roles.length
                setUserRoleFilter(roles[nextIdx] || 'all')
              }}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownBtnText}>
                ROLE: {(userRoleFilter || 'all').toUpperCase()}
              </Text>
            </Pressable>
          </View>

          <PillButton
            title="↻ Refresh Users"
            onPress={fetchUsersDirectory}
            isLoading={usersLoading}
            variant="outline-primary"
            additionalStyle={{ width: 'auto', minWidth: 140, height: 42 }}
          />
        </View>
      </View>

      {/* Users Directory Table / Cards */}
      {usersLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading user directory...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found matching the search or role filter.</Text>
        </View>
      ) : (
        <>
          <View style={{ width: '100%', gap: 14 }}>
            {displayedUsers.map(user => {
              const isResetSent = resetEmailSentUser === user.id
              return (
                <View
                  key={user.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    gap: 12,
                    ...Platform.select({
                      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }
                    })
                  }}
                >
                  {/* Top Row: User Main Info & Quick Actions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 200 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
                          {user.first_name || 'Unnamed'} {user.last_name || 'User'}
                        </Text>
                        {user.roles.map((r: string) => (
                          <View
                            key={r}
                            style={{
                              backgroundColor: r === 'admin' ? '#fef2f2' : r === 'organizer' ? '#f5f3ff' : '#eff6ff',
                              borderColor: r === 'admin' ? '#fca5a5' : r === 'organizer' ? '#c4b5fd' : '#bfdbfe',
                              borderWidth: 1,
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: r === 'admin' ? '#dc2626' : r === 'organizer' ? '#7c3aed' : '#2563eb' }}>
                              {r.toUpperCase()}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <Text style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{user.email}</Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2, fontWeight: '600' }}>ID: {user.id}</Text>
                    </View>

                    {/* Quick Actions */}
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <PillButton
                        title="Edit User"
                        onPress={() => handleOpenEditUser(user)}
                        additionalStyle={{ height: 36, paddingHorizontal: 12, width: 'auto', backgroundColor: '#6d28d9' }}
                        fontSize={12}
                      />
                      <PillButton
                        title={isResetSent ? '✓ Sent!' : 'Password Reset'}
                        onPress={() => handleSendPasswordReset(user.email, user.id)}
                        variant={isResetSent ? 'primary' : 'outline-primary'}
                        additionalStyle={{ height: 36, paddingHorizontal: 12, width: 'auto' }}
                        fontSize={12}
                      />
                    </View>
                  </View>

                  {/* Applications Row - Dedicated Row that wraps cleanly */}
                  <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginRight: 4 }}>Applications:</Text>
                    {user.applications.length === 0 ? (
                      <Text style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>None</Text>
                    ) : (
                      user.applications.map((app: any, idx: number) => (
                        <View key={idx} style={{ backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#f3e8ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#6d28d9' }}>
                            {app.type.toUpperCase()}: <Text style={{ color: app.status === 'accepted' ? '#16a34a' : app.status === 'rejected' ? '#dc2626' : '#d97706' }}>{app.status}</Text>
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Extended User Info Bar */}
                  {(user.university || user.major || user.phone) && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 8 }}>
                      {user.university && <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '700', color: '#1e293b' }}>Uni:</Text> {user.university}</Text>}
                      {user.major && <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '700', color: '#1e293b' }}>Major:</Text> {user.major}</Text>}
                      {user.phone && <Text style={{ fontSize: 12, color: '#475569' }}><Text style={{ fontWeight: '700', color: '#1e293b' }}>Phone:</Text> {user.phone}</Text>}
                    </View>
                  )}
                </View>
              )
            })}
          </View>

          {renderPaginationBar(userPage, totalUserPages, userPageSize, filteredUsers.length, setUserPage, setUserPageSize)}
        </>
      )}
    </View>
  )
}
