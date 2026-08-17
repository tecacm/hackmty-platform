'use client'

import * as React from 'react'
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native'
import QRCode from 'qrcode'

interface QRCodeViewProps {
  value: string
  size?: number
  color?: string
  backgroundColor?: string
}

export function QRCodeView({
  value,
  size = 220,
  color = '#000000',
  backgroundColor = '#ffffff',
}: QRCodeViewProps) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true
    const textToEncode = value || 'hackmty:2026:user:guest'

    // High-contrast pure black modules with ISO Level H error correction (30% recovery!)
    QRCode.toDataURL(textToEncode, {
      width: Math.max(320, size * 2),
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) setDataUrl(url)
      })
      .catch((err) => {
        console.error('QRCode generation error:', err)
      })

    return () => {
      isMounted = false
    }
  }, [value, size])

  return (
    <View
      style={[
        styles.container,
        {
          width: size + 24,
          height: size + 24,
          backgroundColor: backgroundColor,
        },
      ]}
    >
      {dataUrl ? (
        <Image
          source={{ uri: dataUrl }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      ) : (
        <ActivityIndicator size="small" color="#5a0061" />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
})
