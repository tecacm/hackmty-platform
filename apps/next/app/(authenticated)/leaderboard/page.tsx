'use client'

import dynamic from 'next/dynamic'
import { LeaderboardSkeleton } from 'app/features/leaderboard/leaderboard-skeleton'

const LeaderboardScreen = dynamic(
  () => import('app/features/leaderboard/leaderboard-screen').then((mod) => mod.LeaderboardScreen),
  {
    ssr: false,
    loading: () => <LeaderboardSkeleton count={8} />,
  }
)

export default function LeaderboardPage() {
  return <LeaderboardScreen />
}
