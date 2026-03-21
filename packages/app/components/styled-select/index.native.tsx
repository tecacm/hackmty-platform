import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { MenuView, MenuAction } from '@react-native-menu/menu'

export type SelectOption = { label: string; value: string }

type StyledSelectProps = {
  label: string
  value?: string
  placeholder?: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  subtitle?: string
  style?: object
}

export function StyledSelect({ label, value, placeholder = 'Select...', options, onValueChange, subtitle, style }: StyledSelectProps) {
  const selectedValue = value ?? ''
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label || placeholder

  const actions: MenuAction[] = [
    { id: '', title: placeholder },
    ...options.map((option) => ({ id: option.value, title: option.label })),
  ]

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <MenuView
        title={selectedLabel}
        onPressAction={({ nativeEvent }) => onValueChange(nativeEvent.id)}
        actions={actions}
        style={styles.menuView}
      >
        <TouchableOpacity style={[styles.trigger, style]}>
          <Text style={styles.triggerText}>{selectedLabel}</Text>
        </TouchableOpacity>
      </MenuView>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 8, width: '100%' },
  label: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  trigger: { minHeight: 50, backgroundColor: '#f5f5f57b', borderRadius: 12, justifyContent: 'center', paddingHorizontal: 12 },
  triggerText: { color: '#ffffff', fontSize: 16 },
  subtitle: { color: '#d4d4d4', fontSize: 12, marginTop: 4 },
  menuView: { width: '100%' },
})
