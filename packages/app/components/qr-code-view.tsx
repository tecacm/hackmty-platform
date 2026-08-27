'use client'

import * as React from 'react'
import { View, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native'
import QRCode from 'qrcode'

interface QRCodeViewProps {
  value: string
  size?: number
  color?: string
  backgroundColor?: string
}

// Web: qrcode renders to a <canvas>-backed data URL shown in an <Image>.
function WebQRCodeView({
  value,
  size = 220,
  color = '#000000',
  backgroundColor = '#ffffff',
}: QRCodeViewProps) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true
    const textToEncode = value || 'hackmty:2026:user:guest'
    QRCode.toDataURL(textToEncode, {
      width: Math.max(320, size * 2),
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })
      .then((url: string) => {
        if (isMounted) setDataUrl(url)
      })
      .catch((err: any) => {
        console.error('QRCode generation error:', err)
      })
    return () => {
      isMounted = false
    }
  }, [value, size])

  return (
    <View style={[styles.container, { width: size + 24, height: size + 24, backgroundColor }]}>
      {dataUrl ? (
        <Image source={{ uri: dataUrl }} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <ActivityIndicator size="small" color="#5a0061" />
      )}
    </View>
  )
}

type RowSegment = { on: boolean; len: number; start: number }

// Native: there is no <canvas>, so qrcode's toDataURL()/toCanvas() throw
// "You need to specify a canvas element". Instead use the pure-JS create() to compute
// the module matrix and render it with Views (runs of same-colored modules per row are
// merged into a single View to keep the view count and sub-pixel seams down).
function NativeQRCodeView({
  value,
  size = 220,
  color = '#000000',
  backgroundColor = '#ffffff',
}: QRCodeViewProps) {
  const qr = React.useMemo(() => {
    const text = value || 'hackmty:2026:user:guest'
    try {
      const created = QRCode.create(text, { errorCorrectionLevel: 'H' })
      const count = created.modules.size
      const data = created.modules.data
      const rows: RowSegment[][] = []
      for (let r = 0; r < count; r++) {
        const segments: RowSegment[] = []
        let c = 0
        while (c < count) {
          const on = !!data[r * count + c]
          let len = 1
          while (c + len < count && !!data[r * count + c + len] === on) len++
          segments.push({ on, len, start: c })
          c += len
        }
        rows.push(segments)
      }
      return { count, rows }
    } catch (e) {
      console.error('QRCode generation error:', e)
      return null
    }
  }, [value])

  const cellSize = qr ? Math.max(1, Math.floor(size / qr.count)) : 0
  const gridSize = qr ? cellSize * qr.count : size

  return (
    <View style={[styles.container, { width: gridSize + 24, height: gridSize + 24, backgroundColor }]}>
      {qr ? (
        <View style={{ width: gridSize, height: gridSize }}>
          {qr.rows.map((segments, r) => (
            <View key={r} style={{ flexDirection: 'row', height: cellSize }}>
              {segments.map((seg) => (
                <View
                  key={seg.start}
                  style={{
                    width: seg.len * cellSize,
                    height: cellSize,
                    backgroundColor: seg.on ? color : backgroundColor,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function QRCodeView(props: QRCodeViewProps) {
  // Branch in one file so there is no platform-specific file to resolve — the QR
  // screen already imports this module, so the correct renderer is guaranteed on reload.
  return Platform.OS === 'web' ? <WebQRCodeView {...props} /> : <NativeQRCodeView {...props} />
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
