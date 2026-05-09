import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, TextStyle, ViewStyle } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
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

function matchesAcceptedFileType(asset: DocumentPicker.DocumentPickerAsset, acceptedMimeTypes: string[], acceptedExtensions: string[]) {
  const extension = getFileExtension(asset.name)
  const mimeMatches = acceptedMimeTypes.length > 0 && acceptedMimeTypes.some((mimeType) => mimeType === asset.mimeType)
  const extensionMatches = acceptedExtensions.length > 0 && acceptedExtensions.some((acceptedExtension) => acceptedExtension.replace(/^\./, '').toLowerCase() === extension)

  if (acceptedMimeTypes.length === 0 && acceptedExtensions.length === 0) return true
  return mimeMatches || extensionMatches
}

async function validatePickedAsset(
  asset: DocumentPicker.DocumentPickerAsset,
  acceptedMimeTypes: string[],
  acceptedExtensions: string[],
  maxSizeBytes?: number,
  invalidFileTypeMessage?: string,
  invalidFileSizeMessage?: string,
  fileSizeUnknownMessage?: string
) {
  if (!matchesAcceptedFileType(asset, acceptedMimeTypes, acceptedExtensions)) {
    return invalidFileTypeMessage ?? 'The selected file type is not allowed.'
  }

  if (typeof maxSizeBytes !== 'number') {
    return ''
  }

  if (typeof asset.size !== 'number') {
    return fileSizeUnknownMessage ?? 'The selected file size could not be verified.'
  }

  if (asset.size > maxSizeBytes) {
    return invalidFileSizeMessage ?? 'The selected file is too large.'
  }

  return ''
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
  const [localError, setLocalError] = useState('')
  const {
    acceptedMimeTypes = [],
    acceptedExtensions = [],
    maxSizeBytes,
    invalidFileTypeMessage,
    invalidFileSizeMessage,
    fileSizeUnknownMessage,
  } = fileSelectorProps

  const openPicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: acceptedMimeTypes.length > 0 ? acceptedMimeTypes : '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    })

    if (result.canceled) return

    const picked = result.assets?.[0]
    if (!picked) {
      setLocalError(invalidFileTypeMessage ?? 'The selected file type is not allowed.')
      onValueChange('')
      return
    }

    const validationError = await validatePickedAsset(
      picked,
      acceptedMimeTypes,
      acceptedExtensions,
      maxSizeBytes,
      invalidFileTypeMessage,
      invalidFileSizeMessage,
      fileSizeUnknownMessage
    )
    if (validationError) {
      setLocalError(validationError)
      onValueChange('')
      return
    }

    setLocalError('')
    onValueChange(picked.name)
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