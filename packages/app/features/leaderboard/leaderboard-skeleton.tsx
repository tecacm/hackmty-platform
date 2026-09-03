'use client'

import { View, Text, StyleSheet, Platform } from 'react-native'
import { Skeleton } from 'moti/skeleton'
import { useTranslation } from 'app/i18n'

// Full loading view for the leaderboard — matches leaderboard-screen.tsx's content padding,
// header, white list panel and row layout so there is no layout jump when the real data
// arrives. Used both as the route's dynamic() fallback and the screen's loading state.
const CM = 'light' as const

function SkeletonRow() {
  return (
    <View style={styles.rowCard}>
      <Skeleton colorMode={CM} radius="round" width={32} height={32} />
      <Skeleton colorMode={CM} radius="round" width={40} height={40} />
      <View style={styles.nameCol}>
        <Skeleton colorMode={CM} width={'58%'} height={15} radius={4} />
        <View style={{ height: 7 }} />
        <Skeleton colorMode={CM} width={'36%'} height={11} radius={4} />
      </View>
      <View style={styles.pointsCol}>
        <Skeleton colorMode={CM} width={44} height={18} radius={4} />
        <View style={{ height: 5 }} />
        <Skeleton colorMode={CM} width={30} height={9} radius={4} />
      </View>
    </View>
  )
}

export function LeaderboardSkeleton({ count = 8 }: { count?: number }) {
  const { t } = useTranslation()
  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('leaderboard.title')}</Text>
        <Text style={styles.subtitle}>{t('leaderboard.subtitle')}</Text>
      </View>

      <View style={styles.list}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 32 : 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  header: {
    width: '100%',
    maxWidth: 640,
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
  },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '900', letterSpacing: 0.3 },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  list: {
    width: '100%',
    maxWidth: 640,
    gap: 14,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    ...Platform.select({
      web: { boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)' } as any,
      default: {
        shadowColor: '#22002c',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 5,
      },
    }),
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#eef1f5',
    ...Platform.select({
      web: { boxShadow: '0 10px 28px rgba(34, 0, 44, 0.14)' } as any,
      default: {
        shadowColor: '#22002c',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 4,
      },
    }),
  },
  nameCol: { flex: 1, minWidth: 0 },
  pointsCol: { alignItems: 'flex-end' },
})
