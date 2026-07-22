'use client'

import { Suspense } from 'react'
import { ApplicationScreen } from 'app/features/role-application/application-screen'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ApplicationScreen />
    </Suspense>
  )
}