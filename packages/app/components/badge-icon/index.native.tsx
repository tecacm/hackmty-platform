import * as React from 'react'
import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'

export interface BadgeIconProps {
  svgUrl?: string | null
  color?: string
  size?: number
}

// Small in-memory cache so the same SVG isn't re-fetched for every render/row.
const svgCache = new Map<string, string>()

/**
 * Native renderer: fetch the SVG, force its fills/strokes to `currentColor`, then render
 * with react-native-svg's SvgXml passing `color` — tinting the whole silhouette. Mirrors
 * the web CSS-mask approach in badge-icon/index.tsx.
 */
export function BadgeIcon({ svgUrl, color = '#c2b75f', size = 40 }: BadgeIconProps) {
  const [xml, setXml] = React.useState<string | null>(() => (svgUrl ? svgCache.get(svgUrl) ?? null : null))

  React.useEffect(() => {
    if (!svgUrl) {
      setXml(null)
      return
    }
    const cached = svgCache.get(svgUrl)
    if (cached) {
      setXml(cached)
      return
    }
    let mounted = true
    fetch(svgUrl)
      .then((r) => r.text())
      .then((text) => {
        // Recolor: any concrete fill/stroke becomes currentColor (skip "none"), so the
        // SvgXml `color` prop tints the whole shape.
        const recolored = text
          .replace(/fill="(?!none")[^"]*"/gi, 'fill="currentColor"')
          .replace(/stroke="(?!none")[^"]*"/gi, 'stroke="currentColor"')
        svgCache.set(svgUrl, recolored)
        if (mounted) setXml(recolored)
      })
      .catch(() => {
        if (mounted) setXml(null)
      })
    return () => {
      mounted = false
    }
  }, [svgUrl])

  if (!xml) return <View style={{ width: size, height: size }} />
  return <SvgXml xml={xml} width={size} height={size} color={color} />
}
