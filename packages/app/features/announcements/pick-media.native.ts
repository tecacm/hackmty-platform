export interface SelectedMedia {
  file?: any
  uri: string
  name: string
  type: string
  mediaType: 'image' | 'video'
}

export async function pickMedia(): Promise<SelectedMedia | null> {
  try {
    let ImagePicker: any
    try {
      ImagePicker = require('expo-image-picker')
    } catch (e) {
      console.warn('expo-image-picker module not found')
      return null
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissionResult.granted) {
      alert('Permission to access media library is required!')
      return null
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.85,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0]
      const isVideo = asset.type === 'video' || asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov')
      const fileName = asset.fileName || asset.uri.split('/').pop() || 'upload'
      const fileType = isVideo ? 'video/mp4' : 'image/jpeg'

      return {
        uri: asset.uri,
        name: fileName,
        type: fileType,
        mediaType: isVideo ? 'video' : 'image',
      }
    }
  } catch (err) {
    console.error('Failed to pick media:', err)
  }

  return null
}
