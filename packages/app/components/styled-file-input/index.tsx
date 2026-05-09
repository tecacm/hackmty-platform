import React, { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, TextStyle, ViewStyle } from 'react-native'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type StyledFileInputProps = {
  label: string
  value?: string
  placeholder?: string
  error?: string
  subtitle?: string
  required?: boolean
  fileSelectorProps?: FileSelectorProps
  onValueChange: (value: string) => void
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export type FileSelectorProps = {
  acceptedMimeTypes?: string[]
  acceptedExtensions?: string[]
  maxSizeBytes?: number
  invalidFileTypeMessage?: string
  invalidFileSizeMessage?: string
  fileSizeUnknownMessage?: string
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function matchesAcceptedFileType(file: File, acceptedMimeTypes: string[], acceptedExtensions: string[]) {
  const extension = getFileExtension(file.name)
  const mimeMatches = acceptedMimeTypes.length > 0 && acceptedMimeTypes.some((mimeType) => mimeType === file.type)
  const extensionMatches = acceptedExtensions.length > 0 && acceptedExtensions.some((acceptedExtension) => acceptedExtension.replace(/^\./, '').toLowerCase() === extension)

  if (acceptedMimeTypes.length === 0 && acceptedExtensions.length === 0) return true
  return mimeMatches || extensionMatches
}

function validatePickedFile(file: File, acceptedMimeTypes: string[], acceptedExtensions: string[], maxSizeBytes?: number, invalidFileTypeMessage?: string, invalidFileSizeMessage?: string) {
  if (!matchesAcceptedFileType(file, acceptedMimeTypes, acceptedExtensions)) {
    return invalidFileTypeMessage ?? 'The selected file type is not allowed.'
  }

  if (typeof maxSizeBytes === 'number' && file.size > maxSizeBytes) {
    return invalidFileSizeMessage ?? 'The selected file is too large.'
  }

  return ''
}

function buildAcceptValue(acceptedMimeTypes: string[], acceptedExtensions: string[]) {
  const parts = [...acceptedMimeTypes, ...acceptedExtensions.map((extension) => (extension.startsWith('.') ? extension : `.${extension}`))]
  return parts.join(',')
}

function getDisplayLabel(value?: string, placeholder?: string) {
  if (!value) return placeholder ?? 'Choose a file'
  return value
}

export function StyledFileInput({
  label,
  value,
  placeholder = 'Choose a file',
  error,
  subtitle,
  required = false,
  fileSelectorProps = {},
  onValueChange,
  additionalStyle = {},
}: StyledFileInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localError, setLocalError] = useState('')
  const {
    acceptedMimeTypes = [],
    acceptedExtensions = [],
    maxSizeBytes,
    invalidFileTypeMessage,
    invalidFileSizeMessage,
    fileSizeUnknownMessage,
  } = fileSelectorProps

  const openPicker = () => {
    inputRef.current?.click()
  }

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>
        {label}{required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}
      </Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          formFieldStyles.fieldShell,
          styles.trigger,
          additionalStyle,
          error && formFieldStyles.errorInput,
          pressed && styles.triggerPressed,
        ]}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText]}>{getDisplayLabel(value, placeholder)}</Text>
        <Text style={styles.actionText}>Browse</Text>
      </Pressable>
      <input
        ref={inputRef}
        type="file"
        accept={buildAcceptValue(acceptedMimeTypes, acceptedExtensions)}
        hidden
        title={label}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) {
            setLocalError('')
            onValueChange('')
            event.target.value = ''
            return
          }

          const validationError = validatePickedFile(file, acceptedMimeTypes, acceptedExtensions, maxSizeBytes, invalidFileTypeMessage, invalidFileSizeMessage)
          if (validationError) {
            setLocalError(validationError)
            onValueChange('')
            event.target.value = ''
            return
          }

          if (typeof maxSizeBytes === 'number' && Number.isNaN(file.size)) {
            setLocalError(fileSizeUnknownMessage ?? 'The selected file size could not be verified.')
            onValueChange('')
            event.target.value = ''
            return
          }

          setLocalError('')
          onValueChange(file.name)
          event.target.value = ''
        }}
      />
      {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
      {!!(localError || error) && <Text style={formFieldStyles.errorText}>{localError || error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  triggerPressed: {
    opacity: 0.92,
  },
  triggerText: {
    flex: 1,
    color: formFieldColors.text,
    fontSize: 16,
  },
  placeholderText: {
    color: formFieldColors.muted,
  },
  actionText: {
    color: formFieldColors.theme,
    fontSize: 14,
    fontWeight: '700',
  },
})