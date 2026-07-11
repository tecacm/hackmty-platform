import React from 'react'
import { Platform } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';



import { LoginScreen } from 'app/features/login/login-screen'
import { RegisterScreen } from 'app/features/login/register-screen'
import { ForgotPasswordScreen } from 'app/features/login/forgot-password-screen'
import { ResetPasswordScreen } from 'app/features/login/reset-password-screen'
import { UserDetailScreen } from 'app/features/user/detail-screen'
import { HomeScreen } from 'app/features/home/home-screen'  
import { ProfileScreen } from 'app/features/profile/profile-screen'
import { ApplicationScreen } from 'app/features/home/application-screen'
import { formFieldColors } from 'app/components/form-field-styles'

type StackParamList = {
  login: undefined
  register: undefined
  'forgot-password': undefined
  'reset-password': undefined
  tabs: undefined
  application: { role?: string }
  'user-detail': { id: string }
}

type TabParamList = {
  home: undefined
  profile: undefined
}

const Stack = createNativeStackNavigator<StackParamList>()
const Tab = createBottomTabNavigator<TabParamList>() // Using the unstable native navigator

function TabNavigator() {
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
          tabBarLabel: 'Applications',
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
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="login" component={LoginScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
      <Stack.Screen name="register" component={RegisterScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
      <Stack.Screen name="forgot-password" component={ForgotPasswordScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
      <Stack.Screen name="reset-password" component={ResetPasswordScreen} options={{ headerShown: true, headerTitle: '', headerTransparent: true, headerShadowVisible: false }} />
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
        }} 
      />
      <Stack.Screen name="user-detail" component={UserDetailScreen} options={{ title: 'User' }} />
    </Stack.Navigator>
  )
}