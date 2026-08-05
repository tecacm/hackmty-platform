import React, { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, TextStyle, ViewStyle } from 'react-native'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { formFieldColors, formFieldStyles } from '../form-field-styles'

type StyledFileInputProps = {
  label: string
  value?: string
  placeholder?: string
  error?: string
  subtitle?: React.ReactNode | string
  required?: boolean
  disabled?: boolean
  editable?: boolean
  bucketName?: string
  fileNamePrefix?: string
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
  disabled,
  editable,
  bucketName = 'resumes',
  fileNamePrefix = 'resume',
  fileSelectorProps = {},
  onValueChange,
  additionalStyle = {},
}: StyledFileInputProps) {
  const isDisabled = disabled || editable === false
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localError, setLocalError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const {
    acceptedMimeTypes = [],
    acceptedExtensions = [],
    maxSizeBytes,
    invalidFileTypeMessage,
    invalidFileSizeMessage,
    fileSizeUnknownMessage,
  } = fileSelectorProps

  const openPicker = () => {
    if (!isUploading && !isDisabled) {
      inputRef.current?.click()
    }
  }

  return (
    <View style={formFieldStyles.container}>
      <Text style={[formFieldStyles.label, additionalStyle]}>
        {label}{required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}
      </Text>
      <Pressable
        onPress={openPicker}
        disabled={isUploading || isDisabled}
        style={({ pressed }) => [
          formFieldStyles.fieldShell,
          styles.trigger,
          additionalStyle,
          error && formFieldStyles.errorInput,
          pressed && !isDisabled && styles.triggerPressed,
          isDisabled && { backgroundColor: '#e2e2e2' },
          isUploading && { opacity: 0.6 }
        ]}
      >
        <Text style={[styles.triggerText, !value && styles.placeholderText, isDisabled && { color: '#a4a7ae' }]}>
          {isUploading ? 'Uploading file...' : getDisplayLabel(value, placeholder)}
        </Text>
        <Text style={[styles.actionText, isDisabled && { color: '#a4a7ae' }]}>{isUploading ? 'Uploading...' : 'Browse'}</Text>
      </Pressable>
      <input
        ref={inputRef}
        type="file"
        accept={buildAcceptValue(acceptedMimeTypes, acceptedExtensions)}
        hidden
        title={label}
        onChange={async (event) => {
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

          // FALLBACK PATH: If Supabase is not configured, fallback to just setting name
          if (!isSupabaseConfigured) {
            onValueChange(file.name)
            event.target.value = ''
            return
          }

          try {
            setIsUploading(true)
            
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
              throw new Error('Please log in before uploading files.')
            }

            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/${fileNamePrefix}.${fileExt}`

            // Upload the file payload directly to storage
            const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Save the storage file path
            onValueChange(filePath)
          } catch (err: any) {
            console.error('File upload error:', err)
            setLocalError(err.message || 'Failed to upload file.')
            onValueChange('')
          } finally {
            setIsUploading(false)
            event.target.value = ''
          }
        }}
      />
      {subtitle && (typeof subtitle === 'string' ? <Text style={formFieldStyles.helperText}>{subtitle}</Text> : subtitle)}
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