import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native'
import SegmentedControl from '@react-native-segmented-control/segmented-control'
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
  const labels = useMemo(() => options.map((option) => option.label), [options])

  const selectedIndex = useMemo(() => {
    if (!value) return 0
    const found = options.findIndex((option) => option.value === value)
    return found >= 0 ? found : 0
  }, [options, value])

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}</Text>
      <View style={additionalStyle}>
        <View style={[styles.segmentedWrapper, error && formFieldStyles.errorInput]}>
          <SegmentedControl
            style={[{height: 40}]}
            values={labels}
            selectedIndex={selectedIndex}
            onChange={(event) => {
              const nextIndex = event.nativeEvent.selectedSegmentIndex
              const nextValue = options[nextIndex]?.value
              if (nextValue != null) onValueChange(nextValue)
            }}
            tintColor={formFieldColors.theme}
            backgroundColor={formFieldColors.surface}
            fontStyle={styles.segmentLabel}
            activeFontStyle={styles.segmentLabelActive}
            appearance='light'
            sliderStyle={{borderRadius: 23}}
          />
        </View>
      </View>
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  segmentedWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentLabel: {
    color: formFieldColors.muted,
    fontSize: 13,
  },
  segmentLabelActive: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
