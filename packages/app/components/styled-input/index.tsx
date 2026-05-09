import { TextInput, View, Text, TextInputProps, TextStyle, ViewStyle } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type StyledInputProps = Omit<TextInputProps, 'style'> & {
  label: string
  error?: string
  subtitle?: string
  required?: boolean
  textContentType?: TextInputProps['textContentType']
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export function StyledInput({ label, textContentType, additionalStyle = {}, error, subtitle, required = false, ...props }: StyledInputProps) {
  let isPassword = textContentType === 'password'
  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}{required && <Text style={{ color: formFieldColors.error }}>*</Text>}</Text>
      <View style={[additionalStyle]} >
      <TextInput
        style={[formFieldStyles.fieldShell, formFieldStyles.inputText, error && formFieldStyles.errorInput]}
        placeholderTextColor={formFieldColors.muted}
        // Crucial for Native UX:
        autoCapitalize="none"
        autoCorrect={false}
        underlineColorAndroid="transparent"
        secureTextEntry={isPassword}
        textContentType={textContentType} 
        {...props}
      />
      </View>
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}