'use client'

import { View, StyleSheet } from 'react-native'
import { Skeleton } from 'moti/skeleton'

// Mirrors ApplicationRow.tsx: white card with name/email, type/country/university, and a
// status column — shown while the applications dashboard loads.
const CM = 'light' as const

function RowSkeleton() {
  return (
    <View style={styles.appCard}>
      <View style={styles.appHeaderRow}>
        <View style={styles.mainInfo}>
          <Skeleton colorMode={CM} width={'70%'} height={16} radius={4} />
          <View style={{ height: 6 }} />
          <Skeleton colorMode={CM} width={'50%'} height={13} radius={4} />
        </View>

        <View style={styles.subInfo}>
          <View style={styles.tagRow}>
            <Skeleton colorMode={CM} width={54} height={18} radius={6} />
            <Skeleton colorMode={CM} width={44} height={13} radius={4} />
          </View>
          <View style={{ height: 6 }} />
          <Skeleton colorMode={CM} width={'60%'} height={12} radius={4} />
        </View>

        <View style={styles.statusInfo}>
          <Skeleton colorMode={CM} width={82} height={24} radius={12} />
        </View>
      </View>
    </View>
  )
}

/** Skeleton placeholder for the applications (submissions) list while it loads. */
export function SubmissionsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { width: '100%', gap: 12 },
  appCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  mainInfo: { flex: 2, minWidth: 200 },
  subInfo: { flex: 2, minWidth: 200 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
})
