import * as DocumentPicker from 'expo-document-picker'

export async function pickAvatar(): Promise<{ uri: string; name: string; type: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'image/*',
    multiple: false,
    copyToCacheDirectory: true,
  })

  if (result.canceled || !result.assets?.[0]) return null
  const asset = result.assets[0]

  return {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType || 'image/png',
  }
}
