import { TextInput, View, Text, TextInputProps, TextStyle, ViewStyle } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type StyledInputProps = Omit<TextInputProps, 'style'> & {
  label: string
  error?: string
  subtitle?: string
  textContentType?: TextInputProps['textContentType']
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export function StyledInput({ label, textContentType, additionalStyle = {}, error, subtitle, ...props }: StyledInputProps) {
  let isPassword = textContentType === 'password'
  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>{label}</Text>
      <TextInput
        style={[formFieldStyles.fieldShell, formFieldStyles.inputText, additionalStyle, error && formFieldStyles.errorInput]}
        placeholderTextColor={formFieldColors.muted}
        // Crucial for Native UX:
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={isPassword}
        textContentType={textContentType} 
        {...props}
      />
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
    </View>
  )
}