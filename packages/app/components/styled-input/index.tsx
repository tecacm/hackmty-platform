import { TextInput, StyleSheet, Platform, View, Text } from 'react-native'

export function StyledInput({ label, isPassword, additionalStyle={}, ...props }) {
  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, additionalStyle]}>{label}</Text>
      <TextInput
        style={[styles.input, additionalStyle]}
        placeholderTextColor="#3a3a3a"
        // Crucial for Native UX:
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={isPassword}
        textContentType={isPassword ? 'password' : 'emailAddress'} 
        {...props}
      />
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
    // Web-specific: removes the blue outline on click
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
})