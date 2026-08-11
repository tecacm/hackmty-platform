'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { AppIcon } from '../app-icon'
let jsQRModule: any = null
try {
  jsQRModule = require('jsqr')
  if (jsQRModule && jsQRModule.default) {
    jsQRModule = jsQRModule.default
  }
} catch (e) {
  // Gracefully fallback to BarcodeDetector or manual QR input
}

interface QRCameraScannerProps {
  onScan: (data: string) => void
  isProcessing?: boolean
}

export function QRCameraScanner({ onScan, isProcessing = false }: QRCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestRef = useRef<number | null>(null)
  const lastScannedCode = useRef<string | null>(null)
  const lastScanTime = useRef<number>(0)

  const stopCamera = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsActive(false)
  }, [])

  const scanFrame = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video) return

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // 1. Try native browser BarcodeDetector API (fastest, standard in Chrome/Safari Mac)
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await detector.detect(video)
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue
            if (raw) {
              const now = Date.now()
              if (raw !== lastScannedCode.current || now - lastScanTime.current > 2000) {
                lastScannedCode.current = raw
                lastScanTime.current = now
                onScan(raw)
              }
            }
          }
        } catch (e) {
          // Fall through to jsQR fallback
        }
      } else if (canvas && jsQRModule) {
        // 2. jsQR Canvas fallback
        canvas.height = video.videoHeight
        canvas.width = video.videoWidth
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQRModule(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })

          if (code && code.data) {
            const now = Date.now()
            if (code.data !== lastScannedCode.current || now - lastScanTime.current > 2000) {
              lastScannedCode.current = code.data
              lastScanTime.current = now
              onScan(code.data)
            }
          }
        }
      }
    }

    requestRef.current = requestAnimationFrame(scanFrame)
  }, [onScan])

  const startCamera = async () => {
    setErrorMsg(null)
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg('Camera access is not available in this browser environment.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setIsActive(true)
    } catch (err: any) {
      console.error('Camera permission or device error:', err)
      setErrorMsg(err?.message || 'Permission denied or no camera device found. Please allow browser camera permissions.')
      stopCamera()
    }
  }

  useEffect(() => {
    if (isActive && streamRef.current && videoRef.current) {
      const video = videoRef.current
      if ('srcObject' in video) {
        video.srcObject = streamRef.current
      } else {
        ;(video as any).src = URL.createObjectURL(streamRef.current as any)
      }
      video.setAttribute('playsinline', 'true')
      video.play().catch((e) => console.error('Video play error:', e))
      requestRef.current = requestAnimationFrame(scanFrame)
    }
  }, [isActive, scanFrame])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <View style={styles.container}>
      {!isActive ? (
        <Pressable onPress={startCamera} style={styles.startBtn}>
          <AppIcon name="camera.fill" size={20} color="#ffffff" />
          <Text style={styles.startBtnText}>Open Camera Scanner (Mac & Web)</Text>
        </Pressable>
      ) : (
        <View style={styles.scannerCard}>
          <View style={styles.scannerHeader}>
            <View style={styles.recordingRow}>
              <View style={styles.recordingDot} />
              <Text style={styles.scannerTitle}>LIVE WEBCAM SCANNING</Text>
            </View>
            <Pressable onPress={stopCamera} style={styles.stopBtn}>
              <Text style={styles.stopBtnText}>Turn Off Camera</Text>
            </Pressable>
          </View>

          <View style={styles.viewfinderBox}>
            {Platform.OS === 'web' && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  maxHeight: '440px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#000000',
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Target Square Reticle Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 20,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Instruction Pill Banner at Top */}
                  <div
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Align attendee QR pass inside target square
                  </div>

                  {/* Centered Target Reticle Square with Cutout Vignette */}
                  <div
                    style={{
                      width: '210px',
                      height: '210px',
                      position: 'relative',
                      borderRadius: '20px',
                      border: '2px dashed rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {/* Corner Brackets */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        left: '-3px',
                        width: '26px',
                        height: '26px',
                        borderTop: '4px solid #c2b75f',
                        borderLeft: '4px solid #c2b75f',
                        borderTopLeftRadius: '10px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        width: '26px',
                        height: '26px',
                        borderTop: '4px solid #c2b75f',
                        borderRight: '4px solid #c2b75f',
                        borderTopRightRadius: '10px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-3px',
                        left: '-3px',
                        width: '26px',
                        height: '26px',
                        borderBottom: '4px solid #c2b75f',
                        borderLeft: '4px solid #c2b75f',
                        borderBottomLeftRadius: '10px',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-3px',
                        right: '-3px',
                        width: '26px',
                        height: '26px',
                        borderBottom: '4px solid #c2b75f',
                        borderRight: '4px solid #c2b75f',
                        borderBottomRightRadius: '10px',
                      }}
                    />

                    {/* Scanning Laser Line */}
                    <div
                      style={{
                        width: '85%',
                        height: '2px',
                        backgroundColor: '#c2b75f',
                        boxShadow: '0 0 10px #c2b75f, 0 0 20px #c2b75f',
                      }}
                    />
                  </div>

                  {/* Bottom Spacer */}
                  <div style={{ height: '10px' }} />
                </div>
              </div>
            )}

            {isProcessing && (
              <View style={styles.overlayProcessing}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.overlayProcessingText}>Processing Pass...</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
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
    borderWidth: 1,
    borderColor: '#5a0061',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  scannerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: '#5a0061',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stopBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stopBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  viewfinderBox: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    height: 320,
    backgroundColor: '#000000',
  },
  reticleOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetSquareFrame: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#c2b75f',
  },
  bracketTL: {
    top: -3,
    left: -3,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  bracketTR: {
    top: -3,
    right: -3,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bracketBL: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bracketBR: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLaserLine: {
    width: '85%',
    height: 2,
    backgroundColor: '#c2b75f',
    shadowColor: '#c2b75f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  scanInstructionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    letterSpacing: 0.5,
  },
  overlayProcessing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  overlayProcessingText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
})
