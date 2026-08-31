import * as React from 'react'
import { SvgXml } from 'react-native-svg'
import { buildSocialSvg, type SocialName } from './xml'

export interface SocialIconProps {
  name: SocialName
  size?: number
  color?: string
}

/** Native renderer: render the (tinted) brand glyph via react-native-svg. */
export function SocialIcon({ name, size = 22, color = '#ffffff' }: SocialIconProps) {
  return <SvgXml xml={buildSocialSvg(name, color)} width={size} height={size} />
}
