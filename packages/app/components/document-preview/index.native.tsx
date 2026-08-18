import React from 'react'
import { View, Text, StyleSheet, Image, Linking, ActivityIndicator } from 'react-native'
import { PillButton } from '../pill-button'
import { useTranslation } from 'app/i18n'

let WebViewComponent: any = null
try {
  // Try importing react-native-webview dynamically for native PDF embedding
  WebViewComponent = require('react-native-webview').WebView
} catch (e) {
  // Gracefully fallback if react-native-webview is not linked in Expo Go
}

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
  height = 320,
}: DocumentPreviewProps) {
  const { t } = useTranslation()
  const resolvedEmptyMessage = emptyMessage || t('common.noDocument')

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholderContainer}>
          <ActivityIndicator size="small" color="#c2b75f" />
          <Text style={[styles.placeholderText, { marginTop: 8 }]}>{t('common.loadingDocument')}</Text>
        </View>
      </View>
    )
  }

  if (!url) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>{resolvedEmptyMessage}</Text>
        </View>
      </View>
    )
  }

  const isImg = isImageUrl(url)

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <PillButton
          title={t('common.openDocument')}
          onPress={() => Linking.openURL(url)}
          additionalStyle={styles.headerBtn}
        />
      </View>

      {isImg ? (
        <View style={styles.imageFrame}>
          <Image
            source={{ uri: url }}
            style={{ width: '100%', height: Math.min(height, 280), borderRadius: 8 }}
            resizeMode="contain"
          />
        </View>
      ) : WebViewComponent ? (
        <View style={[styles.pdfFrame, { height: height }]}>
          <WebViewComponent
            source={{
              uri: url,
            }}
            style={{ flex: 1, borderRadius: 8 }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#c2b75f" />
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.pdfFallbackContainer}>
          <View style={styles.pdfIconBanner}>
            <Text style={styles.pdfIconText}>PDF Document</Text>
            <Text style={styles.pdfSubtext}>Tap below to view or download PDF on device</Text>
          </View>

          <PillButton
            title="Open PDF Document ↗"
            onPress={() => Linking.openURL(url)}
            fontSize={13}
            additionalStyle={styles.fullWidthBtn}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 16,
    marginBottom: 14,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%',
  },
  title: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  headerBtn: {
    height: 36,
    paddingHorizontal: 14,
    width: 'auto',
    flexShrink: 0,
  },
  imageFrame: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
  },
  pdfFrame: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.08)',
    backgroundColor: '#f9f9f9',
  },
  pdfFallbackContainer: {
    width: '100%',
    gap: 10,
  },
  pdfIconBanner: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.08)',
    alignItems: 'center',
  },
  pdfIconText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22002c',
    marginBottom: 2,
  },
  pdfSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  fullWidthBtn: {
    height: 42,
    width: '100%',
    paddingHorizontal: 16,
  },
  placeholderContainer: {
    padding: 16,
    backgroundColor: '#fbf9fc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
