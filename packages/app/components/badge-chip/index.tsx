'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native'
import { BadgeIcon } from 'app/components/badge-icon'

export interface BadgeChipProps {
  iconUrl: string | null
  color?: string
  size?: number
  /** Localized badge name (tooltip title + optional label). */
  name?: string
  /** Localized badge description (tooltip body). */
  description?: string
  /** Show the name as a label under the icon. */
  showLabel?: boolean
  /** Wrap the icon in a circular ring (used for the profile badge grid). */
  ring?: boolean
}

/**
 * A single badge silhouette with a tooltip (name + description) shown on hover (web)
 * or tap (native). Shared by the leaderboard, profile, and admin views so badge
 * presentation stays consistent.
 */
export function BadgeChip({ iconUrl, color = '#c2b75f', size = 34, name, description, showLabel, ring }: BadgeChipProps) {
  const [show, setShow] = React.useState(false)
  const hasTip = Boolean(name || description)

  const ringPad = 36
  const visual = ring ? size + ringPad : size
  const tooltipBottom = visual + (showLabel && name ? 18 : 0) + 8

  return (
    <View style={[styles.wrap, show && styles.wrapRaised]}>
      <Pressable
        onHoverIn={() => setShow(true)}
        onHoverOut={() => setShow(false)}
        onPress={() => hasTip && setShow((s) => !s)}
        style={styles.iconWrap}
      >
        {ring ? (
          <View style={[styles.ring, { width: visual, height: visual, borderRadius: visual / 2 }]}>
            <BadgeIcon svgUrl={iconUrl} color={color} size={size} />
          </View>
        ) : (
          <BadgeIcon svgUrl={iconUrl} color={color} size={size} />
        )}
        {showLabel && name ? (
          <Text style={[styles.label, { maxWidth: Math.max(visual + 24, 56) }]} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
      </Pressable>

      {hasTip && show ? (
        <View style={[styles.tooltip, { bottom: tooltipBottom }]} pointerEvents="none">
          {name ? <Text style={styles.tipName}>{name}</Text> : null}
          {description ? <Text style={styles.tipDesc}>{description}</Text> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    ...Platform.select({ web: { zIndex: 0 } as any }),
  },
  wrapRaised: { ...Platform.select({ web: { zIndex: 50 } as any }) },
  iconWrap: { alignItems: 'center', gap: 10 },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: '#f8fafc',
    marginBottom: 10
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    left: '50%',
    marginLeft: -100,
    width: 200,
    backgroundColor: '#f1efef',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    zIndex: 60,
    ...Platform.select({ web: { boxShadow: '0 8px 24px rgba(0,0,0,0.28)' } as any }),
  },
  tipName: { color: '#1f1f1f', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  tipDesc: { color: '#343434', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2, lineHeight: 15 },
})
