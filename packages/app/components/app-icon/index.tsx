import React from 'react'
import {
  Heart,
  Camera,
  QrCode,
  Megaphone,
  Maximize2,
  X,
  Lock,
  Unlock,
  Pencil,
  Mail,
  MessageSquare,
  Smartphone,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Ban,
  Slash,
  Menu,
  PlusCircle,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Octagon,
  Leaf,
  Square,
  CheckSquare,
  Users,
  Clock,
  MapPin,
  Landmark,
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
  | 'lock.open.fill'
  | 'pencil'
  | 'mail'
  | 'mail.fill'
  | 'envelope'
  | 'envelope.fill'
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
  | 'plus'
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
  | 'mappin.and.ellipse'
  | 'mappin'
  | 'building.columns.fill'
  | 'building'

interface AppIconProps {
  name: IconName | string
  color?: string
  size?: number
}

export function AppIcon({ name, color = '#ffffff', size = 18 }: AppIconProps) {
  const isFilled = name.endsWith('.fill')

  if (name.startsWith('heart')) {
    return <Heart size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name.startsWith('camera')) {
    return <Camera size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name === 'qrcode') {
    return <QrCode size={size} color={color} strokeWidth={2} />
  }

  if (name.startsWith('megaphone')) {
    return <Megaphone size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name === 'arrow.up.left.and.arrow.down.right') {
    return <Maximize2 size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'lock.open.fill') {
    return <Unlock size={size} color={color} strokeWidth={2} />
  }

  if (name.startsWith('lock')) {
    return <Lock size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name === 'pencil') {
    return <Pencil size={size} color={color} strokeWidth={2} />
  }

  if (name.startsWith('mail') || name.startsWith('envelope')) {
    return <Mail size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name.startsWith('message')) {
    return <MessageSquare size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name === 'smartphone') {
    return <Smartphone size={size} color={color} strokeWidth={2} />
  }

  if (name === 'checkmark') {
    return <Check size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'chevron.right') {
    return <ChevronRight size={size} color={color} strokeWidth={2} />
  }

  if (name === 'chevron.left') {
    return <ChevronLeft size={size} color={color} strokeWidth={2} />
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

  if (name === 'plus.circle.fill') {
    return <PlusCircle size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'plus') {
    return <Plus size={size} color={color} strokeWidth={2.5} />
  }

  if (name === 'magnifyingglass') {
    return <Search size={size} color={color} strokeWidth={2} />
  }

  if (name === 'checkmark.circle.fill') {
    return <CheckCircle size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'exclamationmark.triangle.fill') {
    return <AlertTriangle size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'xmark.circle.fill') {
    return <XCircle size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'xmark.octagon.fill') {
    return <Octagon size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'leaf.fill') {
    return <Leaf size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'square') {
    return <Square size={size} color={color} strokeWidth={2} />
  }

  if (name === 'checkmark.square.fill') {
    return <CheckSquare size={size} color={color} fill={color} strokeWidth={2} />
  }

  if (name === 'person.3.fill') {
    return <Users size={size} color={color} strokeWidth={2} />
  }

  if (name === 'clock.fill') {
    return <Clock size={size} color={color} strokeWidth={2} />
  }

  if (name.startsWith('mappin')) {
    return <MapPin size={size} color={color} fill={isFilled ? color : 'none'} strokeWidth={2} />
  }

  if (name.startsWith('building')) {
    return <Landmark size={size} color={color} strokeWidth={2} />
  }

  if (name === 'xmark') {
    return <X size={size} color={color} strokeWidth={2.5} />
  }

  return <X size={size} color={color} strokeWidth={2.5} />
}
