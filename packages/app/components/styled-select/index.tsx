import type { CSSProperties } from 'react'
import { View, Text, TextStyle, ViewStyle } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

export type SelectOption = { label: string; value: string }

type StyledSelectProps = {
  label: string
  value?: string
  error?: string
  placeholder?: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  subtitle?: string
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, error, additionalStyle }: StyledSelectProps) {
  const selectedValue = value ?? ''
  const combinedStyle = [formFieldStyles.fieldShell, additionalStyle, error && formFieldStyles.errorInput]
  const isPlaceholderActive = selectedValue === ''
  const selectorStyle: CSSProperties = {
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
    color: isPlaceholderActive ? formFieldColors.muted : formFieldColors.text,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    appearance: 'none', // Remove default dropdown arrow
    WebkitAppearance: 'none', // For Safari
    MozAppearance: 'none', // For Firefox
  }

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}</Text>
      <View style={combinedStyle}>
        <select
          aria-label={label}
          title={label}
          value={selectedValue}
          style={selectorStyle}
          onChange={(e) => onValueChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </View>
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}