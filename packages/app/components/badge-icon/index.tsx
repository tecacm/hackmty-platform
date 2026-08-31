'use client'

import * as React from 'react'
import { View } from 'react-native'

export interface BadgeIconProps {
  /** Public URL of the badge's silhouette SVG. */
  svgUrl?: string | null
  /** Tint color applied to the silhouette. */
  color?: string
  size?: number
}

/**
 * Web renderer: tint a single-color silhouette SVG by using it as a CSS mask and
 * painting the color as the background. This colors the SVG by its alpha shape, so it
 * works regardless of the file's internal fills. Native uses badge-icon/index.native.tsx.
 */
export function BadgeIcon({ svgUrl, color = '#c2b75f', size = 40 }: BadgeIconProps) {
  if (!svgUrl) return null
  const maskValue = `url("${svgUrl}") center / contain no-repeat`
  return (
    <View
      // @ts-ignore — web-only CSS mask properties
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        maskImage: `url("${svgUrl}")`,
        WebkitMaskImage: `url("${svgUrl}")`,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        // shorthand fallback for browsers that prefer it
        mask: maskValue,
        WebkitMask: maskValue,
      } as any}
    />
  )
}
