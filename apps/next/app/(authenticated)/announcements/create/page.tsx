'use client'

import { Suspense } from 'react'
import { CreateAnnouncementScreen } from 'app/features/announcements/create-announcement-screen'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CreateAnnouncementScreen />
    </Suspense>
  )
}
