import React from 'react'
import { Platform, Pressable } from 'react-native'

// Native: sets the navigation header right button using expo-symbols.
// Kept as dynamic require() to exactly match the original behaviour.
export function useAnnouncementsNavHeader(
  navigation: any,
  canCreate: boolean,
  onCreatePress: () => void
): void {
  React.useLayoutEffect(() => {
    if (!navigation || typeof navigation.setOptions !== 'function') return

    if (canCreate) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SymbolView } = require('expo-symbols') as { SymbolView: any }
      const isIOS = Platform.OS === 'ios'

      navigation.setOptions({
        headerRight: () => {
          if (isIOS) {
            return (
              <Pressable
                onPress={onCreatePress}
                style={({ pressed }: { pressed: boolean }) => ({
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  justifyContent: 'center' as const,
                  alignItems: 'center' as const,
                })}
              >
                <SymbolView name="square.and.pencil" tintColor="#FFFFFF" />
              </Pressable>
            )
          }

          // Android
          return (
            <Pressable
              onPress={onCreatePress}
              style={({ pressed }: { pressed: boolean }) => ({
                opacity: pressed ? 0.6 : 1,
                padding: 8,
                marginRight: 0,
                justifyContent: 'center' as const,
                alignItems: 'center' as const,
              })}
            >
              <SymbolView name="edit" size={24} tintColor="#5a0061" />
            </Pressable>
          )
        },
      })
    } else {
      navigation.setOptions({ headerRight: undefined })
    }
  }, [navigation, canCreate, onCreatePress])
}
