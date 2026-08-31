'use client'

import * as React from 'react'
import { View } from 'react-native'
import { buildSocialSvg, type SocialName } from './xml'

export interface SocialIconProps {
  name: SocialName
  size?: number
  color?: string
}

/**
 * Web renderer: draw the (tinted) brand glyph as a backgroundImage data URI.
 * Native uses social-icon/index.native.tsx (react-native-svg SvgXml).
 */
export function SocialIcon({ name, size = 22, color = '#ffffff' }: SocialIconProps) {
  const uri = `data:image/svg+xml,${encodeURIComponent(buildSocialSvg(name, color))}`
  return (
    <View
      // @ts-ignore — web-only CSS background properties
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${uri}")`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any}
    />
  )
}
