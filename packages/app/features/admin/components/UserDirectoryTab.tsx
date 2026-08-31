'use client'

import * as React from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { PillButton } from '../../../components/pill-button'
import { AppIcon } from '../../../components/app-icon'
import { AdminPaginationBar } from './AdminPaginationBar'
import { AwardModal } from './AwardModal'
import { UserBadges } from 'app/components/user-badges'
import { useTranslation } from 'app/i18n'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'

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
  userPage: number
  totalUserPages: number
  userPageSize: number
  setUserPage: (page: number) => void
  setUserPageSize: (size: number) => void
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
  userPage,
  totalUserPages,
  userPageSize,
  setUserPage,
  setUserPageSize,
}: UserDirectoryTabProps) {
  const { t, locale } = useTranslation()
  const [awardUser, setAwardUser] = React.useState<any | null>(null)
  const [badgeRefreshKey, setBadgeRefreshKey] = React.useState(0)

  return (
    <View style={styles.container}>
      {/* User Search & Filter Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchRow}>
          <View style={styles.searchCol}>
            <AppIcon name="magnifyingglass" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('admin.searchUsersPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={userSearchQuery}
              onChangeText={setUserSearchQuery}
            />
            {!!userSearchQuery && (
              <Pressable onPress={() => setUserSearchQuery('')} style={{ padding: 4 }}>
                <AppIcon name="xmark" size={14} color="#64748b" />
              </Pressable>
            )}
          </View>

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
                {t('admin.roleFilter', [(userRoleFilter || 'all').toUpperCase()])}
              </Text>
            </Pressable>
          </View>

          <PillButton
            title={`↻ ${t('admin.refreshUsers')}`}
            onPress={fetchUsersDirectory}
            isLoading={usersLoading}
            variant="outline-primary"
            additionalStyle={styles.refreshBtn}
          />
        </View>
      </View>

      {/* Users Directory Table / Cards */}
      {usersLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5a0061" />
          <Text style={styles.loadingText}>{t('admin.loadingUsers')}</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('admin.noUsersFound')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.usersList}>
            {displayedUsers.map((user) => {
              const isResetSent = resetEmailSentUser === user.id
              return (
                <View key={user.id} style={styles.userCard}>
                  {/* Top Row: User Main Info & Quick Actions */}
                  <View style={styles.userHeaderRow}>
                    <View style={styles.userMainInfo}>
                      <View style={styles.userNameRolesRow}>
                        <Text style={styles.userNameText}>
                          {user.first_name || t('admin.unnamedFirst')} {user.last_name || t('admin.unnamedLast')}
                        </Text>
                        {(user.roles || []).map((r: string) => (
                          <View
                            key={r}
                            style={[
                              styles.roleBadge,
                              r === 'admin' && styles.roleBadgeAdmin,
                              r === 'organizer' && styles.roleBadgeOrganizer,
                              r !== 'admin' && r !== 'organizer' && styles.roleBadgeDefault,
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                r === 'admin' && { color: '#dc2626' },
                                r === 'organizer' && { color: '#5a0061' },
                                r !== 'admin' && r !== 'organizer' && { color: '#2563eb' },
                              ]}
                            >
                              {getApplicantRoleLabel(r, locale).toUpperCase()}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.userEmailText}>{user.email}</Text>
                      <Text style={styles.userIdText}>ID: {user.id}</Text>
                      <View style={styles.badgesRow}>
                        <UserBadges key={`${user.id}-${badgeRefreshKey}`} userId={user.id} size={26} showLabels gap={10} />
                      </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.userActionsRow}>
                      <PillButton
                        title={t('admin.editUser')}
                        onPress={() => handleOpenEditUser(user)}
                        additionalStyle={styles.editBtn}
                        fontSize={12}
                      />
                      <PillButton
                        title={t('admin.awardAction')}
                        onPress={() => setAwardUser(user)}
                        variant="outline-primary"
                        additionalStyle={styles.actionBtn}
                        fontSize={12}
                      />
                      <PillButton
                        title={isResetSent ? t('admin.copied') : t('admin.passwordReset')}
                        onPress={() => handleSendPasswordReset(user.email, user.id)}
                        variant={isResetSent ? 'primary' : 'outline-primary'}
                        additionalStyle={styles.actionBtn}
                        fontSize={12}
                      />
                    </View>
                  </View>

                  {/* Applications Row */}
                  <View style={styles.appsRow}>
                    <Text style={styles.appsLabel}>{t('admin.applications')}</Text>
                    {(!user.applications || user.applications.length === 0) ? (
                      <Text style={styles.noAppsText}>{t('admin.noApplications')}</Text>
                    ) : (
                      (user.applications || []).map((app: any, idx: number) => (
                        <View key={idx} style={styles.appTypeBadge}>
                          <Text style={styles.appTypeBadgeText}>
                            {app.type.toUpperCase()}:{' '}
                            <Text
                              style={{
                                color:
                                  app.status === 'confirmed'
                                    ? '#7c3aed'
                                    : app.status === 'accepted'
                                    ? '#16a34a'
                                    : app.status === 'rejected'
                                    ? '#dc2626'
                                    : '#d97706',
                              }}
                            >
                              {app.status}
                            </Text>
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Extended User Info Bar */}
                  {Boolean(user.university || user.major || user.phone) ? (
                    <View style={styles.extraInfoRow}>
                      {Boolean(user.university) ? (
                        <Text style={styles.extraInfoText}>
                          <Text style={styles.extraInfoLabel}>{t('admin.uniLabel')}</Text> {user.university}
                        </Text>
                      ) : null}
                      {Boolean(user.major) ? (
                        <Text style={styles.extraInfoText}>
                          <Text style={styles.extraInfoLabel}>{t('admin.majorLabel')}</Text> {user.major}
                        </Text>
                      ) : null}
                      {Boolean(user.phone) ? (
                        <Text style={styles.extraInfoText}>
                          <Text style={styles.extraInfoLabel}>{t('admin.phoneLabel')}</Text> {user.phone}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>

          <AdminPaginationBar
            currentPage={userPage}
            totalPages={totalUserPages}
            pageSize={userPageSize}
            totalItems={filteredUsers.length}
            onPageChange={setUserPage}
            onPageSizeChange={setUserPageSize}
          />
        </>
      )}

      <AwardModal
        visible={!!awardUser}
        user={awardUser}
        onClose={() => setAwardUser(null)}
        onAwarded={() => setBadgeRefreshKey((k) => k + 1)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 18,
  },
  toolbarCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  searchCol: {
    flex: 2,
    minWidth: 240,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  dropdownContainer: {
    minWidth: 140,
  },
  dropdownBtn: {
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  dropdownBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  refreshBtn: {
    width: 'auto',
    minWidth: 140,
    height: 44,
  },
  loadingContainer: {
    marginVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  usersList: {
    width: '100%',
    gap: 14,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  userHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  userMainInfo: {
    flex: 1,
    minWidth: 200,
  },
  userNameRolesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeAdmin: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  roleBadgeOrganizer: {
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    borderColor: 'rgba(90, 0, 97, 0.2)',
  },
  roleBadgeDefault: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  userEmailText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  userIdText: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
    fontWeight: '600',
  },
  badgesRow: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  userActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  editBtn: {
    height: 36,
    paddingHorizontal: 12,
    width: 'auto',
    backgroundColor: '#5a0061',
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 12,
    width: 'auto',
  },
  appsRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  appsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginRight: 4,
  },
  noAppsText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  appTypeBadge: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#f3e8ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  appTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5a0061',
  },
  extraInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 8,
  },
  extraInfoText: {
    fontSize: 12,
    color: '#475569',
  },
  extraInfoLabel: {
    fontWeight: '700',
    color: '#1e293b',
  },
})
