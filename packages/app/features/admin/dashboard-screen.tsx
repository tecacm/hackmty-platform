import { useState, useEffect, useMemo, useLayoutEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Platform,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
  TextInput,
  ScrollView,
  Modal
} from 'react-native'
import { PillButton } from 'app/components/pill-button'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'

interface Application {
  id: string
  status: string
  admin_feedback: string | null
  application_type_id: string
  answers: Record<string, any>
  user_id: string
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    team_id: string | null
    teams: {
      id: string
      name: string
    } | null
  } | null
}

export function AdminDashboardScreen() {
  const { navigateTo } = useSmartNavigate()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const hasViewOthersPermission = !permissionsLoading && hasPermission('applications', 'view_others')
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [excludeInput, setExcludeInput] = useState<string>('')
  const [excludeTags, setExcludeTags] = useState<string[]>([])
  
  const addExcludeTag = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const cleanTag = trimmed.endsWith(',') ? trimmed.slice(0, -1).trim() : trimmed
    if (cleanTag && !excludeTags.includes(cleanTag)) {
      setExcludeTags(prev => [...prev, cleanTag])
    }
    setExcludeInput('')
  }

  const removeExcludeTag = (tagToRemove: string) => {
    setExcludeTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const [groupByTeams, setGroupByTeams] = useState(false)
  // Request Changes Modal (Transferred to subscreen detail view)
  // Inline expansion states removed

  // Team Collapsed States
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({})

  const toggleTeamExpand = (teamName: string) => {
    setExpandedTeams(prev => ({ ...prev, [teamName]: !prev[teamName] }))
  }

  const expandAllTeams = () => {
    const next: Record<string, boolean> = {}
    groupedData.forEach(g => {
      next[g.teamName] = true
    })
    setExpandedTeams(next)
  }

  const collapseAllTeams = () => {
    setExpandedTeams({})
  }

  // Layout sizing
  const { height: screenHeight } = useWindowDimensions()
  // Load applications
  const fetchApplications = async () => {
    try {
      setError(null)
      setLoading(true)

      if (!isSupabaseConfigured) {
        // Fallback mock data for developer sandbox (filter out drafts)
        setApps(mockApplications.filter(app => app.status !== 'draft'))
        setLoading(false)
        return
      }

      const { data: appsData, error: fetchErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          admin_feedback,
          application_type_id,
          answers,
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            team_id
          )
        `)
        .neq('status', 'draft')

      if (fetchErr) throw fetchErr

      const { data: teamsData, error: teamsErr } = await supabase
        .from('teams')
        .select('id, name')

      if (teamsErr) {
        console.warn('Failed to fetch teams mapping in Admin Portal:', teamsErr)
      }

      const teamsMap = new Map((teamsData || []).map((t: any) => [t.id, t.name]))

      // Format applications to guarantee user emails and resolve teams in-memory
      const formatted = (appsData || []).map((app: any) => {
        const teamId = app.profiles?.team_id
        const teamName = teamId ? teamsMap.get(teamId) : null

        const getActiveFeedback = (feedbackVal: any): string | null => {
          if (!feedbackVal) return null
          if (typeof feedbackVal === 'string') return feedbackVal
          if (Array.isArray(feedbackVal)) {
            const active = feedbackVal.find(f => !f.resolved_at)
            return active ? active.feedback : null
          }
          return null
        }

        return {
          ...app,
          admin_feedback: getActiveFeedback(app.admin_feedback),
          profiles: app.profiles ? {
            ...app.profiles,
            email: app.answers?.email || 'No email provided',
            teams: teamId && teamName ? { id: teamId, name: teamName } : null
          } : null
        }
      })

      setApps(formatted)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasViewOthersPermission) {
      fetchApplications()
    }
  }, [hasViewOthersPermission])

  // Get available countries dynamically
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>()
    apps.forEach(app => {
      const country = app.answers?.country
      if (country && typeof country === 'string') {
        countries.add(country)
      }
    })
    return Array.from(countries).sort()
  }, [apps])

  // Toggle country filter
  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country))
    } else {
      setSelectedCountries([...selectedCountries, country])
    }
  }

  // Status updates and modal handlers removed (transferred to UserDetailScreen)

  // Filter applications list
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      // 1. Search Query (First Name, Last Name, Email, University)
      const firstName = app.profiles?.first_name || app.answers?.firstName || ''
      const lastName = app.profiles?.last_name || app.answers?.lastName || ''
      const fullName = `${firstName} ${lastName}`.toLowerCase()
      const email = app.answers?.email || ''
      const university = app.answers?.university || ''
      const city = app.answers?.city || ''
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.toLowerCase().includes(searchQuery.toLowerCase())

      // 2. Application Type
      const matchesType = selectedType === 'all' || app.application_type_id === selectedType

      // 3. Countries Multi-select
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(app.answers?.country)

      // 4. Status Filter
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus

      // 5. Exclude Tags (pill-based multi-filter)
      let matchesExclude = true
      if (excludeTags.length > 0) {
        for (const tag of excludeTags) {
          const queryStr = tag.toLowerCase().trim()
          let matchesThisTag = false
          
          if (queryStr.includes(':')) {
            const parts = queryStr.split(':')
            const prefix = (parts[0] || '').trim()
            const val = parts.slice(1).join(':').trim()
            
            if (prefix === 'university' || prefix === 'uni' || prefix === 'school') {
              matchesThisTag = university.toLowerCase().includes(val)
            } else if (prefix === 'city') {
              const city = app.answers?.city || ''
              matchesThisTag = city.toLowerCase().includes(val)
            } else {
              const city = app.answers?.city || ''
              matchesThisTag = university.toLowerCase().includes(queryStr) || city.toLowerCase().includes(queryStr)
            }
          } else {
            const city = app.answers?.city || ''
            matchesThisTag = university.toLowerCase().includes(queryStr) || city.toLowerCase().includes(queryStr)
          }
          
          if (matchesThisTag) {
            matchesExclude = false
            break
          }
        }
      }

      return matchesSearch && matchesType && matchesCountry && matchesStatus && matchesExclude
    })
  }, [apps, searchQuery, selectedType, selectedCountries, selectedStatus, excludeTags])

  // Statistics summaries
  const stats = useMemo(() => {
    const total = apps.length
    const accepted = apps.filter(app => app.status === 'accepted').length
    const rejected = apps.filter(app => app.status === 'rejected').length
    const changes = apps.filter(app => app.status === 'changes_requested').length
    const submitted = apps.filter(app => app.status === 'submitted').length
    const drafts = apps.filter(app => app.status === 'draft').length
    return { total, accepted, rejected, changes, submitted, drafts }
  }, [apps])

  // Grouped by Team Map
  const groupedData = useMemo(() => {
    if (!groupByTeams) return []

    const teamMap: Record<string, { teamName: string; applications: Application[] }> = {}
    const individual: Application[] = []

    filteredApps.forEach(app => {
      const team = app.profiles?.teams
      const isHacker = app.application_type_id === 'hacker'
      if (isHacker && team && team.id && team.name) {
        const teamId = team.id
        if (!teamMap[teamId]) {
          teamMap[teamId] = { teamName: team.name, applications: [] }
        }
        const entry = teamMap[teamId]
        if (entry) {
          entry.applications.push(app)
        }
      } else {
        individual.push(app)
      }
    })

    const result = Object.values(teamMap).sort((a, b) => a.teamName.localeCompare(b.teamName))
    if (individual.length > 0) {
      result.push({ teamName: 'Individual Applicants (No Team)', applications: individual })
    }
    return result
  }, [filteredApps, groupByTeams])

  if (!isReady) {
    return (
      <View style={[styles.container]} />
    )
  }

  // Security Gate
  if (permissionsLoading) {
    return (
      <View style={[styles.centerContainer]}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  if (!hasPermission('applications', 'view_others')) {
    return (
      <View style={[styles.centerContainer]}>
        <View style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You do not have administrative permissions to review application documents.
          </Text>
          <PillButton
            title="Return Home"
            onPress={() => navigateTo('/home')}
            additionalStyle={{ width: 200, height: 50, marginTop: 10 }}
          />
        </View>
      </View>
    )
  }

  const renderStatusBadge = (status: string) => {
    let bgColor = 'rgba(255,255,255,0.08)'
    let textColor = '#e1e1e1'
    let label = status.toUpperCase()

    if (status === 'accepted') {
      bgColor = 'rgba(16, 185, 129, 0.15)'
      textColor = '#10b981'
      label = 'ACCEPTED'
    } else if (status === 'rejected') {
      bgColor = 'rgba(239, 68, 68, 0.15)'
      textColor = '#ef4444'
      label = 'REJECTED'
    } else if (status === 'changes_requested') {
      bgColor = 'rgba(245, 158, 11, 0.15)'
      textColor = '#f59e0b'
      label = 'CHANGES REQ'
    } else if (status === 'submitted') {
      bgColor = 'rgba(59, 130, 246, 0.15)'
      textColor = '#3b82f6'
      label = 'SUBMITTED'
    } else if (status === 'draft') {
      bgColor = 'rgba(156, 163, 175, 0.15)'
      textColor = '#9ca3af'
      label = 'DRAFT'
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
      </View>
    )
  }

  const renderApplicationRow = (app: Application) => {
    const firstName = app.profiles?.first_name || app.answers?.firstName || 'Unknown'
    const lastName = app.profiles?.last_name || app.answers?.lastName || 'Applicant'
    const fullName = `${firstName} ${lastName}`
    const email = app.answers?.email || 'No email'
    const country = app.answers?.country || 'N/A'
    const university = app.answers?.university || 'N/A'
    const roleType = app.application_type_id || 'hacker'

    return (
      <View key={app.id} style={styles.appCard}>
        <Pressable onPress={() => navigateTo(`/users/${app.user_id}?appId=${app.id}`)} style={styles.appHeaderRow}>
          <View style={styles.headerMainInfo}>
            <Text style={styles.applicantName}>{fullName}</Text>
            <Text style={styles.applicantEmail}>{email}</Text>
          </View>
          <View style={styles.headerSubInfo}>
            <View style={styles.tagRow}>
              <View style={[styles.typeBadge, { borderColor: roleType === 'hacker' ? '#c2b75f' : '#b284be' }]}>
                <Text style={[styles.typeBadgeText, { color: roleType === 'hacker' ? '#c2b75f' : '#b284be' }]}>
                  {roleType.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.countryTag}>{country}</Text>
            </View>
            <Text style={styles.universityText} numberOfLines={1}>{university}</Text>
          </View>
          <View style={styles.headerStatusInfo}>
            {renderStatusBadge(app.status)}
            <Text style={styles.expandIndicator}>➔</Text>
          </View>
        </Pressable>
      </View>
    )
  }

  if (permissionsLoading) {
    return (
      <View style={{flex: 1, height: screenHeight || '100%', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  if (!hasViewOthersPermission) {
    return (
      <>
        <View style={{flex: 1, minHeight: 600, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch', padding: 20 }}>
          <View style={{
            backgroundColor: '#27082a',
            padding: 32,
            borderRadius: 16,
            alignItems: 'center',
            maxWidth: 480,
            width: '100%',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ff6b6b', marginBottom: 12 }}>Access Denied</Text>
            <Text style={{ fontSize: 15, color: '#9ca3af', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              You do not have administrative privileges to access this dashboard.
            </Text>
            <PillButton
              title="Return Home"
              onPress={() => navigateTo('/home')}
              additionalStyle={{ width: 200, height: 50 }}
            />
          </View>
        </View>
      </>
    )
  }

  return (
    <>
        <View style={styles.contentWrapper}>
          {Platform.OS === 'web' ? (
            <View style={styles.headerTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Application Review Portal</Text>
                <Text style={styles.subtitle}>Review, filter, and manage attendee applications.</Text>
              </View>
              <PillButton
                title="↻ Refresh"
                onPress={fetchApplications}
                isLoading={loading}
                additionalStyle={styles.refreshBtn}
              />
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 12 }}>
              <PillButton
                title="↻ Refresh"
                onPress={fetchApplications}
                isLoading={loading}
                additionalStyle={{ width: 100, height: 36 }}
              />
            </View>
          )}

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statCount}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statCount, { color: '#3b82f6' }]}>{stats.submitted}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statCount, { color: '#10b981' }]}>{stats.accepted}</Text>
              <Text style={styles.statLabel}>Accepted</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statCount, { color: '#f59e0b' }]}>{stats.changes}</Text>
              <Text style={styles.statLabel}>Changes Req</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statCount, { color: '#ef4444' }]}>{stats.rejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>

          {/* Filter Toolbar */}
          <View style={styles.toolbarCard}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, university, or city..."
                placeholderTextColor="rgba(34, 0, 44, 0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <TextInput
                style={[styles.searchInput, { flex: 1.5, minWidth: 200 }]}
                placeholder="Exclude (e.g. city:Mexico City or university:Tec)..."
                placeholderTextColor="rgba(34, 0, 44, 0.4)"
                value={excludeInput}
                onChangeText={(text) => {
                  if (text.endsWith(',')) {
                    addExcludeTag(text)
                  } else {
                    setExcludeInput(text)
                  }
                }}
                onSubmitEditing={() => addExcludeTag(excludeInput)}
              />

              <View style={styles.dropdownContainer}>
                <Pressable
                  onPress={() => setSelectedType(selectedType === 'all' ? 'hacker' : selectedType === 'hacker' ? 'judge' : selectedType === 'judge' ? 'sponsor' : 'all')}
                  style={styles.dropdownBtn}
                >
                  <Text style={styles.dropdownBtnText}>
                    Type: {selectedType.toUpperCase()}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.dropdownContainer}>
                <Pressable
                  onPress={() => {
                    const statuses = ['all', 'submitted', 'changes_requested', 'accepted', 'rejected', 'confirmed', 'draft']
                    const nextIdx = (statuses.indexOf(selectedStatus) + 1) % statuses.length
                    setSelectedStatus(statuses[nextIdx] || 'all')
                  }}
                  style={styles.dropdownBtn}
                >
                  <Text style={styles.dropdownBtnText}>
                    Status: {selectedStatus.toUpperCase().replace('_', ' ')}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setGroupByTeams(!groupByTeams)}
                style={[styles.groupToggleBtn, groupByTeams && styles.groupToggleBtnActive]}
              >
                <Text style={styles.groupToggleBtnText}>
                  {groupByTeams ? 'Grouped by Team' : 'Flat List'}
                </Text>
              </Pressable>
            </View>

            {excludeTags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, width: '100%' }}>
                {excludeTags.map(tag => (
                  <View
                    key={tag}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(194, 183, 95, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(194, 183, 95, 0.4)',
                      borderRadius: 8,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                    }}
                  >
                    <Text style={{ color: '#c2b75f', fontSize: 12, fontWeight: 'bold' }}>{tag}</Text>
                    <Pressable onPress={() => removeExcludeTag(tag)}>
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold', marginLeft: 8 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Country Multi-Select Filter */}
            {uniqueCountries.length > 0 && (
              <View style={styles.countriesFilterSection}>
                <Text style={styles.countriesFilterLabel}>Filter by Country:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countriesScroll}>
                  {uniqueCountries.map(country => {
                    const isSelected = selectedCountries.includes(country)
                    return (
                      <Pressable
                        key={country}
                        onPress={() => toggleCountry(country)}
                        style={[styles.countryChip, isSelected && styles.countryChipActive]}
                      >
                        <Text style={[styles.countryChipText, isSelected && styles.countryChipTextActive]}>
                          {country}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* Expand / Collapse All Controls */}
            {groupByTeams && (
              <View style={styles.expandAllRow}>
                <Pressable onPress={expandAllTeams} style={styles.smallActionBtn}>
                  <Text style={styles.smallActionBtnText}>Expand All Teams</Text>
                </Pressable>
                <Pressable onPress={collapseAllTeams} style={styles.smallActionBtn}>
                  <Text style={styles.smallActionBtnText}>Collapse All Teams</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Main Applications Section */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#c2b75f" />
              <Text style={styles.loadingText}>Fetching applications from Supabase...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No applications found matching the selected filters.</Text>
            </View>
          ) : groupByTeams ? (
            // Group by Team View (Collapsible)
            <View style={{ width: '100%', gap: 20 }}>
              {groupedData.map((group, groupIdx) => {
                const isTeamExpanded = !!expandedTeams[group.teamName]
                return (
                  <View key={groupIdx} style={styles.teamSection}>
                    <Pressable
                      onPress={() => toggleTeamExpand(group.teamName)}
                      style={styles.teamHeaderRow}
                    >
                      <Text style={styles.teamSectionTitle}>
                        {isTeamExpanded ? '▼ ' : '▶ '}{group.teamName}
                      </Text>
                      <View style={styles.teamCountBadge}>
                        <Text style={styles.teamCountBadgeText}>
                          {group.applications.length} {group.applications.length === 1 ? 'Applicant' : 'Applicants'}
                        </Text>
                      </View>
                    </Pressable>
                    {isTeamExpanded && (
                      <View style={styles.teamAppsContainer}>
                        {group.applications.map(renderApplicationRow)}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          ) : (
            // Flat List View
            <View style={{ width: '100%', gap: 12 }}>
              {filteredApps.map(renderApplicationRow)}
            </View>
          )}
        </View>
    </>
  )
}

// Sandbox local mock fallback
const mockApplications: Application[] = [
  {
    id: 'mock-1',
    status: 'submitted',
    admin_feedback: null,
    application_type_id: 'hacker',
    answers: {
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan@turing.org',
      country: 'United Kingdom',
      university: 'University of Cambridge',
      major: 'Mathematics',
      year: '2026',
      tshirt: 'M',
      diet: 'Vegan',
      github: 'github.com/turing',
      linkedin: 'linkedin.com/in/turing',
    },
    user_id: 'user-turing',
    profiles: {
      id: 'user-turing',
      first_name: 'Alan',
      last_name: 'Turing',
      email: 'alan@turing.org',
      team_id: 'team-enigma',
      teams: {
        id: 'team-enigma',
        name: 'Enigma Busters'
      }
    }
  },
  {
    id: 'mock-2',
    status: 'submitted',
    admin_feedback: null,
    application_type_id: 'hacker',
    answers: {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@hopper.edu',
      country: 'United States',
      university: 'Yale University',
      major: 'Computer Science',
      year: '2027',
      tshirt: 'S',
      diet: 'None',
      github: 'github.com/hopper',
    },
    user_id: 'user-hopper',
    profiles: {
      id: 'user-hopper',
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@hopper.edu',
      team_id: 'team-enigma',
      teams: {
        id: 'team-enigma',
        name: 'Enigma Busters'
      }
    }
  },
  {
    id: 'mock-3',
    status: 'changes_requested',
    admin_feedback: 'Resume PDF link is broken, please re-upload.',
    application_type_id: 'hacker',
    answers: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@lovelace.com',
      country: 'United Kingdom',
      university: 'University of London',
      major: 'Analytical Systems',
      year: '2025',
      tshirt: 'S',
      diet: 'Gluten-Free',
    },
    user_id: 'user-ada',
    profiles: {
      id: 'user-ada',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@lovelace.com',
      team_id: null,
      teams: null
    }
  }
]

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 40,
    alignItems: 'center',
    maxWidth: 450,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  accessDeniedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    color: '#22002c',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  accessDeniedSubtitle: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contentWrapper: {
    width: '90%',
    maxWidth: 1200,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
    marginBottom: 24,
    justifyContent: 'center',
  },
  statBox: {
    flex: 1,
    minWidth: 140,
    maxWidth: 220,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  statCount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#22002c',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolbarCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 16,
    marginBottom: 24,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  searchInput: {
    flex: 2,
    minWidth: 260,
    height: 48,
    backgroundColor: '#fdfbfe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    paddingHorizontal: 16,
    color: '#22002c',
    fontSize: 14,
  },
  dropdownContainer: {
    minWidth: 140,
  },
  dropdownBtn: {
    height: 48,
    backgroundColor: '#fdfbfe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dropdownBtnText: {
    color: '#22002c',
    fontSize: 13,
    fontWeight: '700',
  },
  groupToggleBtn: {
    height: 48,
    backgroundColor: '#fdfbfe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  groupToggleBtnActive: {
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    borderColor: '#5a0061',
  },
  groupToggleBtnText: {
    color: '#22002c',
    fontSize: 13,
    fontWeight: '700',
  },
  expandAllRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingTop: 4,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(90, 0, 97, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.1)',
  },
  smallActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a0061',
  },
  countriesFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 0, 97, 0.08)',
    paddingTop: 12,
  },
  countriesFilterLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  countriesScroll: {
    flex: 1,
  },
  countryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.1)',
    marginRight: 8,
  },
  countryChipActive: {
    backgroundColor: '#c2b75f',
    borderColor: '#c2b75f',
  },
  countryChipText: {
    color: '#5b4d61',
    fontSize: 12,
    fontWeight: '600',
  },
  countryChipTextActive: {
    color: '#22002c',
  },
  loadingContainer: {
    marginVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
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
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  teamSection: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 20,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(90, 0, 97, 0.08)',
    paddingBottom: 12,
  },
  teamSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22002c',
  },
  teamCountBadge: {
    backgroundColor: 'rgba(90, 0, 97, 0.06)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  teamCountBadgeText: {
    color: '#5a0061',
    fontSize: 12,
    fontWeight: '700',
  },
  teamAppsContainer: {
    gap: 12,
    marginTop: 12,
  },
  appCard: {
    width: '100%',
    backgroundColor: '#fdfbfe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.08)',
    overflow: 'hidden',
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerMainInfo: {
    flex: 2,
    minWidth: 200,
    gap: 2,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22002c',
  },
  applicantEmail: {
    fontSize: 13,
    color: '#666666',
  },
  headerSubInfo: {
    flex: 2,
    minWidth: 200,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countryTag: {
    fontSize: 13,
    color: '#5b4d61',
    fontWeight: '600',
  },
  universityText: {
    fontSize: 12,
    color: '#888888',
  },
  headerStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandIndicator: {
    fontSize: 12,
    color: 'rgba(90, 0, 97, 0.4)',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expandedDetails: {
    padding: 16,
    backgroundColor: '#fbf9fc',
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 0, 97, 0.06)',
    gap: 12,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  detailsCol: {
    flex: 1,
    minWidth: 260,
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(90, 0, 97, 0.5)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#22002c',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#5a0061',
    fontWeight: '700',
    marginBottom: 8,
  },
  feedbackBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  feedbackTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    maxWidth: 160,
    height: 40,
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.06)',
    marginVertical: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22002c',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#22002c',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.2)',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
  },
  headerTitleRow: {
    ...Platform.select({
      web: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      default: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
      }
    }),
    width: '100%',
    marginBottom: 20,
  },
  refreshBtn: {
    width: 120,
    height: 40,
  },
})
