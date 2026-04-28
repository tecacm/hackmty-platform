import { Platform, StyleSheet } from 'react-native'

export const formFieldColors = {
  text: '#ffffff',
  muted: '#d4d4d4',
  error: '#ff6b6b',
  surface: '#f5f5f57b',
  transparent: '#ffffff00',
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
    color: formFieldColors.text,
  },
  fieldShell: {
    height: 50,
    backgroundColor: formFieldColors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderColor: formFieldColors.transparent,
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
  selectTrigger: {
    minHeight: 50,
    backgroundColor: formFieldColors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectText: {
    color: formFieldColors.text,
    fontSize: 16,
  },
  helperText: {
    color: formFieldColors.muted,
    fontSize: 12,
    marginTop: 8,
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