'use client'

import { Suspense } from 'react'
import { ApplicationScreen } from 'app/features/home/application-screen'

export default function ApplicationPage() {
  return (
    <Suspense>
      <ApplicationScreen />
    </Suspense>
  )
}
