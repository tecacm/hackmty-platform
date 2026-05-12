import React, { useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TextStyle, ViewStyle, Animated, Pressable, Platform } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'
import SegmentedControl from '@react-native-segmented-control/segmented-control'

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
  required?: boolean
  onValueChange: (value: string) => void
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
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
}: StyledSegmentedProps) {
  const hasSelection = value != null && value !== '' && options.some((option) => option.value === value)

  const selectedIndex = useMemo(() => {
    if (!value) return 0
    const found = options.findIndex((option) => option.value === value)
    return found >= 0 ? found : 0
  }, [options, value])

  return (
      <View style={formFieldStyles.container}>
        <Text style={[formFieldStyles.label, additionalStyle]}>{label}{required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}</Text>
         <View style={[formFieldStyles.fieldShell, { backgroundColor: 'transparent', paddingHorizontal: 0}, additionalStyle, error && formFieldStyles.errorInput]}>
          <SegmentedControl
            backgroundColor={Platform.OS === 'ios' ? 'transparent' : formFieldColors.surface}
            style={{height: '100%', zIndex:Platform.OS === 'ios' ? 0 : 1, borderRadius: 16, elevation: 0}}
            values={options.map((o) => o.label)}
            onChange={(event) => {
              const nextIndex = event.nativeEvent.selectedSegmentIndex
              const nextValue = options[nextIndex]?.value
              if (nextValue != null) onValueChange(nextValue)
            }}
            tintColor={formFieldColors.theme}
            fontStyle={styles.segmentLabel}
            activeFontStyle={styles.segmentLabelActive}
            appearance='light'
            selectedIndex={selectedIndex}
            sliderStyle={{borderRadius:46}}
          />
          <>
          {/* left edge cleanup */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 14,
              bottom: 14,
              width: 2,
              backgroundColor: formFieldColors.surface,
              elevation: 0
            }}
          />

          {/* right edge cleanup */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 0,
              top: 14,
              bottom: 14,
              width: 3,
              elevation: 0,
              backgroundColor: formFieldColors.surface,
            }}
          />

          {/* top-left */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 15,
              height: 15,
              
              elevation: 0,
              borderTopLeftRadius: 26,
              borderTopWidth: 4,
              borderLeftWidth: 4,
              borderColor: formFieldColors.surface,
            }}
          />

          {/* top-right */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 16,
              height: 15,

              elevation: 0,
              borderTopRightRadius: 20,
              borderTopWidth: 4,
              borderRightWidth: 4,
              borderColor: formFieldColors.surface,
            }}
          />

          {/* bottom-left */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 15.5,
              height: 14,

              elevation: 0,
              borderBottomLeftRadius: 14,
              borderBottomWidth: 4,
              borderLeftWidth: 4,
              borderColor: formFieldColors.surface,
            }}
          />

          {/* bottom-right */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 16,
              height: 14,

              elevation: 0,
              borderBottomRightRadius: 14,
              borderBottomWidth: 4,
              borderRightWidth: 4,
              borderColor: formFieldColors.surface,
            }}
          />
        </>
        </View>
        {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
        {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
      </View>
  )
}

const styles = StyleSheet.create({
  segmentedWrapper: {
    overflow: 'visible',
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  indicatorBase: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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