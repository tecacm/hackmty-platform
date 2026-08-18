import React from 'react'
import { View, Text, StyleSheet, Linking, Platform } from 'react-native'
import { PillButton } from '../pill-button'

import { useTranslation } from 'app/i18n'

type DocumentPreviewProps = {
  title: string
  url?: string | null
  loading?: boolean
  emptyMessage?: string
  height?: number
}

function isImageUrl(url: string) {
  const cleanUrl = url.split('?')[0].toLowerCase()
  return (
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.gif') ||
    cleanUrl.includes('guardian-ids') ||
    cleanUrl.includes('guardian_id')
  )
}

export function DocumentPreview({
  title,
  url,
  loading = false,
  emptyMessage,
  height = 420,
}: DocumentPreviewProps) {
  const { t } = useTranslation()
  const resolvedEmptyMessage = emptyMessage || t('common.noDocument')

  if (loading) {
    return (
      <View style={[styles.card, { height: 'auto', minHeight: 180 }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>{t('common.loadingDocument')}</Text>
        </View>
      </View>
    )
  }

  if (!url) {
    return (
      <View style={[styles.card, { height: 'auto', minHeight: 140 }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>{resolvedEmptyMessage}</Text>
        </View>
      </View>
    )
  }

  const isImg = isImageUrl(url)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <PillButton
          title={t('common.openDocument')}
          onPress={() => Linking.openURL(url)}
          fontSize={12}
          additionalStyle={styles.openBtn}
        />
      </View>

      <View style={[styles.frameContainer, { minHeight: isImg ? 260 : height }]}>
        {isImg ? (
          <img
            src={url}
            alt={title}
            style={{
              width: '100%',
              maxHeight: height,
              objectFit: 'contain',
              borderRadius: 8,
              backgroundColor: '#111111',
            }}
          />
        ) : (
          <iframe
            src={url}
            title={title}
            style={{
              width: '100%',
              height: '100%',
              minHeight: height,
              border: 'none',
              borderRadius: 8,
              backgroundColor: '#f9f9f9',
            }}
          />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 18,
    marginBottom: 16,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(34, 0, 44, 0.05)',
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  openBtn: {
    height: 36,
    paddingHorizontal: 16,
    width: 'auto',
    flexShrink: 0,
  },
  frameContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 0, 44, 0.08)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  placeholderContainer: {
    padding: 20,
    backgroundColor: '#fbf9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  placeholderText: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
})
