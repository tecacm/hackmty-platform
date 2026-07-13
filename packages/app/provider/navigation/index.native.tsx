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
                  profile: 'profile',
                },
              },
              application: 'application',
              'user-detail': 'users/:id',
              'forgot-password': 'forgot-password',
              'reset-password': 'reset-password',
              'complete-signup': 'complete-signup',
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
