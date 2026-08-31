'use client'

import dynamic from 'next/dynamic'
import { View, ActivityIndicator } from 'react-native'

const LeaderboardScreen = dynamic(
  () => import('app/features/leaderboard/leaderboard-screen').then((mod) => mod.LeaderboardScreen),
  {
    ssr: false,
    loading: () => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 350, backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    ),
  }
)

export default function LeaderboardPage() {
  return <LeaderboardScreen />
}
