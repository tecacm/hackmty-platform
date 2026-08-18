import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { AppIcon } from '../app-icon'

interface QRCameraScannerProps {
  onScan: (data: string) => void
  isProcessing?: boolean
}

export function QRCameraScanner({ onScan, isProcessing = false }: QRCameraScannerProps) {
  const [active, setActive] = useState(false)

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setActive(!active)} style={styles.startBtn}>
        <AppIcon name="camera.fill" size={20} color="#ffffff" />
        <Text style={styles.startBtnText}>
          {active ? 'Hide Native Camera Viewfinder' : 'Open Camera Scanner'}
        </Text>
      </Pressable>
      {active && (
        <View style={styles.nativeCard}>
          <Text style={styles.nativeText}>
            Point your mobile camera at the attendee's QR event badge or enter their User ID below.
          </Text>
        </View>
      )}
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
  nativeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nativeText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
})
