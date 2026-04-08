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
          backgroundColor: pressed ? '#6b1ac8' : '#4b1687',
        },
      ]}
    >
      <Text style={styles.text}>{title}</Text>
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
    }),
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})