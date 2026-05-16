import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { LoginScreen } from 'app/features/login/login-screen'
import { RegisterScreen } from 'app/features/login/register-screen'
import { UserDetailScreen } from 'app/features/user/detail-screen'
import { HomeScreen } from 'app/features/home/home-screen'  
import { ApplicationScreen } from 'app/features/home/application-screen'
import { Platform } from 'react-native'
import { formFieldColors } from 'app/components/form-field-styles'

const Stack = createNativeStackNavigator<{
  login: undefined
  register: undefined,
  home: undefined
  application: {
    role?: string
  }
  'user-detail': {
    id: string
  }
}>()

export function NativeNavigation() {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="login"
        component={LoginScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="home"
        component={HomeScreen}
        options={{          
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: false,
          headerTransparent: true,
          headerShadowVisible: false,
          title:'',
        }}
      />
      <Stack.Screen
        name="application"
        component={ApplicationScreen}
        options={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLargeTitleEnabled: true,
          headerTransparent: Platform.OS === 'ios',
          headerShadowVisible: true,
          headerTintColor: Platform.OS == 'ios' ? '#FFFFFF' : formFieldColors.theme,
        }}
      />
      <Stack.Screen
        name="user-detail"
        component={UserDetailScreen}
        options={{
          title: 'User',
        }}
      />
    </Stack.Navigator>
  )
}
