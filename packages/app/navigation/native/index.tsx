import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { HomeScreen } from 'app/features/home/screen'
import { UserDetailScreen } from 'app/features/user/detail-screen'

const Stack = createNativeStackNavigator<{
  home: undefined
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
        name="home"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown:false
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
