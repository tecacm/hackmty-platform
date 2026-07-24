import React from 'react'
import { Platform, Pressable } from 'react-native'
import { AppIcon } from 'app/components/app-icon'
import { SymbolView } from 'expo-symbols'

export function useAnnouncementsNavHeader(
  navigation: any,
  canCreate: boolean,
  onCreatePress: () => void
): void {
  React.useLayoutEffect(() => {
    if (!navigation || typeof navigation.setOptions !== 'function') return

    if (canCreate) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            onPress={onCreatePress}
            accessibilityRole="button"
            accessibilityLabel="Post Announcement"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }: { pressed: boolean }) => ({
              justifyContent: 'center' as const,
              alignItems: 'center' as const,
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            {Platform.OS === 'ios' ? (
              <SymbolView name="square.and.pencil" tintColor="#FFFFFF" />
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
    } else {
      navigation.setOptions({ headerRight: undefined })
    }
  }, [navigation, canCreate, onCreatePress])
}
