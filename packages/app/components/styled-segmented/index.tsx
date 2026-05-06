import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, TextStyle, ViewStyle, Animated } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type SegmentedOption = {
  label: string
  value: string
}

type StyledSegmentedProps = {
  label: string
  value?: string
  options: SegmentedOption[]
  error?: string
  subtitle?: string
  onValueChange: (value: string) => void
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export function StyledSegmented({
  label,
  value,
  options,
  error,
  subtitle,
  onValueChange,
  additionalStyle = {},
}: StyledSegmentedProps) {
  const hasSelection = value != null && value !== '' && options.some((option) => option.value === value)

  const selectedIndex = useMemo(() => {
    if (!value) return 0
    const found = options.findIndex((option) => option.value === value)
    return found >= 0 ? found : 0
  }, [options, value])

  const [wrapperWidth, setWrapperWidth] = useState(0)
  const indicatorX = useRef(new Animated.Value(0)).current
  const segmentWidth = wrapperWidth > 0 && options.length > 0 ? wrapperWidth / options.length : 0

  useEffect(() => {
    if (!segmentWidth || !hasSelection) return

    Animated.spring(indicatorX, {
      toValue: selectedIndex * segmentWidth,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
      mass: 0.7,
    }).start()
  }, [hasSelection, indicatorX, segmentWidth, selectedIndex])

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}</Text>
      <View
        style={[styles.segmentedWrapper, additionalStyle, error && formFieldStyles.errorInput]}
        onLayout={(event) => setWrapperWidth(event.nativeEvent.layout.width)}
      >
        {hasSelection && segmentWidth > 0 && (
          <Animated.View
            pointerEvents='none'
            style={[
              styles.selectionIndicator,
              {
                width: segmentWidth,
                transform: [{translateX: indicatorX}],
              },
            ]}
          />
        )}
        {options.map((option) => {
          const isActive = option.value === value

          return (
            <Pressable
              key={option.value}
              style={styles.segmentItem}
              onPress={() => onValueChange(option.value)}
            >
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  segmentedWrapper: {
    minHeight: 50,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: formFieldColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: formFieldColors.theme
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingVertical: 12,
  },
  segmentLabel: {
    color: formFieldColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: formFieldColors.titleText,
    fontWeight: '600',
  },
})
