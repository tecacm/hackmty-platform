import React from 'react'
import { Platform, Pressable, StyleSheet } from 'react-native'
import { GlassView } from 'expo-glass-effect'

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
  glassEffectStyle = 'clear',
  colorScheme = 'dark',
  tintColor,
  accessibilityRole = 'button',
  accessibilityLabel,
}: GlassButtonProps) {
  const flattenedStyle = StyleSheet.flatten(style) || {}

  const {
    borderRadius = 22,
    borderWidth,
    borderColor,
    outline,
    outlineColor,
    outlineWidth,
    padding,
    paddingHorizontal = 16,
    paddingVertical = 8,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    minHeight = 44,
    height,
    gap = 8,
    flexDirection = 'row',
    alignItems = 'center',
    justifyContent = 'center',
    backgroundColor,
    width,
    ...outerStyles
  } = flattenedStyle

  const outerContainerStyle = {
    borderRadius,
    overflow: 'hidden' as const,
    height: height || minHeight,
    width,
    ...outerStyles,
    ...(Platform.OS === 'ios'
      ? { borderWidth: 0, borderColor: undefined }
      : {
          borderWidth: borderWidth ?? 1,
          borderColor: borderColor || 'rgba(255, 255, 255, 0.25)',
          backgroundColor: backgroundColor || 'rgba(255, 255, 255, 0.15)',
        }),
  }

  const innerLayoutStyle = {
    flexDirection,
    alignItems,
    justifyContent,
    gap,
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    minHeight,
    height: height || minHeight,
  }

  return (
    <GlassView
      glassEffectStyle={glassEffectStyle}
      colorScheme={colorScheme}
      tintColor={tintColor}
      style={outerContainerStyle}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          innerLayoutStyle,
          pressed && { opacity: 0.75 },
        ]}
      >
        {children}
      </Pressable>
    </GlassView>
  )
}
