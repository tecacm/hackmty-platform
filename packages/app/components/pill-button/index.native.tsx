import { GlassView } from 'expo-glass-effect'
import React from 'react'
import { Pressable, Text, StyleSheet, Platform, ActivityIndicator, View } from 'react-native'

interface PillButtonProps {
  title?: string
  children?: React.ReactNode
  onPress?: () => void
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'outline-primary' | 'outline-success' | 'outline-danger' | 'outline-secondary'
  isLoading?: boolean
  disabled?: boolean
  additionalStyle?: any
}

export function PillButton({
  title,
  children,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  additionalStyle = {},
}: PillButtonProps) {
  let baseColor = '#4b1687'
  let pressedColor = '#520f9f'
  let textColor = 'white'
  let isOutline = false

  if (variant === 'success') {
    baseColor = '#16a34a'
    pressedColor = '#15803d'
    textColor = 'white'
  } else if (variant === 'danger') {
    baseColor = '#dc2626'
    pressedColor = '#b91c1c'
    textColor = 'white'
  } else if (variant === 'secondary') {
    baseColor = '#c2b75f'
    pressedColor = '#a89f4f'
    textColor = '#22002c'
  } else if (variant === 'outline-primary') {
    baseColor = 'transparent'
    pressedColor = 'rgba(75, 22, 135, 0.1)'
    textColor = '#4b1687'
    isOutline = true
  } else if (variant === 'outline-success') {
    baseColor = 'transparent'
    pressedColor = 'rgba(22, 163, 74, 0.1)'
    textColor = '#16a34a'
    isOutline = true
  } else if (variant === 'outline-danger') {
    baseColor = 'transparent'
    pressedColor = 'rgba(220, 38, 38, 0.1)'
    textColor = '#dc2626'
    isOutline = true
  } else if (variant === 'outline-secondary') {
    baseColor = 'transparent'
    pressedColor = 'rgba(194, 183, 95, 0.1)'
    textColor = '#c2b75f'
    isOutline = true
  }

  const customBg = additionalStyle?.backgroundColor
  const activeBaseColor = customBg || baseColor

  const isDisabled = disabled || isLoading

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        isOutline && {
          borderWidth: 1.5,
          borderColor: variant === 'outline-primary' ? '#4b1687' : (variant === 'outline-danger' ? '#dc2626' : '#c2b75f'),
          shadowOpacity: 0,
          elevation: 0,
        },
        additionalStyle,
        {
          transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
          ...Platform.select({
            android: {
              backgroundColor: isDisabled ? 'rgba(0, 0, 0, 0.05)' : (pressed ? pressedColor : activeBaseColor),
            },
          }),
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
    >
      {({ pressed }) => (
        isOutline ? (
          <View style={[styles.glassContainer, { backgroundColor: pressed ? pressedColor : activeBaseColor }]}>
            {isLoading ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : children ? (
              typeof children === 'string' || typeof children === 'number' ? (
                <Text style={[styles.text, { color: textColor }]}>{children}</Text>
              ) : (
                children
              )
            ) : (
              <Text style={[styles.text, { color: textColor }]}>{title}</Text>
            )}
          </View>
        ) : (
          <GlassView
            isInteractive={!isDisabled}
            style={[styles.glassContainer, additionalStyle?.paddingHorizontal && { paddingHorizontal: additionalStyle.paddingHorizontal }]}
            colorScheme='dark'
            tintColor={isDisabled ? 'rgba(0,0,0,0.2)' : (pressed ? pressedColor : activeBaseColor)}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : children ? (
              typeof children === 'string' || typeof children === 'number' ? (
                <Text style={[styles.text, { color: textColor }]}>{children}</Text>
              ) : (
                children
              )
            ) : (
              <Text style={[styles.text, { color: textColor }]}>{title}</Text>
            )}
          </GlassView>
        )
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
  glassContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})