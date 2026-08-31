'use client'

import * as React from 'react'
import { Platform, Alert, View, Text, Pressable, StyleSheet, Modal } from 'react-native'

export type CrossAlertButton = {
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress?: () => void
}

type AlertRequest = {
  title: string
  message?: string
  buttons: CrossAlertButton[]
}

// The web host registers itself here so showAlert() can render a modal. On native this
// stays null and we use the OS Alert.
let enqueueWeb: ((req: AlertRequest) => void) | null = null

/**
 * Cross-platform alert. On native it uses the OS `Alert.alert` (which looks native and
 * supports buttons). On web — where `Alert.alert` is a no-op — it renders a modal via
 * <AlertHost/> (mounted once at the app root). Same call signature as Alert.alert.
 */
export function showAlert(title: string, message?: string, buttons?: CrossAlertButton[]) {
  const btns: CrossAlertButton[] = buttons && buttons.length ? buttons : [{ text: 'OK' }]

  if (Platform.OS !== 'web') {
    Alert.alert(title, message, btns as any)
    return
  }

  if (enqueueWeb) {
    enqueueWeb({ title, message, buttons: btns })
    return
  }

  // Fallback if the host isn't mounted yet.
  if (typeof window !== 'undefined') {
    const text = [title, message].filter(Boolean).join('\n\n')
    const hasChoice = btns.length > 1
    const confirmed = hasChoice ? window.confirm(text) : (window.alert(text), true)
    if (confirmed) btns.find((b) => b.style !== 'cancel')?.onPress?.()
    else btns.find((b) => b.style === 'cancel')?.onPress?.()
  }
}

/**
 * Renders web alert modals. Mount once near the app root. Returns null on native.
 */
export function AlertHost() {
  const [queue, setQueue] = React.useState<AlertRequest[]>([])

  React.useEffect(() => {
    if (Platform.OS !== 'web') return
    enqueueWeb = (req) => setQueue((q) => [...q, req])
    return () => {
      enqueueWeb = null
    }
  }, [])

  if (Platform.OS !== 'web' || queue.length === 0) return null

  const current = queue[0]!
  const dismiss = () => setQueue((q) => q.slice(1))

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={styles.buttons}>
            {current.buttons.map((b, i) => (
              <Pressable
                key={`${b.text}-${i}`}
                onPress={() => {
                  dismiss()
                  b.onPress?.()
                }}
                style={({ hovered }: any) => [
                  styles.button,
                  hovered && styles.buttonHover,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    b.style === 'destructive' && styles.buttonTextDestructive,
                    b.style === 'cancel' && styles.buttonTextCancel,
                  ]}
                >
                  {b.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 3, 16, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backdropFilter: 'blur(2px)',
      } as any,
    }),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 8,
    ...Platform.select({
      web: { boxShadow: '0 20px 50px rgba(0,0,0,0.3)' } as any,
    }),
  },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  message: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 8 },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  buttonHover: { backgroundColor: '#f1f5f9' },
  buttonText: { fontSize: 14, fontWeight: '800', color: '#5a0061' },
  buttonTextDestructive: { color: '#dc2626' },
  buttonTextCancel: { color: '#64748b' },
})
