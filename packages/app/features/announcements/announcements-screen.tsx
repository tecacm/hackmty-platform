import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useAnnouncements } from 'app/hooks/use-announcements'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { formFieldColors } from 'app/components/form-field-styles'
import { AnnouncementCard } from './announcement-card'
import { PillButton } from 'app/components/pill-button'
import { Pressable } from 'react-native'
import { useAnnouncementsNavHeader } from './use-announcements-nav-header'

// useIsFocused detects when this tab screen is no longer active.
// On web, @react-navigation/native may not provide useIsFocused,
// so we provide a safe fallback that always returns true.
let useIsFocused: () => boolean = () => true
try {
  if (Platform.OS !== 'web') {
    const navNative = require('@react-navigation/native')
    if (navNative.useIsFocused) {
      useIsFocused = navNative.useIsFocused
    }
  }
} catch (_) {}

import { AppIcon } from 'app/components/app-icon'

export function AnnouncementsScreen({ navigation }: { navigation?: any }) {
  const { announcements, userLikes, loading, refreshing, refresh, toggleLike } = useAnnouncements()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { navigateTo } = useSmartNavigate()
  const isFocused = useIsFocused()

  const canCreate = !permissionsLoading && hasPermission('announcements', 'create')
  const canView = !permissionsLoading && hasPermission('announcements', 'view')

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreatePress = React.useCallback(() => {
    navigateTo('/announcements/create')
  }, [navigateTo])

  useAnnouncementsNavHeader(navigation, canCreate, handleCreatePress)

  if (permissionsLoading || (loading && announcements.length === 0)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#c2b75f" />
        <Text style={styles.loadingText}>Loading Announcements Feed...</Text>
      </View>
    )
  }

  if (!canView) {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.heading}>Announcements</Text>
        <View style={styles.unauthorizedCard}>
          <AppIcon name="lock.fill" color="#1d041f" size={36} />
          <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
          <Text style={styles.unauthorizedText}>
            You do not have permission to view the announcements feed.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { width: '90%', maxWidth: 1000 }]}>      
      {/* Sticky Top Header Toolbar - Web only. Native platforms use the native navigation header and pencil toolbar item */}
      {Platform.OS === 'web' && (
        <View style={styles.stickyHeaderContainer}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.heading}>Announcements</Text>
              <Text style={styles.subheading}>
                Live timeline & official updates from HackMTY staff
              </Text>
            </View>

            {canCreate && (
              <View style={styles.createButtonContainer}>
                <PillButton
                  title="+ Post"
                  onPress={handleCreatePress}
                  variant="primary"
                  additionalStyle={styles.createPillButton}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Timeline Feed Tinted Container */}
      <View style={styles.contentContainer}>
        {announcements.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <AppIcon name="camera.fill" color="#5a0061" size={44} />
            <Text style={styles.emptyStateTitle}>No announcements yet</Text>
            <Text style={styles.emptyStateText}>
              Check back soon! Official updates, schedule changes, and alerts will appear here.
            </Text>
            {canCreate && (
              <Pressable onPress={handleCreatePress} style={styles.createFirstButton}>
                <Text style={styles.createFirstButtonText}>+ Create First Announcement</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.feedList}>
            {announcements.map((item, index) => (
              <AnnouncementCard
                key={item.id}
                announcement={item}
                index={index}
                isLiked={userLikes.has(item.id)}
                onLike={toggleLike}
                screenFocused={isFocused}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  stickyHeaderContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 820 : 580,
    backgroundColor: 'rgba(244, 244, 244, 0.95)',
    borderRadius: 22,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 10,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 100,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 60,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 6px 24px rgba(34, 0, 44, 0.1)',
      } as any,
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 820 : 580,
    gap: 12,
    marginBottom: 12,
    backgroundColor: '#f4f4f4',
    ...Platform.select({
      web: {
        paddingVertical: 24,
        paddingHorizontal: 32,
      },
      default: {
        paddingHorizontal: 18,
        paddingVertical: 20,
      },
    }),
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Platform.select({
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      },
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingLeft: 10,
  },
  headerTitleCol: {
    flex: 1,
    flexShrink: 1,
  },
  heading: {
    color: formFieldColors.theme,
    fontSize: Platform.OS === 'web' ? 24 : 21,
    fontWeight: '800',
    fontFamily: 'Montserrat',
  },
  subheading: {
    color: '#5b4d61',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
    fontFamily: 'Montserrat',
    flexWrap: 'wrap',
    lineHeight: 17,
  },
  createButtonContainer: {
    minWidth: 120,
    height: 46,
    flexShrink: 0,
  },
  createPillButton: {
    height: 46,
    borderRadius: 23,
    paddingRight: 10,
    width: 'auto',
  },
  feedList: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 660 : 520,
    alignSelf: 'center',
    gap: 12,
  },
  emptyStateContainer: {
    width: '100%',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  emptyStateTitle: {
    color: '#1d041f',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  emptyStateText: {
    color: '#6b5c73',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
    fontFamily: 'Montserrat',
  },
  createFirstButton: {
    marginTop: 12,
    backgroundColor: '#5a0061',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  unauthorizedCard: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 20,
  },
  unauthorizedIcon: {
    fontSize: 36,
  },
  unauthorizedTitle: {
    color: '#1d041f',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  unauthorizedText: {
    color: '#6b5c73',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
})
