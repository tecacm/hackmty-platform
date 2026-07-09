/* eslint-disable react-native/no-inline-styles */
import { useEffect, useMemo, type CSSProperties } from 'react'
import { View, Text, TextStyle, ViewStyle } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

export type SelectOption = { label: string; value: string }

type StyledSelectProps = {
  label: string
  value?: string
  error?: string
  placeholder?: string
  required?: boolean
  options: SelectOption[]
  onValueChange: (value: string) => void
  subtitle?: string
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, error, additionalStyle, required = false }: StyledSelectProps) {
  const normalizedPlaceholder = placeholder.trim().toLowerCase()
  const placeholderMatchedOption = useMemo(
    () => options.find((option) => option.value.trim().toLowerCase() === normalizedPlaceholder || option.label.trim().toLowerCase() === normalizedPlaceholder),
    [options, normalizedPlaceholder]
  )

  useEffect(() => {
    if ((value ?? '') === '' && placeholderMatchedOption?.value) {
      onValueChange(placeholderMatchedOption.value)
    }
  }, [value, placeholderMatchedOption, onValueChange])

  const shouldRenderPlaceholderOption = !placeholderMatchedOption
  const selectedValue = (value ?? '') === '' ? (placeholderMatchedOption?.value ?? '') : (value ?? '')
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
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23747474' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0px center',
    backgroundSize: '18px',
    cursor: 'pointer',
  }

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>
        {label}
        {required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}
      </Text>
      <View style={combinedStyle}>
        <select
          aria-label={label}
          title={label}
          value={selectedValue}
          style={selectorStyle}
          onChange={(e) => onValueChange(e.target.value)}
        >
          {shouldRenderPlaceholderOption && <option value="">{placeholder}</option>}
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