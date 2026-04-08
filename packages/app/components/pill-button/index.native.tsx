import { GlassView } from 'expo-glass-effect'
import { Pressable, Text, StyleSheet, Platform } from 'react-native'

export function PillButton({ title, onPress, additionalStyle={} }) {
  return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          additionalStyle,
          {
            // Shrinks slightly when pressed on mobile
            transform: [{ scale: pressed ? 0.96 : 1 }],
            ...Platform.select({
              android: {
                backgroundColor: pressed ? '#520f9f' : '#4b1687',
              },
            }),
          },
        ]}
      >
        {({ pressed }) => (
          <GlassView isInteractive style={[styles.glassContainer]} colorScheme='dark' tintColor={pressed ? '#520f9f' : '#4b1687'}>
            <Text style={styles.text}>{title}</Text>
          </GlassView>
        )}
      </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%', // Takes up the width of the 80% container
    height: 56,
    borderRadius: 28, // Half of height = Perfect Pill
    justifyContent: 'center',
    alignItems: 'center',
    // iOS Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    // Android Shadow
    elevation: 5,
    // Web Hover cursor
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
      ios: {
        backgroundColor: 'transparent',
      },
    }),
  },
  glassContainer:{
    width: '100%', // Takes up the width of the 80% container
    height: '100%',
    borderRadius: 28, // Half of height = Perfect Pill
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
})