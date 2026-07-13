import { useState, useEffect } from 'react'
import { Platform, View, ActivityIndicator } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'



import { LoginScreen } from 'app/features/login/login-screen'
import { RegisterScreen } from 'app/features/login/register-screen'
import { ForgotPasswordScreen } from 'app/features/login/forgot-password-screen'
import { ResetPasswordScreen } from 'app/features/login/reset-password-screen'
import { CompleteSignupScreen } from 'app/features/login/complete-signup-screen'
import { UserDetailScreen } from 'app/features/user/detail-screen'
import { HomeScreen } from 'app/features/home/home-screen'  
import { ProfileScreen } from 'app/features/profile/profile-screen'
import { ApplicationScreen } from 'app/features/home/application-screen'
import { TeamsScreen } from 'app/features/teams/teams-screen'
import { AdminDashboardScreen } from 'app/features/admin/dashboard-screen'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { formFieldColors } from 'app/components/form-field-styles'

type StackParamList = {
  login: undefined
  register: undefined
  'forgot-password': undefined
  'reset-password': undefined
  'complete-signup': undefined
  tabs: undefined
  application: { role?: string }
  'user-detail': { id: string }
  admin: undefined
}

type TabParamList = {
  home: undefined
  profile: undefined
  teams: undefined
}

const Stack = createNativeStackNavigator<StackParamList>()
const Tab = createBottomTabNavigator<TabParamList>() // Using the unstable native navigator

function TabNavigator() {
  const { hasPermission } = useUserPermissions()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1d041f',
        },
        tabBarActiveTintColor: '#c2b75f',
        tabBarInactiveTintColor: '#a3a3a3',
      }}
    >
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{ 
          tabBarLabel: 'Application',
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'doc.text',
            },
            android: {
              type: 'materialSymbol',
              name: 'assignment',
            },
          }) as any,
        }}
      />
      {hasPermission('teams', 'create') && (
        <Tab.Screen
          name="teams"
          component={TeamsScreen}
          options={{ 
            tabBarLabel: 'My Team',
            tabBarIcon: Platform.select({
              ios: {
                type: 'sfSymbol',
                name: 'person.3.fill',
              },
              android: {
                type: 'materialSymbol',
                name: 'groups',
              },
            }) as any,
          }}
        />
      )}
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'person.fill',
            },
            android: {
              type: 'materialSymbol',
              name: 'person',
            },
          }) as any,
        }}
      />
    </Tab.Navigator>
  )
}

export function NativeNavigation() {
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1d041f' }}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  const isAuthenticated = !isSupabaseConfigured || session !== null

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen 
            name="application" 
            component={ApplicationScreen} 
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerLargeTitleEnabled: true,
              headerTransparent: Platform.OS === 'ios',
              headerShadowVisible: true,
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : formFieldColors.theme,
              headerBackTitle: 'Application',
            }} 
          />
          <Stack.Screen name="user-detail" component={UserDetailScreen} options={{ title: 'User' }} />
          <Stack.Screen 
            name="admin" 
            component={AdminDashboardScreen} 
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerTitle: 'Admin Portal',
              headerTransparent: Platform.OS === 'ios',
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : '#5a0061',
              headerBackTitle: 'Home',
            }} 
          />
        </>
      ) : (
        <>
          <Stack.Screen name="login" component={LoginScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
          <Stack.Screen name="register" component={RegisterScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
          <Stack.Screen name="forgot-password" component={ForgotPasswordScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
          <Stack.Screen name="reset-password" component={ResetPasswordScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
          <Stack.Screen name="complete-signup" component={CompleteSignupScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
        </>
      )}
    </Stack.Navigator>
  )
}