import { useState, useEffect } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Platform, View, ActivityIndicator, useWindowDimensions } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { SolitoImage } from 'solito/image'
import numbersbg from 'app/assets/images/numbers-bg.webp'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'

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

import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'

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
  admin: undefined
}

const Stack = createNativeStackNavigator<StackParamList>()
const Tab = createBottomTabNavigator<TabParamList>() // Using the unstable native navigator

const AdminStack = createNativeStackNavigator()

function NumbersBackground({ children }: { children: ReactNode }) {
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()
  const { width } = useWindowDimensions()

  return (
    <ParallaxScrollView
      background={(
        <SolitoImage
          {...({
            src: numbersbg,
            width: width > 0 ? width : 1920,
            height: 1080,
            contentFit: 'cover',
            resizeMode: 'cover',
            transition: 0,
            alt: 'Abstract numbers background',
          } as any)}
        />
      )}
      style={{ backgroundColor: '#5a0061cc' }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 16,
        paddingTop: Platform.OS === 'web' ? 104 : Math.max(headerHeight, insets.top) + 16,
        paddingBottom: insets.bottom + 40,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        overflow: 'visible',
        width: '100%',
      }}
    >
      {children}
    </ParallaxScrollView>
  )
}

function withNumbersBackground<P extends object>(ScreenComponent: ComponentType<P>) {
  function ScreenWithNumbersBackground(props: P) {
    return (
      <NumbersBackground>
        <ScreenComponent {...props} />
      </NumbersBackground>
    )
  }

  ScreenWithNumbersBackground.displayName = `withNumbersBackground(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`

  return ScreenWithNumbersBackground
}

const HomeScreenWithBackground = withNumbersBackground(HomeScreen)
const ProfileScreenWithBackground = withNumbersBackground(ProfileScreen)
const TeamsScreenWithBackground = withNumbersBackground(TeamsScreen)
const ApplicationScreenWithBackground = withNumbersBackground(ApplicationScreen)
const UserDetailScreenWithBackground = withNumbersBackground(UserDetailScreen)
const AdminDashboardScreenWithBackground = withNumbersBackground(AdminDashboardScreen)
function AdminTabNavigator() {
  return (
    <AdminStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <AdminStack.Screen
        name="admin-dashboard"
        component={AdminDashboardScreenWithBackground}
        options={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: true,
          headerTitle: 'Review Portal',
          headerTransparent: Platform.OS === 'ios',
          headerStyle: Platform.OS !== 'ios' ? { backgroundColor: '#1d041f' } : undefined,
          headerTintColor: '#FFFFFF',
        }}
      />
    </AdminStack.Navigator>
  )
}

function TabNavigator() {
  const { hasPermission } = useUserPermissions()
  const showApplicationTab = hasPermission('applications', 'view')

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
      {showApplicationTab && (
        <Tab.Screen
          name="home"
          component={HomeScreenWithBackground}
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
      )}
      {hasPermission('teams', 'create') && (
        <Tab.Screen
          name="teams"
          component={TeamsScreenWithBackground}
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
        component={ProfileScreenWithBackground}
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
      {hasPermission('applications', 'view_others') && (
        <Tab.Screen
          name="admin"
          component={AdminTabNavigator}
          options={{ 
            tabBarLabel: 'Review',
            tabBarIcon: Platform.select({
              ios: {
                type: 'sfSymbol',
                name: 'lock.shield.fill',
              },
              android: {
                type: 'materialSymbol',
                name: 'admin_panel_settings',
              },
            }) as any,
          }}
        />
      )}
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
            component={ApplicationScreenWithBackground} 
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
          <Stack.Screen name="user-detail" component={UserDetailScreenWithBackground} options={{ title: 'User' }} />
          <Stack.Screen 
            name="admin" 
            component={AdminDashboardScreenWithBackground}
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerLargeTitleEnabled: true,
              headerTitle: 'Review Portal',
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