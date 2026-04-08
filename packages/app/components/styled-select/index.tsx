import React from 'react'
import { TextInput, StyleSheet, Platform, View, Text, TextStyle, ViewStyle } from 'react-native'

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

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, error, additionalStyle, ...props}: StyledSelectProps) {
  const selectedValue = value ?? ''
  const combinedStyle = {...styles.input, ...additionalStyle, ...(error && styles.errorInput)}
  const isPlaceholderActive = selectedValue === ''
  const selectorStyle = {
    ...styles.input, 
    backgroundColor: '#ffffff00', 
    width: '100%',
    color: isPlaceholderActive ? '#d4d4d4' : '#ffffff',
    appearance: 'none', // Remove default dropdown arrow
    WebkitAppearance: 'none', // For Safari
    MozAppearance: 'none', // For Firefox
  }

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, additionalStyle]}>{label}</Text>
      <View style={combinedStyle}>
        <select
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
      {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 16,
    width:'100%'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  input: {
    height: 50,
    backgroundColor: '#f5f5f57b',
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#ffffff',
    borderColor: '#ffffff00',
    // Web-specific: removes the blue outline on click
    ...Platform.select({
      web: { 
        outlineStyle: 'none',
      },
      
    }),
  },
  errorInput: {
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  subtitleText: {
    color: '#d4d4d4',
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
  },
})