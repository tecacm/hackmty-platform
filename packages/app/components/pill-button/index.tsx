import { Pressable, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native'

interface PillButtonProps {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'danger' | 'secondary' | 'outline-primary' | 'outline-danger' | 'outline-secondary'
  isLoading?: boolean
  disabled?: boolean
  additionalStyle?: any
}

export function PillButton({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  additionalStyle = {},
}: PillButtonProps) {
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
          backgroundColor: isDisabled ? 'rgba(0, 0, 0, 0.05)' : (pressed ? pressedColor : baseColor),
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
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
    }),
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})