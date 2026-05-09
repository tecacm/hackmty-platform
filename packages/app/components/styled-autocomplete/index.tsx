import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { StyledInput } from '../styled-input'
import { formFieldColors } from '../form-field-styles'

type StyledAutocompleteProps = {
  label: string
  value?: string
  placeholder?: string
  error?: string
  subtitle?: string
  required?: boolean
  options: string[]
  onChangeText: (value: string) => void
  maxSuggestions?: number
  textContentType?: any
  additionalStyle?: any
}

export function StyledAutocomplete({
  label,
  value,
  placeholder,
  error,
  subtitle,
  required = false,
  options,
  onChangeText,
  maxSuggestions = 8,
  textContentType,
  additionalStyle,
}: StyledAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false)
  const closeSuggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentValue = value ?? ''
  const normalizedValue = currentValue.trim().toLowerCase()

  const clearCloseSuggestionsTimeout = () => {
    if (closeSuggestionsTimeoutRef.current) {
      clearTimeout(closeSuggestionsTimeoutRef.current)
      closeSuggestionsTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => clearCloseSuggestionsTimeout()
  }, [])

  const suggestions = useMemo(() => {
    if (!isFocused || normalizedValue.length < 1) return []

    const startsWith = options.filter((entry) => entry.toLowerCase().startsWith(normalizedValue))
    const contains = options.filter(
      (entry) => !entry.toLowerCase().startsWith(normalizedValue) && entry.toLowerCase().includes(normalizedValue)
    )

    return [...startsWith, ...contains].slice(0, maxSuggestions)
  }, [isFocused, maxSuggestions, normalizedValue, options])

  const showSuggestions = suggestions.length > 0

  return (
    <View style={styles.container}>
      <View>
        <StyledInput
          label={label}
          value={currentValue}
          placeholder={placeholder}
          subtitle={subtitle}
          error={error}
          required={required}
          textContentType={textContentType}
          additionalStyle={additionalStyle}
          onFocus={() => {
            clearCloseSuggestionsTimeout()
            setIsFocused(true)
          }}
          onBlur={() => {
            // Delay close so tap events on suggestion rows can fire first.
            clearCloseSuggestionsTimeout()
            closeSuggestionsTimeoutRef.current = setTimeout(() => setIsFocused(false), 180)
          }}
          onChangeText={onChangeText}
        />
      </View>

      {showSuggestions && (
        <View style={[styles.suggestionList, additionalStyle]}>
          {suggestions.map((entry) => (
            <TouchableOpacity
              key={entry}
              style={styles.suggestionRow}
              onPressIn={() => {
                clearCloseSuggestionsTimeout()
                onChangeText(entry)
                setIsFocused(false)
              }}
            >
              <Text style={styles.suggestionText}>{entry}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  suggestionList: {
    marginTop: -8,
    borderRadius: 10,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backgroundColor: formFieldColors.surface,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.07)',
      } as any,
    }),
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#04040427',
  },
  suggestionText: {
    color: formFieldColors.text,
    fontSize: 14,
  },
})