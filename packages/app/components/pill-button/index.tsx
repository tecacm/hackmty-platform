import { Pressable, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { useState } from 'react'

interface PillButtonProps {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'danger' | 'secondary' | 'outline-primary' | 'outline-danger' | 'outline-secondary' | 'flat' | 'gradient'
  isLoading?: boolean
  disabled?: boolean
  additionalStyle?: any
  textStyle?: any
  fontSize?: number
}

export function PillButton({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  additionalStyle = {},
  textStyle = {},
  fontSize,
}: PillButtonProps) {
  const [hovered, setHovered] = useState(false)
  const isDisabled = disabled || isLoading

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
          styles.gradientButton,
          additionalStyle,
          {
            transform: [{ scale: pressed ? 0.97 : 1 }, { translateY: hovered ? -3 : 0 }],
            opacity: isDisabled ? 0.6 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.gradientText}>{title}</Text>
        )}
      </Pressable>
    )
  }

  let baseColor = '#4b1687'
  let pressedColor = '#6b1ac8'
  let textColor = 'white'
  let isOutline = false

  if (variant === 'danger') {
    baseColor = '#dc2626'
    pressedColor = '#ef4444'
    textColor = 'white'
  } else if (variant === 'secondary') {
    baseColor = '#c2b75f'
    pressedColor = '#d1c76e'
    textColor = '#22002c'
  } else if (variant === 'outline-primary') {
    baseColor = 'transparent'
    pressedColor = 'rgba(75, 22, 135, 0.1)'
    textColor = '#4b1687'
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

  let effectiveBgColor = baseColor
  let effectiveTextColor = textColor
  let effectiveBorderColor = isOutline
    ? (variant === 'outline-primary' ? '#4b1687' : variant === 'outline-danger' ? '#dc2626' : '#c2b75f')
    : undefined

  if (isDisabled) {
    if (isOutline) {
      effectiveBgColor = 'transparent'
      effectiveBorderColor = '#cbd5e1'
      effectiveTextColor = '#94a3b8'
    } else {
      effectiveBgColor = '#e2e8f0'
      effectiveTextColor = '#475569'
    }
  }

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        isOutline && {
          borderWidth: 1.5,
          borderColor: effectiveBorderColor,
          shadowOpacity: 0,
          elevation: 0,
        },
        additionalStyle,
        {
          transform: [{ scale: pressed && !isDisabled ? 0.96 : 1 }],
          backgroundColor: isDisabled ? effectiveBgColor : (pressed ? pressedColor : baseColor),
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={effectiveTextColor} />
      ) : (
        <Text style={[styles.text, { color: effectiveTextColor }, fontSize ? { fontSize } : null, textStyle]}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 16,
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
    }),
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gradientButton: {
    width: '100%',
    marginTop: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,217,176,.7)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a2a7a',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(165deg, oklch(0.56 0.17 300), oklch(0.4 0.16 300) 60%, oklch(0.36 0.15 300))',
        boxShadow:
          '0 10px 24px -6px oklch(0.4 0.16 300 / .65), inset 0 1.5px 0 rgba(255,255,255,.35), inset 0 -6px 10px -4px rgba(0,0,0,.25)',
        cursor: 'pointer',
        transition: 'transform .15s ease',
      } as any,
      native: {
        shadowColor: '#4a2a7a',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.65,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  gradientText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.75,
    textTransform: 'uppercase',
    fontFamily: 'Montserrat',
  },
})