'use client'

import { View, StyleSheet } from 'react-native'
import { Skeleton } from 'moti/skeleton'

// Mirrors a UserDirectoryTab userCard: name + role pill, email, ID, badges row, and the
// edit/award/reset action buttons.
const CM = 'light' as const

function RowSkeleton() {
  return (
    <View style={styles.userCard}>
      <View style={styles.userHeaderRow}>
        <View style={styles.userMainInfo}>
          <View style={styles.nameRow}>
            <Skeleton colorMode={CM} width={170} height={18} radius={4} />
            <Skeleton colorMode={CM} width={64} height={18} radius={6} />
          </View>
          <View style={{ height: 8 }} />
          <Skeleton colorMode={CM} width={'55%'} height={13} radius={4} />
          <View style={{ height: 6 }} />
          <Skeleton colorMode={CM} width={'42%'} height={10} radius={4} />
          <View style={{ height: 12 }} />
          <View style={styles.badgesRow}>
            <Skeleton colorMode={CM} radius="round" width={26} height={26} />
            <Skeleton colorMode={CM} radius="round" width={26} height={26} />
            <Skeleton colorMode={CM} radius="round" width={26} height={26} />
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Skeleton colorMode={CM} width={72} height={36} radius={10} />
          <Skeleton colorMode={CM} width={84} height={36} radius={10} />
          <Skeleton colorMode={CM} width={96} height={36} radius={10} />
        </View>
      </View>
    </View>
  )
}

/** Skeleton placeholder for the user directory while it loads. */
export function UserDirectorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { width: '100%', gap: 14 },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  userHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  userMainInfo: { flex: 1, minWidth: 200 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badgesRow: { flexDirection: 'row', gap: 10 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
})
