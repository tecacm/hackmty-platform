import * as React from 'react'
import { View, Text, Pressable } from 'react-native'

export type AdminTabType = 'applications' | 'users' | 'roles' | 'forms' | 'checkin' | 'config'

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
  const handleSelectTab = (tab: AdminTabType) => {
    setAdminTab(tab)
    if (onTabChange) onTabChange(tab)
  }

  const tabs: Array<{ id: AdminTabType; label: string; badge?: string | number }> = [
    { id: 'checkin', label: 'Check-In Scanner' },
    { id: 'applications', label: 'Submissions', badge: appsCount },
    { id: 'users', label: 'User Directory', badge: usersCount },
    { id: 'roles', label: 'Roles & Access' },
    { id: 'forms', label: 'Form Builder' },
    { id: 'config', label: 'Global Config' },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%', flexWrap: 'wrap' }}>
      {tabs.map((tab) => {
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
