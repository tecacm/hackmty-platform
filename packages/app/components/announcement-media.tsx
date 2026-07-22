import React, { useRef, useEffect } from 'react'
import { View, Image, StyleSheet, Platform, Text } from 'react-native'

interface AnnouncementMediaProps {
  url: string
  mediaType?: 'image' | 'video' | null
  style?: any
  resizeMode?: 'cover' | 'contain'
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  paused?: boolean
  /** Unused on web — browser handles audio natively. Matches native interface. */
  screenFocused?: boolean
}

export function isVideoFile(url?: string | null, mediaType?: string | null): boolean {
  if (mediaType === 'video') return true
  if (!url) return false
  const cleanUrl = url.toLowerCase().split('?')[0] || ''
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.m4v')
  )
}

export function AnnouncementMedia({
  url,
  mediaType,
  style,
  resizeMode = 'cover',
  controls = true,
  autoPlay = true,
  muted = true,
  loop = true,
  paused = false,
}: AnnouncementMediaProps) {
  const isVideo = isVideoFile(url, mediaType)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current) {
      if (paused) {
        videoRef.current.pause()
      } else if (autoPlay) {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [paused, autoPlay])

  if (isVideo) {
    if (Platform.OS === 'web') {
      return (
        <View style={[style, { overflow: 'hidden' }]} pointerEvents={controls ? 'auto' : 'none'}>
          <video
            ref={videoRef}
            src={url}
            controls={controls}
            autoPlay={autoPlay && !paused}
            muted={muted}
            loop={loop}
            playsInline
            preload="auto"
            style={{
              width: '100%',
              height: '100%',
              objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
              borderRadius: style?.borderRadius || 0,
              backgroundColor: '#000000',
              pointerEvents: controls ? 'auto' : 'none',
            }}
          />
        </View>
      )
    }

    // Native platform video container
    return (
      <View style={[styles.nativeVideoBox, style]} pointerEvents={controls ? 'auto' : 'none'}>
        <Text style={styles.videoIcon}>🎥</Text>
        <Text style={styles.videoLabel}>MP4 Video Attachment</Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: url }}
      style={style}
      resizeMode={resizeMode}
    />
  )
}

const styles = StyleSheet.create({
  nativeVideoBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f0212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  videoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  videoLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
})
