import { ActionSheetIOS, Platform, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'

export async function pickAvatar(): Promise<{ uri: string; name: string; type: string; base64?: string } | null> {
  return new Promise((resolve) => {
    const handleCamera = async () => {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take a photo.')
        resolve(null)
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.[0]) {
        resolve(null)
        return
      }

      const asset = result.assets[0]
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        resolve({
          uri: asset.uri,
          name: asset.fileName || 'avatar.jpg',
          type: asset.mimeType || 'image/jpeg',
          base64,
        })
      } catch (e) {
        console.error('Failed to read camera photo base64:', e)
        resolve(null)
      }
    }

    const handleLibrary = async () => {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Photos access is required to choose a photo.')
        resolve(null)
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.[0]) {
        resolve(null)
        return
      }

      const asset = result.assets[0]
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        resolve({
          uri: asset.uri,
          name: asset.fileName || 'avatar.jpg',
          type: asset.mimeType || 'image/jpeg',
          base64,
        })
      } catch (e) {
        console.error('Failed to read library photo base64:', e)
        resolve(null)
      }
    }

    const handleDocument = async () => {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: false,
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.[0]) {
        resolve(null)
        return
      }

      const asset = result.assets[0]
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        resolve({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'image/png',
          base64,
        })
      } catch (e) {
        console.error('Failed to read document file base64:', e)
        resolve(null)
      }
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Choose File'],
          cancelButtonIndex: 0,
          title: 'Select Profile Picture',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCamera()
          } else if (buttonIndex === 2) {
            handleLibrary()
          } else if (buttonIndex === 3) {
            handleDocument()
          } else {
            resolve(null)
          }
        }
      )
    } else {
      Alert.alert(
        'Select Profile Picture',
        'Choose a source',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Take Photo', onPress: handleCamera },
          { text: 'Choose from Library', onPress: handleLibrary },
          { text: 'Choose File', onPress: handleDocument },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      )
    }
  })
}
