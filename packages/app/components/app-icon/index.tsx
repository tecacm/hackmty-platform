import React from 'react'
import {
  Heart,
  Camera,
  QrCode,
  Megaphone,
  Maximize2,
  X,
  Lock,
  Pencil,
} from 'lucide-react'

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
  const isFilled = name.endsWith('.fill')

  if (name.startsWith('heart')) {
    return (
      <Heart
        size={size}
        color={color}
        fill={isFilled ? color : 'none'}
        strokeWidth={2}
      />
    )
  }

  if (name.startsWith('camera')) {
    return (
      <Camera
        size={size}
        color={color}
        fill={isFilled ? color : 'none'}
        strokeWidth={2}
      />
    )
  }

  if (name === 'qrcode') {
    return <QrCode size={size} color={color} strokeWidth={2} />
  }

  if (name.startsWith('megaphone')) {
    return (
      <Megaphone
        size={size}
        color={color}
        fill={isFilled ? color : 'none'}
        strokeWidth={2}
      />
    )
  }

  if (name === 'arrow.up.left.and.arrow.down.right') {
    return <Maximize2 size={size} color={color} strokeWidth={2.5} />
  }

  if (name.startsWith('lock')) {
    return (
      <Lock
        size={size}
        color={color}
        fill={isFilled ? color : 'none'}
        strokeWidth={2}
      />
    )
  }

  if (name === 'pencil') {
    return <Pencil size={size} color={color} strokeWidth={2} />
  }

  return <X size={size} color={color} strokeWidth={2.5} />
}
