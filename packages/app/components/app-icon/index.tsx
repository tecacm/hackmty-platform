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
  Mail,
  MessageSquare,
  Smartphone,
  Check,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Ban,
  Slash,
  Menu,
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
  | 'mail'
  | 'message'
  | 'message.fill'
  | 'smartphone'
  | 'checkmark'
  | 'chevron.right'
  | 'chevron.up'
  | 'chevron.down'
  | 'ban'
  | 'slash'
  | 'menu'

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

  if (name === 'mail') {
    return <Mail size={size} color={color} strokeWidth={2} />
  }

  if (name.startsWith('message')) {
    return (
      <MessageSquare
        size={size}
        color={color}
        fill={isFilled ? color : 'none'}
        strokeWidth={2}
      />
    )
  }

  if (name === 'smartphone') {
    return <Smartphone size={size} color={color} strokeWidth={2} />
  }

  if (name === 'checkmark') {
    return <Check size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'chevron.right') {
    return <ChevronRight size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'chevron.up') {
    return <ChevronUp size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'chevron.down') {
    return <ChevronDown size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'ban') {
    return <Ban size={size} color={color} strokeWidth={2} />
  }

  if (name === 'slash') {
    return <Slash size={size} color={color} strokeWidth={2} />
  }

  if (name === 'menu') {
    return <Menu size={size} color={color} strokeWidth={2} />
  }

  return <X size={size} color={color} strokeWidth={2.5} />
}
