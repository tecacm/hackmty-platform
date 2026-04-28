import React from 'react'
import { View, Text, StyleSheet, Pressable, TextStyle, ViewStyle } from 'react-native'
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
  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}</Text>
      <View style={[styles.segmentedWrapper, additionalStyle, error && formFieldStyles.errorInput]}>
        {options.map((option) => {
          const isActive = option.value === value

          return (
            <Pressable
              key={option.value}
              style={[styles.segmentItem, isActive && styles.segmentItemActive]}
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
    flexDirection: 'row',
    backgroundColor: formFieldColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  segmentItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.47)',
  },
  segmentLabel: {
    color: formFieldColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: formFieldColors.text,
    fontWeight: '600',
  },
})
