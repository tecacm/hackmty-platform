import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useAnnouncements } from 'app/hooks/use-announcements'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { formFieldColors } from 'app/components/form-field-styles'
import { AnnouncementCard } from './announcement-card'

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

export function AnnouncementsScreen() {
  const { announcements, userLikes, loading, refreshing, refresh, toggleLike } = useAnnouncements()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const { navigateTo } = useSmartNavigate()
  const isFocused = useIsFocused()

  const canCreate = !permissionsLoading && hasPermission('announcements', 'create')
  const canView = !permissionsLoading && hasPermission('announcements', 'view')

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreatePress = () => {
    navigateTo('/announcements/create')
  }

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
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedTitle}>Access Restricted</Text>
          <Text style={styles.unauthorizedText}>
            You do not have permission to view the announcements feed.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screenWrapper}>
      <View style={styles.contentContainer}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>Announcements</Text>
            <Text style={styles.subheading}>
              Live timeline & official updates from HackMTY staff
            </Text>
          </View>

          {canCreate && (
            <Pressable
              onPress={handleCreatePress}
              style={({ hovered }: any) => [
                styles.createButtonHeader,
                hovered && styles.createButtonHeaderHovered,
              ]}
            >
              <Text style={styles.createButtonIcon}>+</Text>
              <Text style={styles.createButtonText}>Post</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sectionDivider} />

        {/* Timeline Feed */}
        {announcements.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>📸</Text>
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

      {/* Floating Action Button (FAB) for Mobile / Admin */}
      {canCreate && (
        <Pressable
          onPress={handleCreatePress}
          style={({ hovered }: any) => [
            styles.fabButton,
            hovered && styles.fabButtonHovered,
          ]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screenWrapper: {
    width: '100%',
    flex: 1,
    position: 'relative',
    alignItems: 'center',
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
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 820 : 580,
    gap: 12,
    marginVertical: 12,
    backgroundColor: '#f4f4f4',
    ...Platform.select({
      web: {
        paddingVertical: 32,
        paddingHorizontal: 32,
      },
      default: {
        paddingHorizontal: 14,
        paddingVertical: 18,
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
  },
  heading: {
    color: formFieldColors.theme,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Montserrat',
  },
  subheading: {
    color: '#5b4d61',
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.12)',
    marginVertical: 10,
  },
  createButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5a0061',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any,
    }),
  },
  createButtonHeaderHovered: {
    backgroundColor: '#7a0083',
    transform: [{ scale: 1.03 }],
  },
  createButtonIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat',
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
  fabButton: {
    position: 'absolute',
    bottom: 28,
    right: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5a0061',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c2b75f',
    ...Platform.select({
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 24px rgba(90, 0, 97, 0.4)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      } as any,
    }),
  },
  fabButtonHovered: {
    backgroundColor: '#7a0083',
    transform: [{ scale: 1.08 }],
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '400',
    marginTop: -3,
  },
})
