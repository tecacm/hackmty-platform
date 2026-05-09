import { Platform, StyleSheet } from 'react-native'

export const formFieldColors = {
  titleText: '#7f7f7f',
  text: '#000000',
  muted: '#747474',
  subtext: '#5e5e5e',
  error: '#ff6b6b',
  surface: '#e2e2e2',
  transparent: '#ffffff00',
  accent: '#c2b75f',
  selectedText: '#ffffff',
  borderColor: '#c2c2c2',
  theme: '#970a97b2',
} as const

export const formFieldStyles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: formFieldColors.titleText,
  },
  fieldShell: {
    height: 50,
    backgroundColor: formFieldColors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: formFieldColors.borderColor,
  },
  inputText: {
    fontSize: 16,
    color: formFieldColors.text,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  selectText: {
    color: formFieldColors.text,
    fontSize: 16,
  },
  helperText: {
    color: formFieldColors.subtext,
    fontSize: 12,
    marginTop: 12,
  },
  errorText: {
    color: formFieldColors.error,
    fontSize: 12,
    marginTop: 4,
  },
  errorInput: {
    borderWidth: 2,
    borderColor: formFieldColors.error,
  },
})