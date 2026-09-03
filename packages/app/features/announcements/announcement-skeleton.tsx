'use client'

import { View, Platform, StyleSheet } from 'react-native'
import { Skeleton } from 'moti/skeleton'

// Mirror the real polaroid card (announcement-card.tsx): photo on top, then role pills,
// title, message, and a footer with the author avatar. Same widths so there's no shift.
const CARD_MAX_WIDTH = Platform.OS === 'web' ? 660 : 520
const CM = 'light' as const
const TILTS = ['-1deg', '1deg', '-0.5deg', '0.8deg', '-1.2deg']

function SkeletonCard({ index }: { index: number }) {
  const rotation = TILTS[index % TILTS.length]
  return (
    <View style={[styles.polaroid, Platform.OS === 'web' && ({ transform: [{ rotate: rotation }] } as any)]}>
      {/* Tape */}
      <View style={styles.tape} />

      {/* Photo (aspect 1.33, radius 4) */}
      <View style={styles.photoFrame}>
        <Skeleton colorMode={CM} width={'100%'} height={'100%'} radius={4} />
      </View>

      {/* Caption */}
      <View style={styles.caption}>
        {/* Role pills */}
        <View style={styles.roleRow}>
          <Skeleton colorMode={CM} width={74} height={18} radius={12} />
          <Skeleton colorMode={CM} width={52} height={18} radius={12} />
        </View>

        <View style={{ height: 10 }} />
        {/* Title */}
        <Skeleton colorMode={CM} width={'66%'} height={18} radius={4} />

        <View style={{ height: 10 }} />
        {/* Message */}
        <Skeleton colorMode={CM} width={'100%'} height={12} radius={4} />
        <View style={{ height: 7 }} />
        <Skeleton colorMode={CM} width={'88%'} height={12} radius={4} />

        {/* Footer: author avatar + name / like */}
        <View style={styles.footer}>
          <View style={styles.authorInfo}>
            <Skeleton colorMode={CM} radius="round" width={32} height={32} />
            <View style={{ gap: 5 }}>
              <Skeleton colorMode={CM} width={92} height={11} radius={4} />
              <Skeleton colorMode={CM} width={60} height={9} radius={4} />
            </View>
          </View>
          <Skeleton colorMode={CM} width={52} height={24} radius={12} />
        </View>
      </View>
    </View>
  )
}

/** Skeleton placeholder for the announcements feed while it loads. */
export function AnnouncementSkeleton({ count = 2 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  polaroid: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingTop: 16,
    paddingHorizontal: Platform.OS === 'web' ? 18 : 16,
    paddingBottom: 22,
    marginVertical: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      web: { boxShadow: '0 12px 28px -8px rgba(29,4,31,0.18), 0 4px 12px rgba(0,0,0,0.06)' } as any,
      native: { shadowColor: '#1d041f', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 4 },
    }),
  },
  tape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 80,
    height: 22,
    backgroundColor: 'rgba(240,230,210,0.75)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(210,195,170,0.5)',
    zIndex: 10,
    ...Platform.select({ web: { transform: 'rotate(-2deg)' } as any }),
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1.33,
    borderRadius: 4,
    overflow: 'hidden',
  },
  caption: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(90,0,97,0.08)',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
