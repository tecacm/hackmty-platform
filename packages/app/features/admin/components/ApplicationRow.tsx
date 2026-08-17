'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { AppIcon } from '../../../components/app-icon'
import { StatusBadge } from './StatusBadge'
import { useSmartNavigate } from '../../../navigation/use-smart-navigate'

export interface ApplicationRowProps {
  app: {
    id: string
    status: string
    admin_feedback?: string | null
    application_type_id: string
    answers?: Record<string, any>
    user_id?: string
    profiles?: {
      id?: string
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      team_id?: string | null
      teams?: { id: string; name: string } | null
    } | null
  }
  onOpenMessageModal?: (targetType: 'team' | 'user', targetId: string, targetName: string, memberUserIds?: string[]) => void
}

export function ApplicationRow({ app, onOpenMessageModal }: ApplicationRowProps) {
  const { navigateTo } = useSmartNavigate()

  const firstName = app.profiles?.first_name || app.answers?.firstName || 'Unknown'
  const lastName = app.profiles?.last_name || app.answers?.lastName || 'Applicant'
  const fullName = `${firstName} ${lastName}`
  const email = app.answers?.email || 'No email'
  const country = app.answers?.country || 'N/A'
  const university = app.answers?.university || 'N/A'
  const roleType = app.application_type_id || 'hacker'

  const isNonInteractive = app.status === 'draft' || app.status === 'not_started' || app.id.startsWith('no-app-')

  return (
    <View style={styles.appCard}>
      <Pressable
        disabled={isNonInteractive}
        onPress={() => {
          if (!isNonInteractive && app.user_id) {
            navigateTo(`/users/${app.user_id}?appId=${app.id}`)
          }
        }}
        style={[styles.appHeaderRow, isNonInteractive && styles.nonInteractive]}
      >
        <View style={styles.headerMainInfo}>
          <Text style={styles.applicantName}>{fullName}</Text>
          <Text style={styles.applicantEmail}>{email}</Text>
        </View>

        <View style={styles.headerSubInfo}>
          <View style={styles.tagRow}>
            <View style={[styles.typeBadge, { borderColor: roleType === 'hacker' ? '#c2b75f' : '#b284be' }]}>
              <Text style={[styles.typeBadgeText, { color: roleType === 'hacker' ? '#c2b75f' : '#b284be' }]}>
                {roleType.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.countryTag}>{country}</Text>
          </View>
          <Text style={styles.universityText} numberOfLines={1}>
            {university}
          </Text>
        </View>

        <View style={styles.headerStatusInfo}>
          <StatusBadge status={app.status} />
          {app.user_id && onOpenMessageModal ? (
            <Pressable
              onPress={(e: any) => {
                if (typeof e?.stopPropagation === 'function') e.stopPropagation()
                onOpenMessageModal('user', app.user_id!, fullName)
              }}
              style={styles.messageBtn}
            >
              <AppIcon name="envelope.fill" size={12} color="#5a0061" />
              <Text style={styles.messageBtnText}>Msg</Text>
            </Pressable>
          ) : null}
          {!isNonInteractive ? (
            <AppIcon name="chevron.right" size={14} color="#5a0061" />
          ) : (
            <AppIcon name="minus.circle" size={14} color="#94a3b8" />
          )}
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  appCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  nonInteractive: {
    opacity: 0.85,
  },
  headerMainInfo: {
    flex: 2,
    minWidth: 200,
    gap: 2,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  applicantEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  headerSubInfo: {
    flex: 2,
    minWidth: 200,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countryTag: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  universityText: {
    fontSize: 12,
    color: '#64748b',
  },
  headerStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messageBtn: {
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    borderColor: 'rgba(90, 0, 97, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageBtnText: {
    color: '#5a0061',
    fontSize: 11,
    fontWeight: '700',
  },
})
