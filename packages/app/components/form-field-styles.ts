import { Platform, StyleSheet } from 'react-native'

export const formFieldColors = {
  titleText: '#ffffff',
  text: '#000000',
  muted: '#777777',
  subtext: '#dbdbdb',
  error: '#ff6b6b',
  surface: '#f5f5f5e9',
  transparent: '#ffffff00',
  accent: '#c2b75f',
  theme: '#d077d0',
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
    borderRadius: 12,
    justifyContent: 'center',
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