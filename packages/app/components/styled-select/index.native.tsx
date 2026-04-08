import { View, Text, TextStyle, ViewStyle, TouchableOpacity } from 'react-native'
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

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, additionalStyle, error }: StyledSelectProps) {
  const selectedValue = value ?? ''
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label || placeholder
  const isPlaceholderActive = selectedValue === ''
  const triggerTextStyle = [formFieldStyles.selectText, isPlaceholderActive && { color: formFieldColors.muted }]
  const combinedStyle = [formFieldStyles.selectTrigger, additionalStyle, error && formFieldStyles.errorInput]

  const actions: MenuAction[] = [
    { id: '', title: placeholder },
    ...options.map((option) => ({ id: option.value, title: option.label })),
  ]

  return (
    <View style={formFieldStyles.container}>
      <Text style={formFieldStyles.label}>{label}</Text>
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
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}
