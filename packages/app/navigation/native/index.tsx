import { useState, useEffect } from 'react'
import { MaterialIcons } from '@expo/vector-icons'
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
import { RoleApplicationScreen } from 'app/features/role-application/role-application-screen'  
import { ProfileScreen } from 'app/features/profile/profile-screen'
import { ApplicationScreen } from 'app/features/role-application/application-screen'
import { TeamsScreen } from 'app/features/teams/teams-screen'
import { AdminDashboardScreen } from 'app/features/admin/dashboard-screen'
import { AnnouncementsScreen } from 'app/features/announcements/announcements-screen'
import { CreateAnnouncementScreen } from 'app/features/announcements/create-announcement-screen'
import { QRScreen } from 'app/features/qr/qr-screen'
import { LeaderboardScreen } from 'app/features/leaderboard/leaderboard-screen'
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
  home: undefined
  applications: undefined
  application: { role?: string }
  announcements: undefined
  'create-announcement': undefined
  'user-detail': { id: string }
  admin: undefined
  qr: undefined
  leaderboard: undefined
}

type TabParamList = {
  home: undefined
  applications: undefined
  teams: undefined
  profile: undefined
  admin: undefined
}

const Stack = createNativeStackNavigator<StackParamList>()
const Tab = createBottomTabNavigator<TabParamList>() // Using the native tab navigator

function NumbersBackground({ children }: { children: ReactNode }) {
  const insets = useSafeArea()
  const { width } = useWindowDimensions()
  const topOffset = insets.top - 20

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
        paddingTop: Platform.OS === 'web' ? 104 : topOffset,
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

const RoleApplicationScreenWithBackground = withNumbersBackground(RoleApplicationScreen)
const ProfileScreenWithBackground = withNumbersBackground(ProfileScreen)
const TeamsScreenWithBackground = withNumbersBackground(TeamsScreen)
const ApplicationScreenWithBackground = withNumbersBackground(ApplicationScreen)
const UserDetailScreenWithBackground = withNumbersBackground(UserDetailScreen)
const AdminDashboardScreenWithBackground = withNumbersBackground(AdminDashboardScreen)
const AnnouncementsScreenWithBackground = withNumbersBackground(AnnouncementsScreen)
const CreateAnnouncementScreenWithBackground = withNumbersBackground(CreateAnnouncementScreen)
const QRScreenWithBackground = withNumbersBackground(QRScreen)
const LeaderboardScreenWithBackground = withNumbersBackground(LeaderboardScreen)

const HomeStack = createNativeStackNavigator()
const ApplicationsStack = createNativeStackNavigator()
const ProfileStack = createNativeStackNavigator()
const AdminStack = createNativeStackNavigator()

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="announcements-feed"
        component={AnnouncementsScreenWithBackground}
        options={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: true,
          headerTitle: 'Announcements',
          headerTransparent: Platform.OS === 'ios',
          headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : formFieldColors.theme,
        }}
      />
    </HomeStack.Navigator>
  )
}

function ApplicationsNavigator() {
  return (
    <ApplicationsStack.Navigator>
      <ApplicationsStack.Screen
        name="applications-form"
        component={RoleApplicationScreenWithBackground}
        options={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: true,
          headerTitle: 'Role Application',
          headerTransparent: Platform.OS === 'ios',
          headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : formFieldColors.theme,
        }}
      />
      <ApplicationsStack.Screen
        name="application"
        component={ApplicationScreenWithBackground}
        options={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: true,
          headerTransparent: Platform.OS === 'ios',
          headerShadowVisible: true,
          headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : formFieldColors.theme,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </ApplicationsStack.Navigator>
  )
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="profile-main"
        component={ProfileScreenWithBackground}
        options={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: true,
          headerTitle: '',
          headerTransparent: Platform.OS === 'ios',
          headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : formFieldColors.theme,
        }}
      />
    </ProfileStack.Navigator>
  )
}

function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="dashboard" component={AdminDashboardScreenWithBackground} />
      <AdminStack.Screen name="user-detail" component={UserDetailScreenWithBackground} />
    </AdminStack.Navigator>
  )
}

function TabNavigator() {
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const canAccessDashboard =
    hasPermission('applications', 'view_others') || hasPermission('checkin', 'view')
  const showApplicationTab = hasPermission('applications', 'view')

  // Android has no SF Symbols and the native Material Symbol module isn't in Expo Go,
  // so instead of react-navigation's `materialSymbol` icon (which resolves to an
  // undefined image source here and blanks the tab / crashes the native tab bar), we
  // pre-render each icon to an image source via @expo/vector-icons and pass it as a
  // `type: 'image'` descriptor. iOS keeps native SF Symbols.
  const [androidIcons, setAndroidIcons] = useState<Record<string, any>>({})

  useEffect(() => {
    if (Platform.OS === 'ios') return
    let mounted = true
    const defs: Array<[string, string]> = [
      ['home', 'campaign'],
      ['applications', 'assignment'],
      ['teams', 'groups'],
      ['profile', 'person'],
      ['admin', 'admin-panel-settings'],
    ]
    Promise.all(
      defs.map(async ([key, icon]) => {
        try {
          const source = await (MaterialIcons as any).getImageSource(icon, 26, '#c2b75f')
          return [key, source] as const
        } catch {
          return [key, null] as const
        }
      })
    ).then((entries) => {
      if (!mounted) return
      const map: Record<string, any> = {}
      entries.forEach(([k, v]) => {
        if (v) map[k] = v
      })
      setAndroidIcons(map)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Valid `type: 'image'` descriptor once the icon image is ready, otherwise undefined
  // (no icon) — never the broken materialSymbol path.
  const androidTabIcon = (key: string) =>
    androidIcons[key] ? ({ type: 'image', source: androidIcons[key] } as any) : undefined

  // The tab set is derived from permissions. If we render the native tab bar before
  // permissions resolve, only the ungated (Profile) tab exists, then Feed/Admin/etc.
  // are ADDED after load — and react-native-screens' native Android tabs mishandle a
  // mutating tab set (selection jumps to index 0, newly-added tab screens render white
  // until a navigation event remounts them). iOS tolerates it. So wait for permissions
  // to load and mount the tab navigator once with its final, stable set of tabs.
  if (permissionsLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d041f' }}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: false,
        tabBarStyle: {
          backgroundColor: '#1d041f',
        },
        tabBarActiveTintColor: '#c2b75f',
        tabBarInactiveTintColor: '#a3a3a3',
        tabBarMinimizeBehavior: 'onScrollDown'      
      } as any}
    >
      {/* 1st Tab: Feed / Announcements */}
      {hasPermission('announcements', 'view') && (
        <Tab.Screen
          name="home"
          component={HomeNavigator}
          options={{ 
            headerShown: false,
            tabBarLabel: 'Feed',
            tabBarIcon: Platform.select({
              ios: {
                type: 'sfSymbol',
                name: 'megaphone.fill',
              },
              android: androidTabIcon('home'),
            }) as any,
          }}
        />
      )}

      {/* 2nd Tab: Application */}
      {showApplicationTab && (
        <Tab.Screen
          name="applications"
          component={ApplicationsNavigator}
          options={{ 
            tabBarLabel: 'Application',
            tabBarIcon: Platform.select({
              ios: {
                type: 'sfSymbol',
                name: 'doc.text',
              },
              android: androidTabIcon('applications'),
            }) as any,
          }}
        />
      )}

      {/* 3rd Tab: My Team */}
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
              android: androidTabIcon('teams'),
            }) as any,
          }}
        />
      )}

      {/* 4th Tab: Profile */}
      <Tab.Screen
        name="profile"
        component={ProfileNavigator}
        options={{ 
          headerShown: false,
          tabBarLabel: 'Profile',
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'person.fill',
            },
            android: androidTabIcon('profile'),
          }) as any,
        }}
      />

      {/* 5th Tab: Admin */}
      {canAccessDashboard && (
        <Tab.Screen
          name="admin"
          component={AdminDashboardScreenWithBackground}
          options={{ 
            tabBarLabel: 'Admin',
            tabBarIcon: Platform.select({
              ios: {
                type: 'sfSymbol',
                name: 'shield.fill',
              },
              android: androidTabIcon('admin'),
            }) as any,
          }}
        />
      )}
    </Tab.Navigator>
  )
}

export function NativeNavigation() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
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
              headerTransparent: Platform.OS === 'ios',
              headerShadowVisible: true,
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : formFieldColors.theme,
              headerBackButtonDisplayMode: 'minimal',
            }}
          />        
          <Stack.Screen 
            name="create-announcement" 
            component={CreateAnnouncementScreenWithBackground} 
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerTitle: 'New Announcement',
              headerTransparent: Platform.OS === 'ios',
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : '#5a0061',
              headerBackTitle: 'Cancel',
            }}
          />
          <Stack.Screen name="user-detail" 
          component={UserDetailScreenWithBackground} 
          options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerTitle: 'User',
              headerTransparent: Platform.OS === 'ios',
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : '#5a0061',
              headerBackButtonDisplayMode: 'minimal',
            }
            } 
          />
          <Stack.Screen 
            name="admin" 
            component={AdminDashboardScreenWithBackground}
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerTitle: 'Review Portal',
              headerTransparent: Platform.OS === 'ios',
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : '#5a0061',
              headerBackTitle: 'Home',
            }}
          />
          <Stack.Screen 
            name="qr" 
            component={QRScreenWithBackground}
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerTitle: 'Event Badge',
              headerTransparent: Platform.OS === 'ios',
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : '#5a0061',
              headerBackTitle: 'Profile',
            }}
          />
          <Stack.Screen
            name="leaderboard"
            component={LeaderboardScreenWithBackground}
            options={{
              headerTitleAlign: 'center',
              headerShown: true,
              headerTitle: 'Leaderboard',
              headerTransparent: Platform.OS === 'ios',
              headerTintColor: Platform.OS === 'ios' ? '#FFFFFF' : '#5a0061',
              headerBackButtonDisplayMode: 'minimal',
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