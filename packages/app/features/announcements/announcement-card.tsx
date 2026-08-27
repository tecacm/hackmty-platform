import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Platform, Pressable, Modal, Animated, Image, Dimensions, useWindowDimensions } from 'react-native'
import { PersonSilhouette } from 'app/components/person-silhouette'
import { AnnouncementMedia } from 'app/components/announcement-media'
import type { AnnouncementItem } from 'app/hooks/use-announcements'

interface AnnouncementCardProps {
  announcement: AnnouncementItem
  index?: number
  isLiked?: boolean
  onLike?: (id: string) => void
  /** False when the parent screen loses navigation focus (tab switch) */
  screenFocused?: boolean
}

import { AppIcon } from 'app/components/app-icon'
import { useTranslation } from 'app/i18n'
import { getLocalizedText } from 'app/utils/i18n-helpers'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'

function formatRelativeTime(dateString: string, t: (k: string, p?: any) => string): string {
  try {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return t('announcements.justNow')
    if (diffMins < 60) return t('announcements.minutesAgo', [diffMins])
    if (diffHours < 24) return t('announcements.hoursAgo', [diffHours])
    if (diffDays === 1) return t('announcements.yesterday')
    if (diffDays < 7) return t('announcements.daysAgo', [diffDays])
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch (e) {
    return t('announcements.recently')
  }
}

export const AnnouncementCard = React.memo(function AnnouncementCard({
  announcement,
  index = 0,
  isLiked = false,
  onLike,
  screenFocused = true,
}: AnnouncementCardProps) {
  const { t, locale } = useTranslation()
  const { hasPermission } = useUserPermissions()
  const { navigateTo } = useSmartNavigate()
  const { width } = useWindowDimensions()
  const isSmallScreen = width > 0 && width < 640
  const canEdit = hasPermission('announcements', 'create')
  const [liked, setLiked] = useState(isLiked)
  const [likesCount, setLikesCount] = useState(announcement.likes_count || 0)
  const [fullscreenVisible, setFullscreenVisible] = useState(false)
  const [modalMediaMounted, setModalMediaMounted] = useState(false)

  // Automatic Viewport Visibility Observer (Native & Web)
  // Pauses video playback when card is scrolled outside the visible screen frame
  const [isInView, setIsInView] = useState(true)
  const containerRef = useRef<View>(null)

  useEffect(() => {
    if (!screenFocused) {
      setIsInView(false)
      return
    }

    if (Platform.OS === 'web') {
      const node = containerRef.current as any
      if (typeof window !== 'undefined' && 'IntersectionObserver' in window && node) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            setIsInView(entry?.isIntersecting ?? true)
          },
          { threshold: 0.15 }
        )
        observer.observe(node)
        return () => observer.disconnect()
      }
    } else {
      let isMounted = true
      const windowHeight = Dimensions.get('window').height

      const checkVisibility = () => {
        if (!isMounted || !containerRef.current) return
        containerRef.current.measureInWindow((_x, y, _width, height) => {
          if (!isMounted) return
          // Card is visible if any part overlaps viewport bounds
          const visible = y + height >= -40 && y <= windowHeight + 40
          setIsInView(visible)
        })
      }

      checkVisibility()
      const interval = setInterval(checkVisibility, 400)
      return () => {
        isMounted = false
        clearInterval(interval)
      }
    }
  }, [screenFocused])

  const openFullscreen = () => {
    setModalMediaMounted(true)
    setFullscreenVisible(true)
  }

  const closeFullscreen = () => {
    setModalMediaMounted(false)
    setTimeout(() => {
      setFullscreenVisible(false)
    }, 50)
  }

  const scaleAnim = useRef(new Animated.Value(0.85)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (fullscreenVisible) {
      scaleAnim.setValue(0.85)
      opacityAnim.setValue(0)
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start()
    }
  }, [fullscreenVisible, scaleAnim, opacityAnim])

  useEffect(() => {
    setLiked(isLiked)
  }, [isLiked])

  useEffect(() => {
    setLikesCount(announcement.likes_count || 0)
  }, [announcement.likes_count])

  // Subtle alternating polaroid tilt effect (-1deg to 1deg)
  const tilts = ['-1deg', '1deg', '-0.5deg', '0.8deg', '-1.2deg']
  const rotation = tilts[index % tilts.length]

  const handleLikePress = () => {
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikesCount(prev => (nextLiked ? prev + 1 : Math.max(0, prev - 1)))
    onLike?.(announcement.id)
  }

  const targetRoles = announcement.target_roles || ['all']

  return (
    <>
      <View
        ref={containerRef}
        style={[
          styles.polaroidContainer,
          Platform.OS === 'web' && ({ transform: [{ rotate: rotation }] } as any),
        ]}
      >
        {/* Top Tape Graphic Element */}
        <View style={styles.topTape} />

        {/* Photo Frame Section (Cropped to Uniform Aspect Ratio) */}
        <Pressable
          onPress={() => {
            if (announcement.media_url) openFullscreen()
          }}
          style={({ hovered }: any) => [
            styles.photoFramePressable,
            hovered && announcement.media_url && styles.photoFrameHovered,
          ]}
        >
          <View style={styles.photoFrame}>
            {announcement.media_url ? (
              <>
                <AnnouncementMedia
                  url={announcement.media_url}
                  mediaType={announcement.media_type}
                  style={styles.photoImage}
                  resizeMode="cover"
                  controls={false}
                  autoPlay={true}
                  muted={true}
                  loop={true}
                  paused={false}
                  screenFocused={screenFocused && isInView}
                />
                <View style={styles.expandBadge}>
                  <AppIcon
                    name="arrow.up.left.and.arrow.down.right"
                    color="#ffffff"
                    size={14}
                  />
                </View>
              </>
            ) : (
              <View style={styles.defaultPhotoBanner}>
                <View style={styles.bannerWatermark}>
                  <Text style={styles.bannerWatermarkText}>HACKMTY 2026</Text>
                </View>
                <View style={{ marginBottom: 6 }}>
                  <AppIcon
                    name="megaphone.fill"
                    color="#ffffff"
                    size={36}
                  />
                </View>
                <Text style={styles.bannerTitleText} numberOfLines={2}>
                  {getLocalizedText(announcement.title, locale)}
                </Text>
              </View>
            )}

            {/* Camera Date Stamp Badge */}
            <View style={styles.dateStampBadge}>
              <Text style={styles.dateStampText}>
                {formatRelativeTime(announcement.created_at, t)}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Polaroid Bottom Caption / Note Area */}
        <View style={styles.captionArea}>
          {/* Role Target Pills */}
          <View style={styles.roleContainer}>
            {targetRoles.map(role => (
              <View
                key={role}
                style={[
                  styles.roleBadge,
                  role === 'all'
                    ? styles.roleBadgeAll
                    : role === 'hacker'
                    ? styles.roleBadgeHacker
                    : styles.roleBadgeOther,
                ]}
              >
                <Text style={styles.roleBadgeText}>@{getApplicantRoleLabel(role, locale).toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.announcementTitle}>{getLocalizedText(announcement.title, locale)}</Text>

          {/* Message Content */}
          <Text style={styles.announcementMessage}>{getLocalizedText(announcement.message, locale)}</Text>

          {/* Card Footer: Author signature & action buttons */}
          <View style={styles.cardFooter}>
            <View style={styles.authorInfo}>
              <View style={styles.authorAvatar}>
                {announcement.author_avatar_url ? (
                  <Image
                    source={{ uri: announcement.author_avatar_url }}
                    style={styles.authorAvatarImage}
                  />
                ) : (
                  <PersonSilhouette size={34} color="#7a47a2" />
                )}
              </View>
              <View>
                <Text style={styles.authorName}>{announcement.author_name}</Text>
                <Text style={styles.authorSubtext}>{getApplicantRoleLabel('organizer', locale)}</Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              {canEdit && (
                <Pressable
                  onPress={() => navigateTo({ pathname: '/announcements/create', query: { editId: announcement.id } })}
                  accessibilityRole="button"
                  accessibilityLabel="Edit announcement"
                  style={({ hovered }: any) => [
                    styles.editButton,
                    isSmallScreen && styles.editButtonCompact,
                    hovered && styles.editButtonHovered,
                  ]}
                >
                  <AppIcon name="pencil" color="#5a0061" size={14} />
                  {!isSmallScreen && <Text style={styles.editButtonText}>{t('admin.edit')}</Text>}
                </Pressable>
              )}

              {/* Like Heart Button */}
              <Pressable
                onPress={handleLikePress}
                accessibilityRole="button"
                accessibilityLabel={liked ? "Unlike announcement" : "Like announcement"}
                style={({ hovered }: any) => [
                  styles.likeButton,
                  liked && styles.likeButtonActive,
                  hovered && styles.likeButtonHovered,
                ]}
              >
                <AppIcon
                  name={liked ? 'heart.fill' : 'heart'}
                  color={liked ? '#7a47a2' : '#8c7b8e'}
                  size={16}
                />
                <Text style={[styles.likeCountText, liked && styles.likeCountTextActive]}>
                  {likesCount}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Full-Screen Lightbox Overlay Modal with Native Spring Geometry Transition */}
      {fullscreenVisible && announcement.media_url && (
        <Modal
          visible={fullscreenVisible}
          transparent={true}
          animationType="none"
          onRequestClose={closeFullscreen}
        >
          <Animated.View style={[styles.modalBackdrop, { opacity: opacityAnim }]}>
            {/* Backdrop click layer - closes modal when tapping dark area around media */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeFullscreen}
            />

            {/* Media Content Box - allows full interaction with video controls without dismissing */}
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={closeFullscreen}
                accessibilityRole="button"
                accessibilityLabel="Close media preview"
                style={styles.modalCloseButton}
              >
                <AppIcon
                  name="xmark"
                  color="#ffffff"
                  size={20}
                />
              </Pressable>

              {modalMediaMounted && (
                <View style={styles.modalMediaWrapper}>
                  <AnnouncementMedia
                    url={announcement.media_url}
                    mediaType={announcement.media_type}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                    controls={true}
                    autoPlay={true}
                    muted={false}
                    loop={true}
                    paused={!fullscreenVisible || !modalMediaMounted}
                    screenFocused={screenFocused}
                  />
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </>
  )
})

const styles = StyleSheet.create({
  polaroidContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 660 : 520,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingTop: 16,
    paddingHorizontal: Platform.OS === 'web' ? 18 : 16,
    paddingBottom: 22,
    marginVertical: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      native: {
        shadowColor: '#1d041f',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 4,
      },
      web: {
        boxShadow:
          '0 12px 28px -8px rgba(29, 4, 31, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.8)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
        cursor: 'default',
        ':hover': {
          transform: 'rotate(0deg) scale(1.015)',
          boxShadow: '0 20px 40px -10px rgba(29, 4, 31, 0.25), 0 6px 16px rgba(0, 0, 0, 0.1)',
        },
      } as any,
    }),
  },
  topTape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 80,
    height: 22,
    backgroundColor: 'rgba(240, 230, 210, 0.75)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(210, 195, 170, 0.5)',
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
        backdropFilter: 'blur(4px)',
        transform: 'rotate(-2deg)',
      } as any,
    }),
  },
  photoFramePressable: {
    width: '100%',
    ...Platform.select({
      web: { cursor: 'zoom-in' } as any,
    }),
  },
  photoFrameHovered: {
    opacity: 0.94,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1.33,
    backgroundColor: '#1d041f',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  expandBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandBadgeIcon: {
    color: '#ffffff',
    fontSize: 13,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  defaultPhotoBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3b1c3f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #48134a 0%, #1d041f 100%)',
      } as any,
    }),
  },
  bannerWatermark: {
    position: 'absolute',
    top: 12,
    right: 14,
    opacity: 0.2,
  },
  bannerWatermarkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'Montserrat',
  },
  bannerIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  bannerTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  dateStampBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dateStampText: {
    color: '#ffb703',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  captionArea: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeAll: {
    backgroundColor: '#5a0061',
  },
  roleBadgeHacker: {
    backgroundColor: '#005b61',
  },
  roleBadgeOther: {
    backgroundColor: '#614800',
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    letterSpacing: 0.5,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d041f',
    fontFamily: 'Montserrat',
    marginBottom: 4,
    lineHeight: 24,
  },
  announcementMessage: {
    fontSize: 13.5,
    color: '#4a3b4c',
    fontFamily: 'Montserrat',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 0, 97, 0.08)',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0e6f2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
  },
  authorAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  authorAvatarText: {
    color: '#5a0061',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: 'Montserrat',
  },
  authorName: {
    color: '#1d041f',
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  authorSubtext: {
    color: '#8c7b8e',
    fontSize: 10.5,
    fontFamily: 'Montserrat',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginLeft: 'auto',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f7e9fb',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.2)',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  editButtonCompact: {
    paddingHorizontal: 8,
    minWidth: 34,
    minHeight: 30,
  },
  editButtonHovered: {
    backgroundColor: '#f0dff9',
  },
  editButtonText: {
    color: '#5a0061',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fdf8fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  likeButtonActive: {
    backgroundColor: '#f3e8f8',
    borderColor: '#7a47a2',
  },
  likeButtonHovered: {
    backgroundColor: '#f0e6f2',
  },
  heartIcon: {
    fontSize: 13,
  },
  likeCountText: {
    color: '#5a0061',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  likeCountTextActive: {
    color: '#7a47a2',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
    }),
  },
  modalBackdropPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    maxWidth: 1100,
    maxHeight: '90%',
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMediaWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
})
