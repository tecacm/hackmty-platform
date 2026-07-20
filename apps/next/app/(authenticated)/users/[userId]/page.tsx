'use client'

import { Suspense } from 'react'
import { UserDetailScreen } from 'app/features/user/detail-screen'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UserDetailScreen />
    </Suspense>
  )
}

