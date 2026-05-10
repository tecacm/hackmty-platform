import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { formFieldColors } from '../form-field-styles'

type Option = { label: string | React.ReactNode; value: string }

export function FormRadio({
  title,
  options,
  multiple = false,
  layout = 'vertical',
  value,
  onChange,
  required = false,
  variant = 'form',
  subtitle,
  error,
  additionalStyle = {},
}: {
  title?: string | React.ReactNode
  options: Option[]
  multiple?: boolean
  layout?: 'vertical' | 'horizontal-wrap'
  value?: string | string[]
  onChange?: (v: string | string[]) => void
  required?: boolean
  variant?: 'default' | 'form'
  subtitle?: string
  error?: string
  additionalStyle?: any
}) {
  const isControlled = typeof value !== 'undefined'

  const [internalValue, setInternalValue] = useState<string | string[] | undefined>(
    multiple ? [] : undefined
  )

  useEffect(() => {
    if (isControlled) {
      setInternalValue(value)
    }
  }, [isControlled, value])

  const selected = isControlled ? (value as any) : internalValue

  const setSelected = (next: string | string[]) => {
    if (!isControlled) setInternalValue(next)
    onChange?.(next)
  }

  const toggleOption = (opt: string) => {
    if (multiple) {
      const arr = (selected as string[]) || []
      const has = arr.includes(opt)
      const next = has ? arr.filter((v) => v !== opt) : [...arr, opt]
      setSelected(next)
    } else {
      setSelected(opt)
    }
  }

  const isOptionSelected = (opt: string) => {
    if (multiple) return ((selected as string[]) || []).includes(opt)
    return selected === opt
  }

  const isHorizontalWrap = layout === 'horizontal-wrap'

  return (
    <View style={[styles.wrapper, additionalStyle]}>
      {title ? (
        <Text style={variant === 'form' ? styles.titleForm : styles.titleDefault}>
          {title}
          {required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}
        </Text>
      ) : null}

      <View style={isHorizontalWrap ? styles.optionsHorizontalWrap : styles.optionsVertical}>
        {options.map((o) => {
          const checked = isOptionSelected(o.value)
          return (
            <Pressable
              key={o.value}
              onPress={(e: any) => {
                // ignore inner interactive taps on web (links etc.)
                if (Platform.OS === 'web') {
                  const tag = e.nativeEvent?.target?.tagName?.toLowerCase()
                  if (tag === 'a' || tag === 'button' || tag === 'input') return
                }
                toggleOption(o.value)
              }}
              style={[styles.optionRow, isHorizontalWrap ? styles.optionRowHorizontalWrap : styles.optionRowVertical]}
            >
              {multiple ? (
                <View style={[styles.checkboxBase, checked && styles.checkboxCheckedForm]}>
                  {checked && <View style={styles.checkmarkForm} />}
                </View>
              ) : (
                <View style={[styles.radioBase, checked && styles.radioSelectedBase]}>
                  {checked && <View style={styles.radioDot} />}
                </View>
              )}

              <View style={isHorizontalWrap ? styles.optionLabelHorizontal : styles.optionLabelVertical}>
                {typeof o.label === 'string' ? (
                  <Text style={variant === 'form' ? styles.labelForm : styles.labelDefault}>{o.label}</Text>
                ) : (
                  <View>{o.label}</View>
                )}
              </View>
            </Pressable>
          )
        })}
      </View>

      {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  titleForm: {
    color: formFieldColors.titleText,
    fontSize: 15,
    marginBottom: 6,
  },
  titleDefault: {
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 6,
  },
  optionsVertical: {
    width: '100%',
  },
  optionsHorizontalWrap: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  optionRowVertical: {
    marginVertical: 8,
    width: '100%',
  },
  optionRowHorizontalWrap: {
    width: 'auto',
    marginRight: 18,
    marginBottom: 10,
    paddingTop: 10,
    paddingRight: 8,
  },
  optionLabelVertical: {
    flex: 1,
  },
  optionLabelHorizontal: {
    flexShrink: 1,
    marginRight: 2,
  },
  checkboxBase: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: formFieldColors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  checkboxCheckedForm: {
    backgroundColor: formFieldColors.theme,
    borderColor: formFieldColors.theme,
  },
  checkmarkForm: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: formFieldColors.selectedText,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  radioBase: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: formFieldColors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  radioSelectedBase: {
    borderColor: formFieldColors.theme,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: formFieldColors.theme,
  },
  labelForm: {
    color: formFieldColors.titleText,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  labelDefault: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  subtitleText: {
    color: formFieldColors.muted,
    fontSize: 12,
    marginTop: 6,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
  },
})

export default FormRadio
