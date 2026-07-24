import React from 'react'
import { Platform, Pressable } from 'react-native'
import { AppIcon } from 'app/components/app-icon'
import { SymbolView } from 'expo-symbols'

export function useProfileNavHeader(
  navigation: any,
  isEditing: boolean,
  onToggleEdit: () => void
): void {
  React.useLayoutEffect(() => {
    if (!navigation || typeof navigation.setOptions !== 'function') return

    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={onToggleEdit}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Cancel editing profile' : 'Edit profile'}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }: { pressed: boolean }) => ({
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          {Platform.OS === 'ios' ? (
            <SymbolView name="pencil" tintColor="#FFFFFF" />
          ) : (
              <AppIcon
                name="pencil"
                color={'#5a0061'}
                size={22}
              />
          )}
        </Pressable>
      ),
    })
  }, [navigation, isEditing, onToggleEdit])
}
