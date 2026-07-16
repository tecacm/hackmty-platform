import { Pressable, Text, StyleSheet, Platform, TextStyle } from 'react-native'
import { useState } from 'react'

type SimpleTextLinkProps = {
  text: string
  onPress: () => void
  accentText?: string
  textStyle?: TextStyle
}

export function SimpleTextLink({ text, onPress, accentText, textStyle }: SimpleTextLinkProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <Pressable
      onPress={onPress}
      // HitSlop increases the touch area without changing the layout
      hitSlop={12}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        { opacity: pressed ? 0.6 : 1 },
        styles.linkWrapper,
        hovered && styles.linkWrapperHovered,
      ]}
    >
      <Text style={[styles.linkText, textStyle]}>
        {text}
        {accentText ? <Text style={styles.accentText}>{accentText}</Text> : null}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  linkWrapper: {
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform .15s ease' } as any,
    }),
  },
  linkWrapperHovered: {
    ...Platform.select({
      web: { transform: [{ translateY: -2 }] },
    }),
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    // Helps with the "modern" look
    letterSpacing: -0.2,
  },
  accentText: {
    color: '#f0d9b0',
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
})