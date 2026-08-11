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
  | 'lock.open.fill'
  | 'pencil'
  | 'mail'
  | 'message'
  | 'message.fill'
  | 'smartphone'
  | 'checkmark'
  | 'chevron.right'
  | 'chevron.left'
  | 'chevron.up'
  | 'chevron.down'
  | 'ban'
  | 'slash'
  | 'menu'
  | 'plus.circle.fill'
  | 'magnifyingglass'
  | 'checkmark.circle.fill'
  | 'exclamationmark.triangle.fill'
  | 'xmark.circle.fill'
  | 'xmark.octagon.fill'
  | 'leaf.fill'
  | 'square'
  | 'checkmark.square.fill'
  | 'person.3.fill'
  | 'clock.fill'

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
      let iosSymbol = name === 'pencil' ? 'pencil' : name
      if (name === 'mail') iosSymbol = 'envelope'
      if (name.startsWith('message')) iosSymbol = 'message.fill'
      if (name === 'smartphone') iosSymbol = 'iphone'
      if (name === 'checkmark') iosSymbol = 'checkmark'
      if (name === 'chevron.right') iosSymbol = 'chevron.right'
      if (name === 'chevron.left') iosSymbol = 'chevron.left'
      if (name === 'chevron.up') iosSymbol = 'chevron.up'
      if (name === 'chevron.down') iosSymbol = 'chevron.down'
      if (name === 'ban') iosSymbol = 'nosign'
      if (name === 'slash') iosSymbol = 'circle.slash'
      if (name === 'menu') iosSymbol = 'line.3.horizontal'
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
    else if (name === 'lock.open.fill') ionName = 'lock-open'
    else if (name === 'xmark') ionName = 'close'
    else if (name === 'pencil') ionName = 'pencil'
    else if (name === 'mail') ionName = 'mail'
    else if (name.startsWith('message')) ionName = 'chatbubble'
    else if (name === 'smartphone') ionName = 'phone-portrait'
    else if (name === 'checkmark') ionName = 'checkmark'
    else if (name === 'chevron.right') ionName = 'chevron-forward'
    else if (name === 'chevron.left') ionName = 'chevron-back'
    else if (name === 'chevron.up') ionName = 'chevron-up'
    else if (name === 'chevron.down') ionName = 'chevron-down'
    else if (name === 'ban' || name === 'slash') ionName = 'ban'
    else if (name === 'menu') ionName = 'menu'
    else if (name === 'plus.circle.fill') ionName = 'add-circle'
    else if (name === 'magnifyingglass') ionName = 'search'
    else if (name === 'checkmark.circle.fill') ionName = 'checkmark-circle'
    else if (name === 'exclamationmark.triangle.fill') ionName = 'warning'
    else if (name === 'xmark.circle.fill') ionName = 'close-circle'
    else if (name === 'xmark.octagon.fill') ionName = 'alert-circle'
    else if (name === 'leaf.fill') ionName = 'leaf'
    else if (name === 'square') ionName = 'square-outline'
    else if (name === 'checkmark.square.fill') ionName = 'checkbox'
    else if (name === 'person.3.fill') ionName = 'people'
    else if (name === 'clock.fill') ionName = 'time'

    return <Ionicons name={ionName} size={size} color={color} />
  } catch (e) {
    return null
  }
}
