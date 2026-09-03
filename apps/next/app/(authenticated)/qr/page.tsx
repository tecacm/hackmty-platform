'use client'

import dynamic from 'next/dynamic'
import { QRSkeleton } from 'app/features/qr/qr-skeleton'

const QRScreen = dynamic(
  () => import('app/features/qr/qr-screen').then((mod) => mod.QRScreen),
  {
    ssr: false,
    loading: () => <QRSkeleton />,
  }
)

export default function QRPage() {
  return <QRScreen />
}
