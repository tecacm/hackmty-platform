import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, StyleSheet, Text, Platform, AppState } from 'react-native'
import type { AppStateStatus } from 'react-native'
import { SolitoImage } from 'solito/image'

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
  /** Pass false when the parent screen is not focused (tab switch, navigation) */
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

// ─────────────────────────────────────────────────────────────────────────────
// expo-av fallback component
// ─────────────────────────────────────────────────────────────────────────────
let ExpoAVVideo: any = null
try {
  const expoAV = require('expo-av')
  ExpoAVVideo = expoAV.Video
} catch (_) {}

function ExpoAVVideoComponent({
  url,
  style,
  resizeMode = 'cover',
  controls = false,
  paused = false,
  muted = true,
  screenFocused = true,
}: {
  url: string
  style: any
  resizeMode?: 'cover' | 'contain'
  controls?: boolean
  paused?: boolean
  muted?: boolean
  screenFocused?: boolean
}) {
  const avRef = useRef<any>(null)
  const isPreview = !controls
  const shouldBeSilent = isPreview || muted || paused || !screenFocused
  const shouldPlay = !paused && screenFocused

  // Force-stop + unload on unmount
  useEffect(() => {
    return () => {
      const ref = avRef.current
      if (!ref) return
      try {
        ref.setStatusAsync({ shouldPlay: false, isMuted: true, volume: 0 }).catch(() => {})
        ref.unloadAsync().catch(() => {})
      } catch (_) {}
    }
  }, [])

  // Respond to paused / muted / focus changes
  useEffect(() => {
    const ref = avRef.current
    if (!ref) return
    try {
      ref.setStatusAsync({
        shouldPlay,
        isMuted: shouldBeSilent,
        volume: shouldBeSilent ? 0 : 1.0,
      }).catch(() => {})
    } catch (_) {}
  }, [shouldPlay, shouldBeSilent])

  return (
    <View style={[style, { overflow: 'hidden' }]} pointerEvents={controls ? 'auto' : 'none'}>
      <ExpoAVVideo
        ref={avRef}
        source={{ uri: url }}
        style={StyleSheet.absoluteFill}
        useNativeControls={controls}
        resizeMode={resizeMode === 'contain' ? 'contain' : 'cover'}
        isLooping
        isMuted={shouldBeSilent}
        volume={shouldBeSilent ? 0 : 1.0}
        shouldPlay={shouldPlay}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// expo-video component using createVideoPlayer with mount-scoped lifecycle
// ─────────────────────────────────────────────────────────────────────────────
let ExpoVideoViewNative: any = null
let createExpoVideoPlayer: any = null
try {
  const expoVideo = require('expo-video')
  ExpoVideoViewNative = expoVideo.VideoView
  createExpoVideoPlayer = expoVideo.createVideoPlayer
} catch (_) {}

function ExpoVideoNativeComponent({
  url,
  style,
  resizeMode = 'cover',
  controls = false,
  paused = false,
  muted = true,
  screenFocused = true,
}: {
  url: string
  style: any
  resizeMode?: 'cover' | 'contain'
  controls?: boolean
  paused?: boolean
  muted?: boolean
  screenFocused?: boolean
}) {
  const isPreview = !controls
  const contentFit = resizeMode === 'contain' ? 'contain' : 'cover'
  const [player, setPlayer] = useState<any>(null)

  // Re-create player on mount/url change, and explicitly kill + release native player on unmount.
  // This prevents background audio leaks when modals close while ensuring clean re-instantiation on tab remounts.
  useEffect(() => {
    if (!url) return
    const source = typeof url === 'string' ? { uri: url, useCaching: true } : url
    const p = createExpoVideoPlayer(source)
    try {
      p.loop = true
      p.muted = isPreview || muted
      p.volume = (isPreview || muted) ? 0 : 1.0
    } catch (_) {}
    setPlayer(p)

    return () => {
      try {
        p.pause()
      } catch (_) {}
      try {
        p.muted = true
        p.volume = 0
      } catch (_) {}
      try {
        p.replace(null)
      } catch (_) {}
      try {
        p.release()
      } catch (_) {}
      setPlayer(null)
    }
  }, [url])

  // Compute effective states
  const shouldBeSilent = isPreview || muted || paused || !screenFocused
  const shouldPlay = !paused && screenFocused

  // Sync playback state whenever props change
  useEffect(() => {
    if (!player) return
    try {
      player.muted = shouldBeSilent
      player.volume = shouldBeSilent ? 0 : 1.0
      if (shouldPlay) {
        player.play()
      } else {
        player.pause()
      }
    } catch (_) {}
  }, [shouldPlay, shouldBeSilent, player])

  // AppState listener: pause when app goes to background
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (!player) return
      try {
        if (state !== 'active') {
          player.muted = true
          player.volume = 0
          player.pause()
        }
      } catch (_) {}
    }
    const sub = AppState.addEventListener('change', handleAppState)
    return () => sub?.remove()
  }, [player])

  if (!player) return null

  return (
    <View style={[style, { overflow: 'hidden' }]} pointerEvents={controls ? 'auto' : 'none'}>
      <ExpoVideoViewNative
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={controls}
        contentFit={contentFit}
        allowsFullscreen={controls}
        showsTimecodes={controls}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector: choose the right video implementation
// ─────────────────────────────────────────────────────────────────────────────
function VideoComponent(props: {
  url: string
  style: any
  resizeMode?: 'cover' | 'contain'
  controls?: boolean
  paused?: boolean
  muted?: boolean
  screenFocused?: boolean
}) {
  if (ExpoVideoViewNative && createExpoVideoPlayer) {
    return <ExpoVideoNativeComponent {...props} />
  }
  if (ExpoAVVideo) {
    return <ExpoAVVideoComponent {...props} />
  }
  return (
    <View style={[styles.nativeVideoBox, props.style]} pointerEvents="none">
      <Text style={styles.videoIcon}>🎥</Text>
      <Text style={styles.videoLabel}>MP4 Video Attachment</Text>
      <Text style={styles.videoSubtext}>Run: npx expo install expo-video</Text>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────
export function AnnouncementMedia({
  url,
  mediaType,
  style,
  resizeMode = 'cover',
  controls = true,
  muted = true,
  paused = false,
  screenFocused = true,
}: AnnouncementMediaProps) {
  const isVideo = isVideoFile(url, mediaType)

  if (isVideo) {
    return (
      <VideoComponent
        url={url}
        style={style}
        resizeMode={resizeMode}
        controls={controls}
        paused={paused}
        muted={muted}
        screenFocused={screenFocused}
      />
    )
  }

  const contentFit = resizeMode === 'contain' ? 'contain' : 'cover'
  return (
    <SolitoImage
      src={url}
      style={style}
      contentFit={contentFit}
      alt=""
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
  videoSubtext: {
    color: '#c2b75f',
    fontSize: 11,
    marginTop: 4,
  },
})
