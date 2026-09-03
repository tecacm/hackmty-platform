'use client'

import { View, StyleSheet, Platform } from 'react-native'
import { Skeleton } from 'moti/skeleton'

// Mirrors the "has team" innerCard in teams-screen.tsx: title + subtitle, team-code row,
// divider, members section header, and a few member rows (avatar + name + status pill).
const CM = 'light' as const

function MemberRow() {
  return (
    <View style={styles.memberRow}>
      <Skeleton colorMode={CM} radius="round" width={38} height={38} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton colorMode={CM} width={'55%'} height={13} radius={4} />
        <Skeleton colorMode={CM} width={'34%'} height={10} radius={4} />
      </View>
      <Skeleton colorMode={CM} width={74} height={22} radius={11} />
    </View>
  )
}

export function TeamSkeleton() {
  return (
    <View style={styles.innerCard}>
      {/* Title + subtitle (centered) */}
      <Skeleton colorMode={CM} width={200} height={26} radius={6} />
      <View style={{ height: 12 }} />
      <Skeleton colorMode={CM} width={260} height={13} radius={4} />
      <View style={{ height: 24 }} />

      {/* Team code */}
      <Skeleton colorMode={CM} width={92} height={11} radius={4} />
      <View style={{ height: 10 }} />
      <View style={styles.codeRow}>
        <Skeleton colorMode={CM} width={150} height={46} radius={10} />
        <Skeleton colorMode={CM} width={74} height={46} radius={8} />
      </View>

      <View style={styles.divider} />

      {/* Members section */}
      <View style={styles.sectionHeader}>
        <Skeleton colorMode={CM} width={150} height={18} radius={4} />
      </View>
      <MemberRow />
      <MemberRow />
      <MemberRow />
    </View>
  )
}

const styles = StyleSheet.create({
  innerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      },
      web: { boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)' } as any,
    }),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(34, 0, 44, 0.08)',
    width: '100%',
    marginVertical: 24,
  },
  sectionHeader: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 0, 44, 0.06)',
    width: '100%',
  },
})
