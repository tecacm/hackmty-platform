import * as React from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform, useWindowDimensions } from 'react-native'
import { PillButton } from '../../../components/pill-button'
import { AppIcon } from '../../../components/app-icon'

interface SubmissionsTabProps {
  stats: {
    total: number
    submitted: number
    accepted: number
    rejected: number
    inReview: number
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
  renderApplicationRow: (app: any) => React.ReactNode
  renderPaginationBar: (
    currentPage: number,
    totalPages: number,
    pageSize: number,
    totalItems: number,
    onPageChange: (page: number) => void,
    onPageSizeChange: (size: number) => void
  ) => React.ReactNode
  appPage: number
  totalAppPages: number
  appPageSize: number
  setAppPage: (page: number) => void
  setAppPageSize: (size: number) => void
  onOpenMessageModal?: (targetType: 'team' | 'user', targetId: string, targetName: string, memberUserIds?: string[]) => void
  styles: any
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
  renderApplicationRow,
  renderPaginationBar,
  appPage,
  totalAppPages,
  appPageSize,
  setAppPage,
  setAppPageSize,
  onOpenMessageModal,
  styles,
}: SubmissionsTabProps) {
  const { width } = useWindowDimensions()
  const [hasMounted, setHasMounted] = React.useState(false)
  React.useEffect(() => { setHasMounted(true) }, [])
  const isSmallScreen = hasMounted && width > 0 && width < 640

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
      applications: Array.isArray(apps) ? apps : (Array.isArray(apps?.applications) ? apps.applications : []),
    }))
  }, [groupedData])

  const totalTeamPages = Math.ceil(normalizedGroupedData.length / appPageSize) || 1
  const displayedGroupedData = React.useMemo(() => {
    const start = (appPage - 1) * appPageSize
    return normalizedGroupedData.slice(start, start + appPageSize)
  }, [normalizedGroupedData, appPage, appPageSize])

  return (
    <View style={{ width: '100%', gap: 18 }}>
      {/* Stats Overview Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statCount}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#2563eb' }]}>{stats.submitted}</Text>
          <Text style={styles.statLabel}>Submitted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#16a34a' }]}>{stats.accepted}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#dc2626' }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statCount, { color: '#d97706' }]}>{stats.inReview}</Text>
          <Text style={styles.statLabel}>In Review</Text>
        </View>
      </View>

      {/* Advanced Filter Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 260, height: 44 }}>
            <TextInput
              style={[styles.searchInput, { height: 44, width: '100%' }]}
              placeholder="Search candidate, email, university..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={[styles.dropdownContainer, { height: 44 }]}>
            <Pressable
              onPress={() => {
                const types = Array.from(new Set(['all', ...(dynamicTypeOptions || []).map((t: any) => typeof t === 'string' ? t : t.id)]))
                const currentIdx = types.indexOf(selectedType)
                const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % types.length
                setSelectedType(types[nextIdx] || 'all')
              }}
              style={[styles.dropdownBtn, { height: 44 }]}
            >
              <Text style={styles.dropdownBtnText}>
                ROLE: {(selectedType || 'all').toUpperCase()}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.dropdownContainer, { height: 44 }]}>
            <Pressable
              onPress={() => {
                const statuses = ['all', 'submitted', 'accepted', 'rejected', 'in_review', 'draft']
                const nextIdx = (statuses.indexOf(selectedStatus) + 1) % statuses.length
                setSelectedStatus(statuses[nextIdx] || 'all')
              }}
              style={[styles.dropdownBtn, { height: 44 }]}
            >
              <Text style={styles.dropdownBtnText}>
                STATUS: {(selectedStatus || 'all').toUpperCase()}
              </Text>
            </Pressable>
          </View>

          <PillButton
            title={groupByTeams ? '✓ Grouped Teams' : 'Group by Teams'}
            onPress={() => setGroupByTeams(!groupByTeams)}
            variant={groupByTeams ? 'primary' : 'outline-primary'}
            additionalStyle={{ height: 44, paddingHorizontal: 14, width: 'auto' }}
            fontSize={12}
          />
        </View>

        {/* Include & Exclude Tag Filter Triggers */}
        <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          <View style={{ flex: isSmallScreen ? undefined : 1, width: isSmallScreen ? '100%' : undefined, minWidth: isSmallScreen ? '100%' : 240, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              style={[styles.searchInput, { flex: 1, height: 38, fontSize: 13 }]}
              placeholder="Include tag (e.g. Python, MIT)..."
              placeholderTextColor="#94a3b8"
              value={includeInput}
              onChangeText={setIncludeInput}
              onSubmitEditing={addIncludeTag}
            />
            <PillButton
              variant="success"
              title={isSmallScreen ? '+' : '+ Must Have'}
              onPress={addIncludeTag}
              additionalStyle={{
                height: 38,
                width: isSmallScreen ? 38 : 'auto',
                minWidth: isSmallScreen ? 38 : undefined,
                paddingHorizontal: isSmallScreen ? 0 : 12,
                backgroundColor: '#16a34a',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              fontSize={isSmallScreen ? 16 : 11}
            />
          </View>

          <View style={{ flex: isSmallScreen ? undefined : 1, width: isSmallScreen ? '100%' : undefined, minWidth: isSmallScreen ? '100%' : 240, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              style={[styles.searchInput, { flex: 1, height: 38, fontSize: 13 }]}
              placeholder="Exclude tag (e.g. Java, High School)..."
              placeholderTextColor="#94a3b8"
              value={excludeInput}
              onChangeText={setExcludeInput}
              onSubmitEditing={addExcludeTag}
            />
            <PillButton
              variant="danger"
              title={isSmallScreen ? '-' : '- Exclude'}
              onPress={addExcludeTag}
              additionalStyle={{
                height: 38,
                width: isSmallScreen ? 38 : 'auto',
                minWidth: isSmallScreen ? 38 : undefined,
                paddingHorizontal: isSmallScreen ? 0 : 12,
                backgroundColor: '#dc2626',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              fontSize={isSmallScreen ? 18 : 11}
            />
          </View>
        </View>

        {/* Render Tag Chips */}
        {(includeTags.length > 0 || excludeTags.length > 0) && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {includeTags.map(t => (
              <Pressable key={t} onPress={() => removeIncludeTag(t)} style={{ backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803d' }}>+ {t} ✕</Text>
              </Pressable>
            ))}
            {excludeTags.map(t => (
              <Pressable key={t} onPress={() => removeExcludeTag(t)} style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>- {t} ✕</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Content List & Groupings */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>Fetching candidate applications...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No applications found matching criteria.</Text>
          </View>
        ) : groupByTeams ? (
          <>
            <View style={{ gap: 16 }}>
              {displayedGroupedData.map(group => {
                const teamName = group.teamName
                const teamApps = group.applications
                const isExpanded = !!expandedTeams[teamName]
                return (
                  <View key={teamName} style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }}>
                    <Pressable
                      onPress={() => toggleTeamExpand(teamName)}
                      style={{
                        paddingHorizontal: isSmallScreen ? 12 : 18,
                        paddingVertical: 12,
                        backgroundColor: '#f8fafc',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{ fontSize: isSmallScreen ? 14 : 16, fontWeight: '800', color: '#0f172a', flexShrink: 1 }}
                        >
                          {teamName}
                        </Text>
                        <View style={{ backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#334155' }}>
                            {teamApps.length} {teamApps.length === 1 ? 'Member' : 'Members'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSmallScreen ? 6 : 10, flexShrink: 0 }}>
                        {onOpenMessageModal ? (
                          <Pressable
                            onPress={(e: any) => {
                              if (typeof e?.stopPropagation === 'function') e.stopPropagation()
                              const memberIds = teamApps.map((a: any) => a.user_id).filter(Boolean)
                              onOpenMessageModal('team', teamName, teamName, memberIds)
                            }}
                            style={{
                              backgroundColor: '#f3e8ff',
                              borderColor: '#c084fc',
                              borderWidth: 1,
                              borderRadius: 12,
                              paddingHorizontal: isSmallScreen ? 6 : 10,
                              paddingVertical: 5,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <AppIcon name="message.fill" size={12} color="#7e22ce" />
                            <Text style={{ color: '#7e22ce', fontSize: 11, fontWeight: '700' }}>
                              {isSmallScreen ? 'Msg' : 'Msg Team'}
                            </Text>
                          </Pressable>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <AppIcon name={isExpanded ? 'chevron.up' : 'chevron.down'} size={14} color="#6d28d9" />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#6d28d9' }}>
                            {isExpanded ? 'Hide' : 'Expand'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View style={{ padding: 14, gap: 10 }}>
                        {teamApps.map((app: any) => renderApplicationRow(app))}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
            {renderPaginationBar(
              appPage,
              totalTeamPages,
              appPageSize,
              normalizedGroupedData.length,
              setAppPage,
              setAppPageSize
            )}
          </>
        ) : (
          <>
            <View style={{ gap: 12 }}>
              {displayedApps.map(app => renderApplicationRow(app))}
            </View>
            {renderPaginationBar(
              appPage,
              totalAppPages,
              appPageSize,
              filteredApps.length,
              setAppPage,
              setAppPageSize
            )}
          </>
        )}
      </View>
    </View>
  )
}
