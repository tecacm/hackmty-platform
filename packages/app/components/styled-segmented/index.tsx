import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, TextStyle, ViewStyle, Animated } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type SegmentedOption = {
  label: string
  value: string
}

export type OtherInputProps = {
  placeholder?: string
  keyboardType?: 'default' | 'number-pad' | 'numeric' | 'email-address' | 'phone-pad'
  maxLength?: number
  numericOnly?: boolean
  pattern?: string
  validationMessage?: string
}

type StyledSegmentedProps = {
  label: string
  value?: string
  options: SegmentedOption[]
  error?: string
  subtitle?: React.ReactNode | string
  required?: boolean
  onValueChange: (value: string) => void
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
  otherInputProps?: OtherInputProps
}

export function StyledSegmented({
  label,
  value,
  options,
  error,
  subtitle,
  required = false,
  onValueChange,
  additionalStyle = {},
  otherInputProps,
}: StyledSegmentedProps) {
  const standardOptions = useMemo(() => options.filter(o => o.value !== 'other'), [options])
  const hasOtherOption = useMemo(() => options.some(o => o.value === 'other'), [options])

  const [otherMode, setOtherMode] = useState(false)

  const isStandardSelection = useMemo(() => {
    return value != null && value !== '' && standardOptions.some((o) => o.value === value)
  }, [standardOptions, value])

  const isOtherActive = useMemo(() => {
    if (!hasOtherOption) return false
    return otherMode || (!!value && !isStandardSelection)
  }, [hasOtherOption, isStandardSelection, otherMode, value])

  const hasSelection = isStandardSelection || isOtherActive

  const selectedIndex = useMemo(() => {
    if (isOtherActive) {
      const otherIdx = options.findIndex((o) => o.value === 'other')
      return otherIdx >= 0 ? otherIdx : 0
    }
    if (!value) return 0
    const found = options.findIndex((option) => option.value === value)
    return found >= 0 ? found : 0
  }, [options, value, isOtherActive])

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

  const handlePressOption = (optValue: string) => {
    if (optValue === 'other') {
      setOtherMode(true)
      onValueChange('') // Require user to type custom value
    } else {
      setOtherMode(false)
      onValueChange(optValue)
    }
  }

  const customPlaceholder = otherInputProps?.placeholder || 'Enter custom value...'
  const customKeyboardType = otherInputProps?.keyboardType || 'default'
  const customMaxLength = otherInputProps?.maxLength
  const isNumericOnly = otherInputProps?.numericOnly ?? false

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}{required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}</Text>
      <View
        style={[formFieldStyles.fieldShell, styles.segmentedWrapper, { paddingHorizontal: 0 }, additionalStyle, error && formFieldStyles.errorInput]}
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
          const isActive = option.value === 'other'
            ? isOtherActive
            : option.value === value && !isOtherActive

          return (
            <Pressable
              key={option.value}
              style={styles.segmentItem}
              onPress={() => handlePressOption(option.value)}
            >
              <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {isOtherActive && (
        <View style={{ marginTop: 10, width: '100%' }}>
          <TextInput
            style={[
              formFieldStyles.fieldShell,
              {
                height: 48,
                paddingHorizontal: 16,
                fontSize: 14,
                color: formFieldColors.inputText || '#22002c',
                backgroundColor: formFieldColors.surface || '#ffffff',
                borderWidth: 1,
                borderColor: error ? formFieldColors.error : formFieldColors.borderColor || '#cbd5e1',
                borderRadius: 14,
              },
              error && formFieldStyles.errorInput
            ]}
            placeholder={customPlaceholder}
            placeholderTextColor="#94a3b8"
            value={value || ''}
            keyboardType={customKeyboardType}
            maxLength={customMaxLength}
            onChangeText={(text) => {
              const cleaned = isNumericOnly ? text.replace(/[^0-9]/g, '') : text
              onValueChange(cleaned)
            }}
          />
        </View>
      )}

      {subtitle && (typeof subtitle === 'string' ? <Text style={formFieldStyles.helperText}>{subtitle}</Text> : subtitle)}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  segmentedWrapper: { 
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
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
    color: formFieldColors.selectedText,
    fontWeight: '600',
  },
})
