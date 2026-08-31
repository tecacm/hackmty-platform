import { NavigationContainer } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { useMemo } from 'react'

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavigationContainer
      linking={useMemo(
        () => ({
          prefixes: [Linking.createURL('/')],
          config: {
            initialRouteName: 'login',
            screens: {
              login: 'login',
              register: 'register',
              tabs: {
                path: '',
                screens: {
                  home: 'home',
                  announcements: 'announcements',
                  profile: 'profile',
                },
              },
              application: 'application',
              'create-announcement': 'announcements/create',
              'user-detail': 'users/:id',
              'forgot-password': 'forgot-password',
              'reset-password': 'reset-password',
              'complete-signup': 'complete-signup',
              admin: 'admin',
              qr: 'qr',
              leaderboard: 'leaderboard',
            },
          },
        }),
        []
      )}
    >
      {children}
    </NavigationContainer>
  )
}
