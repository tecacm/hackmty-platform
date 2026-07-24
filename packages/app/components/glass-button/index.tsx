import React from 'react'
import { Pressable } from 'react-native'

interface GlassButtonProps {
  children: React.ReactNode
  onPress?: () => void
  style?: any
  glassEffectStyle?: 'clear' | 'regular'
  colorScheme?: 'light' | 'dark'
  tintColor?: string
  accessibilityRole?: any
  accessibilityLabel?: string
}

export function GlassButton({
  children,
  onPress,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
}: GlassButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        style,
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      {children}
    </Pressable>
  )
}
