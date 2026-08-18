'use client'

import * as React from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native'
import { PillButton } from '../../../components/pill-button'
import { AppIcon } from '../../../components/app-icon'
import { AdminPaginationBar } from './AdminPaginationBar'
import { ApplicationRow } from './ApplicationRow'
import { useTranslation } from 'app/i18n'

interface SubmissionsTabProps {
  stats: {
    total: number
    confirmed: number
    accepted: number
    submitted: number
    changesRequested: number
    rejected: number
  }
  searchQuery: string
  setSearchQuery: (val: string) => void
  includeInput: string
  setIncludeInput: (val: string) => void
  includeTags: string[]
  addIncludeTag: () => void
  removeIncludeTag: (tag: string) => void
  excludeInput: string
  setExcludeInput: (val: string) => void
  excludeTags: string[]
  addExcludeTag: () => void
  removeExcludeTag: (tag: string) => void
  selectedType: string
  setSelectedType: (val: string) => void
  dynamicTypeOptions: Array<{ id: string; label: string }> | any[]
  selectedStatus: string
  setSelectedStatus: (val: string) => void
  groupByTeams: boolean
  setGroupByTeams: (val: boolean) => void
  loading: boolean
  error: string | null
  filteredApps: any[]
  displayedApps: any[]
  groupedData: any
  expandedTeams: Record<string, boolean>
  toggleTeamExpand: (teamName: string) => void
  appPage: number
  totalAppPages: number
  appPageSize: number
  setAppPage: (page: number) => void
  setAppPageSize: (size: number) => void
  onOpenMessageModal?: (targetType: 'team' | 'user', targetId: string, targetName: string, memberUserIds?: string[]) => void
  onOpenSecretLinks?: () => void
  onRefresh?: () => void
}

export function SubmissionsTab({
  stats,
  searchQuery,
  setSearchQuery,
  includeInput = '',
  setIncludeInput,
  includeTags = [],
  addIncludeTag,
  removeIncludeTag,
  excludeInput = '',
  setExcludeInput,
  excludeTags = [],
  addExcludeTag,
  removeExcludeTag,
  selectedType,
  setSelectedType,
  dynamicTypeOptions,
  selectedStatus,
  setSelectedStatus,
  groupByTeams,
  setGroupByTeams,
  loading,
  error,
  filteredApps,
  displayedApps,
  groupedData,
  expandedTeams,
  toggleTeamExpand,
  appPage,
  totalAppPages,
  appPageSize,
  setAppPage,
  setAppPageSize,
  onOpenMessageModal,
  onOpenSecretLinks,
  onRefresh,
}: SubmissionsTabProps) {
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const isSmallScreen = width > 0 && width < 640

  const normalizedGroupedData = React.useMemo(() => {
    if (!groupedData) return []
    if (Array.isArray(groupedData)) {
      return groupedData.map((group: any) => ({
        teamName: String(group?.teamName || 'Team'),
        applications: Array.isArray(group?.applications) ? group.applications : [],
      }))
    }
    return Object.entries(groupedData).map(([teamName, apps]: [string, any]) => ({
      teamName,
      applications: Array.isArray(apps) ? apps : Array.isArray(apps?.applications) ? apps.applications : [],
    }))
  }, [groupedData])

  const totalTeamPages = Math.ceil(normalizedGroupedData.length / appPageSize) || 1
  const displayedGroupedData = React.useMemo(() => {
    const start = (appPage - 1) * appPageSize
    return normalizedGroupedData.slice(start, start + appPageSize)
  }, [normalizedGroupedData, appPage, appPageSize])

  return (
    <View style={styles.container}>
      {/* Stats Overview Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statCount}>{stats?.total ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.total')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#7c3aed' }]}>{stats?.confirmed ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.confirmed')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#16a34a' }]}>{stats?.accepted ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.accepted')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#2563eb' }]}>{stats?.submitted ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.submitted')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#d97706' }]}>{stats?.changesRequested ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.changesRequested')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#dc2626' }]}>{stats?.rejected ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.rejected')}</Text>
        </View>
      </View>

      {/* Advanced Filter Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchRow}>
          <View style={styles.searchCol}>
            <AppIcon name="magnifyingglass" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('admin.searchCandidatePlaceholder')}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!!searchQuery && (
              <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <AppIcon name="xmark" size={14} color="#64748b" />
              </Pressable>
            )}
          </View>

          <View style={styles.dropdownContainer}>
            <Pressable
              onPress={() => {
                const types = Array.from(new Set(['all', ...(dynamicTypeOptions || []).map((t: any) => typeof t === 'string' ? t : t.id)]))
                const currentIdx = types.indexOf(selectedType)
                const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % types.length
                setSelectedType(types[nextIdx] || 'all')
              }}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownBtnText}>
                {t('admin.roleFilter', [(selectedType || 'all').toUpperCase()])}
              </Text>
            </Pressable>
          </View>

          <View style={styles.dropdownContainer}>
            <Pressable
              onPress={() => {
                const statuses = ['all', 'confirmed', 'accepted', 'submitted', 'changes_requested', 'rejected', 'draft']
                const nextIdx = (statuses.indexOf(selectedStatus) + 1) % statuses.length
                setSelectedStatus(statuses[nextIdx] || 'all')
              }}
              style={styles.dropdownBtn}
            >
              <Text style={styles.dropdownBtnText}>
                {t('admin.statusFilter', [(selectedStatus || 'all').toUpperCase().replace('_', ' ')])}
              </Text>
            </Pressable>
          </View>

          <PillButton
            title={groupByTeams ? t('admin.groupedTeams') : t('admin.groupByTeams')}
            onPress={() => setGroupByTeams(!groupByTeams)}
            variant={groupByTeams ? 'primary' : 'outline-primary'}
            additionalStyle={styles.groupBtn}
            fontSize={12}
          />

          {onOpenSecretLinks ? (
            <PillButton
              title={t('admin.secretLinks')}
              onPress={onOpenSecretLinks}
              variant="outline-primary"
              additionalStyle={{ height: 44, paddingHorizontal: 14, width: 'auto' }}
              fontSize={12}
            />
          ) : null}

          {onRefresh ? (
            <PillButton
              title={`↻ ${t('admin.refresh')}`}
              onPress={onRefresh}
              isLoading={loading}
              variant="outline-primary"
              additionalStyle={{ height: 44, paddingHorizontal: 14, width: 'auto' }}
              fontSize={12}
            />
          ) : null}
        </View>

        {/* Include & Exclude Tag Filter Triggers */}
        <View style={[styles.tagsInputRow, isSmallScreen && styles.flexCol]}>
          <View style={[styles.tagInputWrapper, isSmallScreen && styles.fullWidth]}>
            <TextInput
              style={styles.tagTextInput}
              placeholder={t('admin.includeTagPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={includeInput}
              onChangeText={setIncludeInput}
              onSubmitEditing={addIncludeTag}
            />
            <PillButton
              variant="success"
              title={isSmallScreen ? '+' : t('admin.mustHave')}
              onPress={addIncludeTag}
              additionalStyle={[styles.tagActionBtn, isSmallScreen && styles.tagActionBtnSmall, { backgroundColor: '#16a34a' }]}
              fontSize={isSmallScreen ? 16 : 11}
            />
          </View>

          <View style={[styles.tagInputWrapper, isSmallScreen && styles.fullWidth]}>
            <TextInput
              style={styles.tagTextInput}
              placeholder={t('admin.excludeTagPlaceholder')}
              placeholderTextColor="#94a3b8"
              value={excludeInput}
              onChangeText={setExcludeInput}
              onSubmitEditing={addExcludeTag}
            />
            <PillButton
              variant="danger"
              title={isSmallScreen ? '-' : t('admin.exclude')}
              onPress={addExcludeTag}
              additionalStyle={[styles.tagActionBtn, isSmallScreen && styles.tagActionBtnSmall, { backgroundColor: '#dc2626' }]}
              fontSize={isSmallScreen ? 18 : 11}
            />
          </View>
        </View>

        {/* Render Tag Chips */}
        {includeTags.length > 0 || excludeTags.length > 0 ? (
          <View style={styles.chipsRow}>
            {includeTags.map((t) => (
              <Pressable key={t} onPress={() => removeIncludeTag(t)} style={styles.includeChip}>
                <Text style={styles.includeChipText}>+ {t} ✕</Text>
              </Pressable>
            ))}
            {excludeTags.map((t) => (
              <Pressable key={t} onPress={() => removeExcludeTag(t)} style={styles.excludeChip}>
                <Text style={styles.excludeChipText}>- {t} ✕</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Content List & Groupings */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5a0061" />
            <Text style={styles.loadingText}>{t('admin.fetchingCandidates')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('admin.noApplicationsFound')}</Text>
          </View>
        ) : groupByTeams ? (
          <>
            <View style={styles.teamsGrid}>
              {displayedGroupedData.map((group) => {
                const teamName = group.teamName
                const teamApps = group.applications
                const isExpanded = !!expandedTeams[teamName]
                return (
                  <View key={teamName} style={styles.teamCard}>
                    <Pressable
                      onPress={() => toggleTeamExpand(teamName)}
                      style={[styles.teamHeaderRow, isSmallScreen && { paddingHorizontal: 12 }]}
                    >
                      <View style={styles.teamTitleRow}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.teamNameText}>
                          {teamName}
                        </Text>
                        <View style={styles.memberBadge}>
                          <Text style={styles.memberBadgeText}>
                            {teamApps.length} {teamApps.length === 1 ? t('admin.member') : t('admin.members')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.teamActionsRow}>
                        {onOpenMessageModal ? (
                          <Pressable
                            onPress={(e: any) => {
                              if (typeof e?.stopPropagation === 'function') e.stopPropagation()
                              const memberIds = teamApps.map((a: any) => a.user_id).filter(Boolean)
                              onOpenMessageModal('team', teamName, teamName, memberIds)
                            }}
                            style={styles.teamMsgBtn}
                          >
                            <AppIcon name="envelope.fill" size={12} color="#5a0061" />
                            <Text style={styles.teamMsgBtnText}>
                              {isSmallScreen ? 'Msg' : 'Msg Team'}
                            </Text>
                          </Pressable>
                        ) : null}

                        <View style={styles.expandToggleRow}>
                          <AppIcon name={isExpanded ? 'chevron.up' : 'chevron.down'} size={14} color="#5a0061" />
                          <Text style={styles.expandToggleText}>
                            {isExpanded ? 'Hide' : 'Expand'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    {isExpanded ? (
                      <View style={styles.teamAppsList}>
                        {teamApps.map((app: any) => (
                          <ApplicationRow
                            key={app.id}
                            app={app}
                            onOpenMessageModal={onOpenMessageModal}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                )
              })}
            </View>

            <AdminPaginationBar
              currentPage={appPage}
              totalPages={totalTeamPages}
              pageSize={appPageSize}
              totalItems={normalizedGroupedData.length}
              onPageChange={setAppPage}
              onPageSizeChange={setAppPageSize}
            />
          </>
        ) : (
          <>
            <View style={styles.appsList}>
              {displayedApps.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  onOpenMessageModal={onOpenMessageModal}
                />
              ))}
            </View>

            <AdminPaginationBar
              currentPage={appPage}
              totalPages={totalAppPages}
              pageSize={appPageSize}
              totalItems={filteredApps.length}
              onPageChange={setAppPage}
              onPageSizeChange={setAppPageSize}
            />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolbarCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  searchCol: {
    flex: 1,
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
    height: 44,
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
  groupBtn: {
    height: 44,
    paddingHorizontal: 14,
    width: 'auto',
  },
  tagsInputRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagInputWrapper: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tagTextInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    color: '#0f172a',
  },
  tagActionBtn: {
    height: 38,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 'auto',
  },
  tagActionBtnSmall: {
    width: 38,
    paddingHorizontal: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  includeChip: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  includeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  excludeChip: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  excludeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  listContainer: {
    width: '100%',
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
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
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
  teamsGrid: {
    gap: 16,
  },
  teamCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  teamHeaderRow: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  teamTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  teamNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  memberBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  teamActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  teamMsgBtn: {
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    borderColor: 'rgba(90, 0, 97, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamMsgBtnText: {
    color: '#5a0061',
    fontSize: 11,
    fontWeight: '700',
  },
  expandToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5a0061',
  },
  teamAppsList: {
    padding: 14,
    gap: 10,
  },
  appsList: {
    gap: 10,
  },
  flexCol: {
    flexDirection: 'column',
  },
  fullWidth: {
    width: '100%',
  },
})
