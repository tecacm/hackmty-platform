import React from 'react'
import { Platform } from 'react-native'

export type IconName =
  | 'heart'
  | 'heart.fill'
  | 'camera'
  | 'camera.fill'
  | 'qrcode'
  | 'arrow.up.left.and.arrow.down.right'
  | 'megaphone'
  | 'megaphone.fill'
  | 'xmark'
  | 'lock.fill'
  | 'pencil'

interface AppIconProps {
  name: IconName
  color?: string
  size?: number
}

export function AppIcon({ name, color = '#ffffff', size = 18 }: AppIconProps) {
  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SymbolView } = require('expo-symbols') as { SymbolView: any }
      const iosSymbol = name === 'pencil' ? 'pencil' : name
      return <SymbolView name={iosSymbol as any} tintColor={color} size={size} />
    } catch (e) {}
  }

  // Android Native vector icon support using @expo/vector-icons
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Ionicons } = require('@expo/vector-icons') as { Ionicons: any }
    let ionName = 'square-outline'

    if (name === 'heart.fill') ionName = 'heart'
    else if (name === 'heart') ionName = 'heart-outline'
    else if (name === 'camera.fill' || name === 'camera') ionName = 'camera'
    else if (name === 'qrcode') ionName = 'qr-code'
    else if (name === 'megaphone.fill' || name === 'megaphone') ionName = 'megaphone'
    else if (name === 'arrow.up.left.and.arrow.down.right') ionName = 'expand'
    else if (name === 'lock.fill') ionName = 'lock-closed'
    else if (name === 'xmark') ionName = 'close'
    else if (name === 'pencil') ionName = 'pencil'

    return <Ionicons name={ionName} size={size} color={color} />
  } catch (e) {
    return null
  }
}
