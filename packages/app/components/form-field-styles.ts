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
  glassContainer: {
    width: '100%',
    gap: 6,
  },
  glassLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.69,
    fontFamily: 'Montserrat',
  },
  glassFieldShell: {
    backgroundColor: 'rgba(255,255,255,.36)',
    borderRadius: 14,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.55)',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,.48), rgba(255,255,255,.24))',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,.7), 0 1px 3px rgba(0,0,0,.08), 0 0 0 1px rgba(240,217,176,.15)',
      } as any,
    }),
  },
  glassInputText: {
    fontSize: 15,
    color: '#1a0f28',
    fontFamily: 'Montserrat',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  togglePassword: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  togglePasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: formFieldColors.subtext,
  },
  togglePasswordTextGlass: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3d2a55',
    fontFamily: 'Montserrat',
  },
})