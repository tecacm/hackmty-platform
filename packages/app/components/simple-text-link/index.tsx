import { Pressable, Text, StyleSheet, Platform } from 'react-native'

export function SimpleTextLink({ text, onPress }) {
  return (
    <Pressable 
      onPress={onPress}
      // HitSlop increases the touch area without changing the layout
      hitSlop={12}
      style={({ pressed }) => [
        { opacity: pressed ? 0.6 : 1 },
        styles.linkWrapper
      ]}
    >
      <Text style={styles.linkText}>
        {text}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  linkWrapper: {
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    // Helps with the "modern" look
    letterSpacing: -0.2,
  }
})