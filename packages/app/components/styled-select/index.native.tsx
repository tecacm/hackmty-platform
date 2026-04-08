import React, { useMemo, useState } from 'react'
import { View, Text, TextStyle, ViewStyle, TouchableOpacity, Modal, Pressable, StyleSheet, UIManager } from 'react-native'
import { MenuView, MenuAction } from '@react-native-menu/menu'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

export type SelectOption = { label: string; value: string }

type StyledSelectProps = {
  label: string
  value?: string
  placeholder?: string
  error?: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  subtitle?: string
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

function isMenuViewSupported() {
  try {
    return Boolean(UIManager.getViewManagerConfig?.('MenuView'))
  } catch {
    return false
  }
}

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, additionalStyle, error }: StyledSelectProps) {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const selectedValue = value ?? ''
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label || placeholder
  const isPlaceholderActive = selectedValue === ''
  const triggerTextStyle = [formFieldStyles.selectText, isPlaceholderActive && { color: formFieldColors.muted }]
  const combinedStyle = [formFieldStyles.selectTrigger, additionalStyle, error && formFieldStyles.errorInput]
  const useMenuView = useMemo(() => isMenuViewSupported(), [])

  const actions: MenuAction[] = [
    { id: '', title: placeholder },
    ...options.map((option) => ({ id: option.value, title: option.label })),
  ]

  const fallbackOptions: SelectOption[] = [
    { label: placeholder, value: '' },
    ...options,
  ]

  const handleFallbackSelect = (nextValue: string) => {
    onValueChange(nextValue)
    setIsModalVisible(false)
  }

  return (
    <View style={formFieldStyles.container}>
      <Text style={formFieldStyles.label}>{label}</Text>
      {useMenuView ? (
        <MenuView
          title={selectedLabel}
          onPressAction={({ nativeEvent }) => onValueChange(nativeEvent.event)}
          actions={actions}
          style={formFieldStyles.fullWidth}
        >
          <TouchableOpacity style={combinedStyle}>
            <Text style={triggerTextStyle}>{selectedLabel}</Text>
          </TouchableOpacity>
        </MenuView>
      ) : (
        <>
          <TouchableOpacity style={combinedStyle} onPress={() => setIsModalVisible(true)} activeOpacity={0.8}>
            <Text style={triggerTextStyle}>{selectedLabel}</Text>
          </TouchableOpacity>

          <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
            <Pressable style={styles.backdrop} onPress={() => setIsModalVisible(false)}>
              <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
                {fallbackOptions.map((option) => {
                  const isSelected = option.value === selectedValue
                  return (
                    <TouchableOpacity key={option.value || '__empty__'} style={styles.optionRow} onPress={() => handleFallbackSelect(option.value)}>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000066',
    paddingHorizontal: 24,
  },
  sheet: {
    borderRadius: 30,
    paddingVertical: 8,
    backgroundColor: '#828282e3',
    borderWidth: 1,
    borderColor: '#9f9f9f',
  },
  sheetTitle: {
    color: formFieldColors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    color: formFieldColors.text,
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#c2b75f',
    fontWeight: '700',
  },
})
