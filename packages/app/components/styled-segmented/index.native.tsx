import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TextStyle, ViewStyle, TextInput, Platform } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'
import SegmentedControl from '@react-native-segmented-control/segmented-control'

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
  subtitle?: string
  required?: boolean
  disabled?: boolean
  editable?: boolean
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
  disabled,
  editable,
  onValueChange,
  additionalStyle = {},
  otherInputProps,
}: StyledSegmentedProps) {
  const isDisabled = disabled || editable === false
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

  const selectedIndex = useMemo(() => {
    if (isOtherActive) {
      const otherIdx = options.findIndex((o) => o.value === 'other')
      return otherIdx >= 0 ? otherIdx : 0
    }
    if (!value) return 0
    const found = options.findIndex((option) => option.value === value)
    return found >= 0 ? found : 0
  }, [options, value, isOtherActive])

  const handlePressSegment = (nextIndex: number) => {
    if (isDisabled) return
    const nextValue = options[nextIndex]?.value
    if (nextValue != null) {
      if (nextValue === 'other') {
        setOtherMode(true)
        onValueChange('') // Require user to type custom value
      } else {
        setOtherMode(false)
        onValueChange(nextValue)
      }
    }
  }

  const customPlaceholder = otherInputProps?.placeholder || 'Enter custom value...'
  const customKeyboardType = otherInputProps?.keyboardType || 'default'
  const customMaxLength = otherInputProps?.maxLength
  const isNumericOnly = otherInputProps?.numericOnly ?? false

  return (
      <View style={formFieldStyles.container}>
        <Text style={[formFieldStyles.label, additionalStyle]}>{label}{required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}</Text>
         <View style={[formFieldStyles.fieldShell, { backgroundColor: isDisabled ? '#e2e2e2' : 'transparent', paddingHorizontal: 0}, additionalStyle, error && formFieldStyles.errorInput]}>
          <SegmentedControl
            enabled={!isDisabled}
            backgroundColor={Platform.OS === 'ios' ? (isDisabled ? '#e2e2e2' : 'transparent') : (isDisabled ? '#e2e2e2' : formFieldColors.surface)}
            style={{height: '100%', zIndex:Platform.OS === 'ios' ? 0 : 1, borderRadius: 16, elevation: 0}}
            values={options.map((o) => o.label)}
            onChange={(event) => {
              handlePressSegment(event.nativeEvent.selectedSegmentIndex)
            }}
            tintColor={isDisabled ? '#c0c4cc' : formFieldColors.theme}
            fontStyle={isDisabled ? { ...styles.segmentLabel, color: '#a4a7ae' } : styles.segmentLabel}
            activeFontStyle={isDisabled ? { ...styles.segmentLabelActive, color: '#475569' } : styles.segmentLabelActive}
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
              width: 15,
              height: 15,

              elevation: 0,
              borderTopRightRadius: 26,
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

        {isOtherActive && (
          <View style={{ marginTop: 10, width: '100%' }}>
            <TextInput
              style={[
                formFieldStyles.fieldShell,
                {
                  height: 48,
                  paddingHorizontal: 16,
                  fontSize: 14,
                  color: formFieldColors.text || '#22002c',
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