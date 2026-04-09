import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { StyledInput } from '../styled-input'
import { formFieldColors } from '../form-field-styles'

type StyledAutocompleteProps = {
  label: string
  value?: string
  placeholder?: string
  error?: string
  subtitle?: string
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
  options,
  onChangeText,
  maxSuggestions = 8,
  textContentType,
  additionalStyle,
}: StyledAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false)
  const currentValue = value ?? ''
  const normalizedValue = currentValue.trim().toLowerCase()

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
    <View>
      <StyledInput
        label={label}
        value={currentValue}
        placeholder={placeholder}
        subtitle={subtitle}
        error={error}
        textContentType={textContentType}
        additionalStyle={additionalStyle}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          // Delay close so tap events on suggestion rows can fire first.
          setTimeout(() => setIsFocused(false), 120)
        }}
        onChangeText={onChangeText}
      />

      {showSuggestions && (
        <BlurView intensity={100} style={styles.blurContainer} tint='systemThinMaterial'>
          <View style={styles.suggestionList}>
            {suggestions.map((entry) => (
              <TouchableOpacity
                key={entry}
                style={styles.suggestionRow}
                onPress={() => onChangeText(entry)}
              >
                <Text style={styles.suggestionText}>{entry}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  blurContainer: {
    marginTop: -8, 
    overflow: 'hidden',
    ...Platform.select({
        ios:{
            borderRadius: 20,
        } as any,
        android:{
            backgroundColor: '#ffffff',
        } as any,
    }),
  },
  suggestionList: {
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff1c',
  },
  suggestionText: {
    color: '#000000',
    fontSize: 14,
  },
})
