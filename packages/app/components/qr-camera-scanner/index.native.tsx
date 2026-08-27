import React, { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { AppIcon } from '../app-icon'

interface QRCameraScannerProps {
  onScan: (data: string) => void
  isProcessing?: boolean
}

export function QRCameraScanner({ onScan, isProcessing = false }: QRCameraScannerProps) {
  const [active, setActive] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  // Debounce so a QR held in frame doesn't fire onScan on every camera frame.
  const lastScan = useRef<{ value: string; at: number }>({ value: '', at: 0 })

  const handleToggle = async () => {
    if (!active) {
      if (!permission?.granted) {
        const res = await requestPermission()
        if (!res?.granted) return
      }
    }
    setActive((a) => !a)
  }

  const handleBarcode = ({ data }: { data: string }) => {
    if (!data || isProcessing) return
    const now = Date.now()
    if (data === lastScan.current.value && now - lastScan.current.at < 2500) return
    lastScan.current = { value: data, at: now }
    onScan(data)
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={handleToggle} style={styles.startBtn}>
        <AppIcon name="camera.fill" size={20} color="#ffffff" />
        <Text style={styles.startBtnText}>{active ? 'Close Scanner' : 'Open Camera Scanner'}</Text>
      </Pressable>

      {active &&
        (permission?.granted ? (
          <View style={styles.viewfinder}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcode}
            />
            <View style={styles.reticle} pointerEvents="none" />
            {isProcessing && (
              <View style={styles.processingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.nativeCard}>
            <Text style={styles.nativeText}>
              Camera permission is required to scan attendee QR badges.
            </Text>
            <Pressable onPress={() => requestPermission()} style={styles.permBtn}>
              <Text style={styles.permBtnText}>Grant Camera Access</Text>
            </Pressable>
          </View>
        ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5a0061',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  viewfinder: {
    marginTop: 10,
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reticle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginTop: -90,
    marginLeft: -90,
    borderWidth: 3,
    borderColor: 'rgba(194, 183, 95, 0.9)',
    borderRadius: 16,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  nativeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 10,
  },
  nativeText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: '#5a0061',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  permBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
})
