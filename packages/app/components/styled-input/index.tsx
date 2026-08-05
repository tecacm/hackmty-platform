import { TextInput, View, Text, Pressable, TextInputProps, TextStyle, ViewStyle } from 'react-native'
import { useState } from 'react'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type StyledInputProps = Omit<TextInputProps, 'style'> & {
  label: string
  error?: string
  subtitle?: React.ReactNode | string
  required?: boolean
  textContentType?: TextInputProps['textContentType']
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
  height?: number
  variant?: 'default' | 'glass'
}

export function StyledInput({ label, textContentType, additionalStyle = {}, error, subtitle, required = false, height, variant = 'default', ...props }: StyledInputProps) {
  let isPassword = textContentType === 'password'
  const isGlass = variant === 'glass'
  const [showPassword, setShowPassword] = useState(false)
  return (
    <View style={isGlass ? formFieldStyles.glassContainer : formFieldStyles.container}>
      <Text style={[isGlass ? formFieldStyles.glassLabel : formFieldStyles.label, additionalStyle]}>{label}{required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}</Text>
      <View style={[additionalStyle]} >
      <View style={formFieldStyles.inputRow}>
      <TextInput
        style={[
          isGlass ? formFieldStyles.glassFieldShell : formFieldStyles.fieldShell,
          isGlass ? formFieldStyles.glassInputText : formFieldStyles.inputText,
          error && formFieldStyles.errorInput,
          isPassword ? { paddingRight: 56 } : undefined,
          height ? { height, textAlignVertical: 'top' as const, paddingTop: 10 } : undefined,
          props.editable === false && { backgroundColor: '#e2e2e2', color: '#a4a7ae' }
        ]}
        placeholderTextColor={formFieldColors.muted}
        // Crucial for Native UX:
        autoCapitalize="none"
        autoCorrect={false}
        underlineColorAndroid="transparent"
        secureTextEntry={isPassword && !showPassword}
        textContentType={textContentType}
        multiline={height ? true : false}
        {...props}
      />
      {isPassword && (
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          hitSlop={8}
          style={formFieldStyles.togglePassword}
        >
          <Text style={isGlass ? formFieldStyles.togglePasswordTextGlass : formFieldStyles.togglePasswordText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      )}
      </View>
      </View>
      {subtitle && (typeof subtitle === 'string' ? <Text style={formFieldStyles.helperText}>{subtitle}</Text> : subtitle)}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}