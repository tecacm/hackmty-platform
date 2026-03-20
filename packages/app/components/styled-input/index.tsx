import { TextInput, StyleSheet, Platform, View, Text, TextInputProps, TextStyle, ViewStyle } from 'react-native'

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
    <View style={styles.inputContainer}>
      <Text style={[styles.label, additionalStyle]}>{label}</Text>
      <TextInput
        style={[styles.input, additionalStyle, error && styles.errorInput]}
        placeholderTextColor="#d4d4d4"
        // Crucial for Native UX:
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={isPassword}
        textContentType={textContentType} 
        {...props}
      />
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
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
    // Web-specific: removes the blue outline on click
    ...Platform.select({
      web: { outlineStyle: 'none' },
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