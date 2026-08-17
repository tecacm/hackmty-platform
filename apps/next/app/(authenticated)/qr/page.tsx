'use client'

import dynamic from 'next/dynamic'
import { View, ActivityIndicator, Text } from 'react-native'

const QRScreen = dynamic(
  () => import('app/features/qr/qr-screen').then((mod) => mod.QRScreen),
  {
    ssr: false,
    loading: () => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 350, backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color="#5a0061" />
        <Text style={{ marginTop: 12, color: '#475569', fontSize: 14, fontWeight: '600' }}>Loading Official Pass...</Text>
      </View>
    ),
  }
)

export default function QRPage() {
  return <QRScreen />
}
