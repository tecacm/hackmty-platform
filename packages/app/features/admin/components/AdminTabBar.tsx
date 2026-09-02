import * as React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'app/i18n'
import { useUserPermissions } from 'app/hooks/use-user-permissions'

export type AdminTabType = 'applications' | 'users' | 'insights' | 'badges' | 'tournament' | 'tracks' | 'teams' | 'roles' | 'forms' | 'checkin' | 'config' | 'bot'

type AdminPermAction = 'view' | 'modify' | 'create' | 'view_others' | 'review'
// Single source of truth: the permission each admin tab requires. Shared with the dashboard
// for the access gate and tab guard.
export const ADMIN_TAB_PERMISSIONS: Record<AdminTabType, { feature: string; action: AdminPermAction }> = {
  checkin: { feature: 'checkin', action: 'view' },
  applications: { feature: 'applications', action: 'view_others' },
  users: { feature: 'applications', action: 'view_others' },
  insights: { feature: 'insights', action: 'view' },
  badges: { feature: 'badges', action: 'modify' },
  tournament: { feature: 'tournaments', action: 'view' },
  tracks: { feature: 'tracks', action: 'modify' },
  teams: { feature: 'teams', action: 'modify' },
  roles: { feature: 'roles', action: 'modify' },
  forms: { feature: 'forms', action: 'modify' },
  config: { feature: 'config', action: 'modify' },
  bot: { feature: 'bot', action: 'modify' },
}

interface AdminTabBarProps {
  adminTab: AdminTabType
  setAdminTab: (tab: AdminTabType) => void
  appsCount: number
  usersCount: number | string
  onTabChange?: (tab: AdminTabType) => void
}

export function AdminTabBar({
  adminTab,
  setAdminTab,
  appsCount,
  usersCount,
  onTabChange,
}: AdminTabBarProps) {
  const { t } = useTranslation()
  const { hasPermission } = useUserPermissions()

  const handleSelectTab = (tab: AdminTabType) => {
    setAdminTab(tab)
    if (onTabChange) onTabChange(tab)
  }

  const tabs: Array<{ id: AdminTabType; label: string; badge?: string | number }> = [
    { id: 'checkin', label: t('admin.checkInScanner') },
    { id: 'applications', label: t('admin.submissions'), badge: appsCount },
    { id: 'users', label: t('admin.userDirectory'), badge: usersCount },
    { id: 'insights', label: t('admin.insights') },
    { id: 'badges', label: t('admin.badges') },
    { id: 'tournament', label: t('admin.tournament') },
    { id: 'tracks', label: t('admin.tracks') },
    { id: 'teams', label: t('admin.teamsTab') },
    { id: 'roles', label: t('admin.rolesAccess') },
    { id: 'forms', label: t('admin.formBuilder') },
    { id: 'config', label: t('admin.globalConfig') },
    { id: 'bot', label: t('admin.botTab') },
  ]

  const visibleTabs = tabs.filter((tab) => {
    const perm = ADMIN_TAB_PERMISSIONS[tab.id]
    return hasPermission(perm.feature, perm.action)
  })

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%', flexWrap: 'wrap' }}>
      {visibleTabs.map((tab) => {
        const isActive = adminTab === tab.id
        return (
          <Pressable
            key={tab.id}
            onPress={() => handleSelectTab(tab.id)}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 11,
              borderRadius: 14,
              backgroundColor: isActive ? '#5a0061' : 'rgba(255, 255, 255, 0.08)',
              borderWidth: 1.5,
              borderColor: isActive ? '#c2b75f' : 'rgba(255, 255, 255, 0.15)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 }}>
              {tab.label}
            </Text>
            {tab.badge !== undefined && (
              <View
                style={{
                  backgroundColor: isActive ? '#3d0042' : 'rgba(255, 255, 255, 0.15)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: isActive ? '#c2b75f' : '#ffffff', fontSize: 11, fontWeight: '800' }}>
                  {tab.badge}
                </Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
