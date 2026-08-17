'use client'

import * as React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let bgColor = 'rgba(255, 255, 255, 0.08)'
  let textColor = '#e1e1e1'
  let label = (status || '').toUpperCase()

  if (status === 'confirmed') {
    bgColor = 'rgba(124, 58, 237, 0.15)'
    textColor = '#7c3aed'
    label = 'CONFIRMED'
  } else if (status === 'accepted') {
    bgColor = 'rgba(16, 185, 129, 0.15)'
    textColor = '#10b981'
    label = 'ACCEPTED'
  } else if (status === 'rejected') {
    bgColor = 'rgba(239, 68, 68, 0.15)'
    textColor = '#ef4444'
    label = 'REJECTED'
  } else if (status === 'changes_requested') {
    bgColor = 'rgba(245, 158, 11, 0.15)'
    textColor = '#f59e0b'
    label = 'CHANGES REQ'
  } else if (status === 'submitted') {
    bgColor = 'rgba(59, 130, 246, 0.15)'
    textColor = '#3b82f6'
    label = 'SUBMITTED'
  } else if (status === 'draft') {
    bgColor = 'rgba(156, 163, 175, 0.15)'
    textColor = '#9ca3af'
    label = 'DRAFT'
  } else if (status === 'not_started') {
    bgColor = 'rgba(203, 213, 225, 0.25)'
    textColor = '#64748b'
    label = 'NOT STARTED'
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
})
